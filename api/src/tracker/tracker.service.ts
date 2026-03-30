import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { In, Repository } from 'typeorm';
import { Char } from '../chars/char.entity';
import { CharTemplate } from './entities/char-template.entity';
import { DropRecord } from './entities/drop-record.entity';
import { PeriodSnapshot } from './entities/period-snapshot.entity';
import { TaskLootLine } from './entities/task-loot.types';
import {
  LootSnapshotData,
  LootSnapshotItem,
} from './entities/loot-snapshot.types';
import { TaskInstance } from './entities/task-instance.entity';
import { TaskTemplate } from './entities/task-template.entity';
import { TemplateItem } from './entities/template-item.entity';
import { UpdateTaskStatusDto } from './dto/tracker.dto';

dayjs.extend(isoWeek);

export const NIGHTMARE_TERROR_PRESET_KEY = 'nightmare_terror';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CycleInsight {
  type: 'best_week' | 'top_template' | 'vs_previous';
  /** Semana ISO (best_week) */
  weekLabel?: string;
  /** Nome do template (top_template) */
  templateName?: string;
  /** 'up' | 'down' (vs_previous) */
  direction?: 'up' | 'down';
  /** Valor numérico: NPC total (best_week/top_template) ou percentual absoluto (vs_previous) */
  value: number;
}

@Injectable()
export class TrackerService {
  constructor(
    @InjectRepository(TaskTemplate)
    private readonly templateRepository: Repository<TaskTemplate>,
    @InjectRepository(TemplateItem)
    private readonly templateItemRepository: Repository<TemplateItem>,
    @InjectRepository(CharTemplate)
    private readonly charTemplateRepository: Repository<CharTemplate>,
    @InjectRepository(TaskInstance)
    private readonly taskInstanceRepository: Repository<TaskInstance>,
    @InjectRepository(Char)
    private readonly charRepository: Repository<Char>,
    @InjectRepository(PeriodSnapshot)
    private readonly periodSnapshotRepository: Repository<PeriodSnapshot>,
    @InjectRepository(DropRecord)
    private readonly dropRecordRepository: Repository<DropRecord>,
  ) {}

  // ---------------------------------------------------------------------------
  // Templates
  // ---------------------------------------------------------------------------

  async getTemplates(userId: string) {
    const rows = await this.templateRepository.find({
      where: [{ scope: 'global' }, { userId, scope: 'user' }],
      order: { createdAt: 'ASC' },
    });
    const globalPresetKeys = new Set(
      rows.filter((t) => t.scope === 'global' && t.presetKey).map((t) => t.presetKey),
    );
    return rows.filter(
      (t) =>
        !(t.scope === 'user' && t.presetKey && globalPresetKeys.has(t.presetKey)),
    );
  }

  createTemplate(
    userId: string,
    data: { name: string; frequency: 'weekly' | 'monthly' },
  ) {
    return this.templateRepository.save(
      this.templateRepository.create({
        userId,
        name: data.name.trim(),
        frequency: data.frequency,
        kind: 'standard',
        presetKey: null,
        scope: 'user',
      }),
    );
  }

  async updateTemplate(
    userId: string,
    id: string,
    data: Partial<{ name: string; frequency: 'weekly' | 'monthly' }>,
  ) {
    const template = await this.templateRepository.findOne({
      where: { id, userId },
    });
    if (!template) throw new NotFoundException('Template não encontrado');
    if (template.scope === 'global')
      throw new BadRequestException('Templates globais são somente leitura');

    if (data.name) template.name = data.name.trim();
    if (data.frequency) template.frequency = data.frequency;
    return this.templateRepository.save(template);
  }

  async deleteTemplate(userId: string, id: string) {
    const template = await this.templateRepository.findOne({
      where: { id, userId },
    });
    if (!template) throw new NotFoundException('Template não encontrado');
    if (template.scope === 'global')
      throw new BadRequestException('Templates globais são somente leitura');
    if (template.presetKey)
      throw new BadRequestException(
        'Templates pré-definidos não podem ser excluídos.',
      );
    await this.templateRepository.remove(template);
    return { success: true };
  }

  async getCharTemplates(userId: string, charId: string) {
    await this.ensureOwnedChar(userId, charId);
    return this.charTemplateRepository.find({ where: { charId } });
  }

  async setCharTemplates(userId: string, charId: string, templateIds: string[]) {
    await this.ensureOwnedChar(userId, charId);

    const templates = templateIds.length
      ? await this.templateRepository.find({
          where: [
            { id: In(templateIds), userId, scope: 'user' },
            { id: In(templateIds), scope: 'global' },
          ],
        })
      : [];

    await this.charTemplateRepository.delete({ charId });
    if (templates.length > 0) {
      const entities = templates.map((template) =>
        this.charTemplateRepository.create({ charId, templateId: template.id }),
      );
      await this.charTemplateRepository.save(entities);
    }
    return this.charTemplateRepository.find({ where: { charId } });
  }

  async getTemplateItems(userId: string, templateId: string) {
    const template = await this.templateRepository.findOne({
      where: { id: templateId },
    });
    if (!template) throw new NotFoundException('Template não encontrado');
    if (template.scope !== 'global' && template.userId !== userId)
      throw new NotFoundException('Template não encontrado');
    return this.templateItemRepository.find({
      where: { templateId: template.id },
      order: { itemName: 'ASC' },
    });
  }

  // ---------------------------------------------------------------------------
  // Task Instances
  // ---------------------------------------------------------------------------

  async getTaskInstances(
    userId: string,
    params: { charId: string; frequency?: 'weekly' | 'monthly' },
  ) {
    const { charId, frequency } = params;
    await this.ensureOwnedChar(userId, charId);
    await this.ensureCurrentInstances(charId, userId);

    const links = await this.charTemplateRepository.find({
      where: { charId },
      relations: ['template'],
    });
    const activeTemplateIds = links.map((item) => item.templateId);
    if (activeTemplateIds.length === 0) return [];

    const now = dayjs();
    const weekYear = now.isoWeekYear();
    const week = now.isoWeek();
    const monthYear = now.year();
    const month = now.month() + 1;

    const instances = await this.taskInstanceRepository.find({
      where: { charId, templateId: In(activeTemplateIds) },
      relations: ['template', 'char'],
    });

    return instances
      .filter((item) => !frequency || item.template.frequency === frequency)
      .filter((item) => {
        if (item.template.frequency === 'weekly')
          return item.year === weekYear && item.period === week;
        return item.year === monthYear && item.period === month;
      })
      .map((item) => ({
        id: item.id,
        charId: item.charId,
        templateId: item.templateId,
        year: item.year,
        period: item.period,
        done: item.done,
        completedAt: item.completedAt,
        notes: item.notes,
        loot: item.loot,
        charName: item.char.name,
        templateName: item.template.name,
        frequency: item.template.frequency,
        templateKind: item.template.kind,
        presetKey: item.template.presetKey,
      }));
  }

  // ---------------------------------------------------------------------------
  // Update Task Status (with DropRecord persistence)
  // ---------------------------------------------------------------------------

  async updateTaskStatus(userId: string, id: string, body: UpdateTaskStatusDto) {
    const task = await this.taskInstanceRepository.findOne({
      where: { id },
      relations: ['char', 'template'],
    });
    if (!task || task.char.userId !== userId)
      throw new NotFoundException('Tarefa não encontrada');

    const { done, loot } = body;

    // ── Undo: remove drops registrados e reseta a instância ──
    if (!done) {
      await this.dropRecordRepository.delete({ sourceTaskInstanceId: id });
      task.done = false;
      task.completedAt = null;
      task.loot = null;
      return this.taskInstanceRepository.save(task);
    }

    // ── Concluir tarefa ──
    if (task.template.kind === 'loot') {
      if (loot === undefined)
        throw new BadRequestException(
          'Informe a lista de drops (loot) ao concluir esta tarefa.',
        );

      const normalizedLoot = this.normalizeLoot(loot);
      task.loot = normalizedLoot;

      // Remove drops anteriores desta instância (idempotente para re-submissão)
      await this.dropRecordRepository.delete({ sourceTaskInstanceId: id });

      if (normalizedLoot.length > 0) {
        // Carrega metadados dos itens para enriquecer o DropRecord
        const templateItems = await this.templateItemRepository.find({
          where: { templateId: task.templateId },
        });
        const metaBySlug = new Map(templateItems.map((i) => [i.itemSlug, i]));

        const now = dayjs();
        const dropRecords = normalizedLoot.map((line) => {
          const meta = metaBySlug.get(line.slug);
          const isRare = meta ? meta.isRare : line.npcUnitPriceDollars === 0;
          const npcUnitPrice = isRare ? 0 : line.npcUnitPriceDollars;
          const npcTotal = isRare ? 0 : line.quantity * npcUnitPrice;

          return this.dropRecordRepository.create({
            charId: task.charId,
            templateId: task.templateId,
            templateName: task.template.name,
            slug: line.slug,
            itemName: meta?.itemName ?? line.slug,
            spritePath: meta?.spritePath ?? '',
            quantity: line.quantity,
            npcUnitPrice,
            npcTotal,
            isRare,
            calendarYear: now.year(),
            calendarMonth: now.month() + 1,
            calendarWeek: now.isoWeek(),
            droppedAt: now.toDate(),
            sourceTaskInstanceId: id,
          });
        });

        await this.dropRecordRepository.save(dropRecords);
      }
    } else {
      task.loot = null;
    }

    task.done = true;
    task.completedAt = new Date();
    return this.taskInstanceRepository.save(task);
  }

  // ---------------------------------------------------------------------------
  // Dashboard
  // ---------------------------------------------------------------------------

  async getDashboardSummary(userId: string, charId?: string) {
    const chars = await this.charRepository.find({ where: { userId } });

    const charProgress = await Promise.all(
      chars.map(async (char) => {
        const tasks = await this.getTaskInstances(userId, { charId: char.id });
        const completed = tasks.filter((task) => task.done).length;
        const total = tasks.length;
        return {
          charId: char.id,
          charName: char.name,
          total,
          completed,
          percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
      }),
    );

    const targetProgress = charId
      ? charProgress.find((p) => p.charId === charId)
      : null;
    const statsSource = targetProgress ? [targetProgress] : charProgress;

    const totalTasks = statsSource.reduce((sum, item) => sum + item.total, 0);
    const completedTasks = statsSource.reduce((sum, item) => sum + item.completed, 0);

    let weeklyLootNpcByPreset: Record<string, number> = {};
    if (charId) {
      const rows = await this.getCurrentWeeklyLootRows(userId, charId);
      weeklyLootNpcByPreset = this.sumLootByPreset(rows);
    }

    return {
      totalTasks,
      completedTasks,
      completionPercentage:
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      charProgress,
      weeklyLootNpcByPreset,
    };
  }

  // ---------------------------------------------------------------------------
  // History (monthly cycles only)
  // ---------------------------------------------------------------------------

  async getHistory(
    userId: string,
    params: { charId: string; limit?: number },
  ) {
    const { charId, limit = 52 } = params;
    await this.ensureOwnedChar(userId, charId);

    return this.periodSnapshotRepository.find({
      where: { charId, frequency: 'monthly' },
      order: { completedAt: 'DESC' },
      take: limit,
    });
  }

  // ---------------------------------------------------------------------------
  // Monthly Cycle Summary (fonte primária: DropRecord)
  // ---------------------------------------------------------------------------

  async getMonthlyCycleSummary(userId: string, charId: string) {
    await this.ensureOwnedChar(userId, charId);

    const now = dayjs();
    const currentYear = now.year();
    const currentMonth = now.month() + 1;

    // ── Ciclo atual: a partir de DropRecord (atribuição por data civil) ──
    const currentDropRecords = await this.dropRecordRepository.find({
      where: { charId, calendarYear: currentYear, calendarMonth: currentMonth },
      order: { droppedAt: 'ASC' },
    });

    type WeeklyBreakdownItem = {
      year: number;
      week: number;
      weekLabel: string;
      npcTotal: number;
      items: LootSnapshotItem[];
      rareItems: LootSnapshotItem[];
    };

    let currentLoot: LootSnapshotData;
    let weeklyBreakdown: WeeklyBreakdownItem[];
    let completedLootTasks: number;

    if (currentDropRecords.length > 0) {
      // Nova abordagem: DropRecord como fonte de verdade
      currentLoot = this.buildLootFromDropRecords(currentDropRecords);
      weeklyBreakdown = this.buildWeeklyBreakdownFromDropRecords(
        currentDropRecords,
        currentYear,
      );
      completedLootTasks = new Set(
        currentDropRecords.map((dr) => dr.sourceTaskInstanceId).filter(Boolean),
      ).size;
    } else {
      // Fallback de transição: usar TaskInstance.loot para dados pré-DropRecord
      const weeksInMonth = this.getIsoWeeksForMonth(currentYear, currentMonth);
      const allInstances = await this.taskInstanceRepository.find({
        where: { charId },
        relations: ['template'],
      });

      const currentMonthlyInst = allInstances.filter(
        (i) =>
          i.template.frequency === 'monthly' &&
          i.year === currentYear &&
          i.period === currentMonth &&
          i.done &&
          (i.loot?.length ?? 0) > 0,
      );
      const currentWeeklyInst = allInstances.filter(
        (i) =>
          i.template.frequency === 'weekly' &&
          i.done &&
          (i.loot?.length ?? 0) > 0 &&
          weeksInMonth.some((w) => w.year === i.year && w.week === i.period),
      );
      const currentInstances = [...currentMonthlyInst, ...currentWeeklyInst];

      const templateIds = [...new Set(currentInstances.map((i) => i.templateId))];
      const templateItems =
        templateIds.length > 0
          ? await this.templateItemRepository.find({
              where: { templateId: In(templateIds) },
            })
          : [];

      currentLoot = this.buildLootSnapshot(currentInstances, templateItems);

      // Breakdown semanal a partir de TaskInstance
      weeklyBreakdown = weeksInMonth
        .map(({ year: wy, week }) => {
          const weekInsts = currentWeeklyInst.filter(
            (i) => i.year === wy && i.period === week,
          );
          if (weekInsts.length === 0) return null;
          const loot = this.buildLootSnapshot(weekInsts, templateItems);
          if (loot.items.length === 0) return null;
          return {
            year: wy,
            week,
            weekLabel: `S${week}/${wy}`,
            npcTotal: loot.npcTotal,
            items: loot.items.filter((i) => !i.isRare),
            rareItems: loot.items.filter((i) => i.isRare),
          };
        })
        .filter((w): w is NonNullable<typeof w> => w !== null);

      completedLootTasks = currentInstances.length;
    }

    // Progresso do mês (dias decorridos / total de dias)
    const daysInMonth = now.daysInMonth();
    const daysElapsed = now.date();
    const monthProgressPct = Math.round((daysElapsed / daysInMonth) * 100);

    // ── Histórico: PeriodSnapshots mensais + DropRecord para meses sem snapshot ──
    const allSnapshots = await this.periodSnapshotRepository.find({
      where: { charId },
    });

    type MonthData = {
      npcTotal: number;
      items: LootSnapshotItem[];
      totalTasks: number;
      completedTasks: number;
      weeks: Array<{
        year: number;
        week: number;
        weekLabel: string;
        npcTotal: number;
        rareItemCount: number;
      }>;
      isUnified: boolean;
    };
    const monthMap = new Map<string, MonthData>();

    // Identifica meses com snapshot unificado (nova lógica) para evitar dupla contagem
    const unifiedMonthKeys = new Set(
      allSnapshots
        .filter((s) => s.frequency === 'monthly' && s.isUnified)
        .map((s) => `${s.year}:${s.period}`),
    );

    for (const snap of allSnapshots) {
      let snapYear: number;
      let snapMonth: number;

      if (snap.frequency === 'monthly') {
        snapYear = snap.year;
        snapMonth = snap.period;
      } else {
        // Snapshot semanal → mapeia ao mês pelo DOMINGO da semana (fim da semana)
        // Usar domingo evita que semanas no limite do mês sejam atribuídas ao mês anterior
        const sunday = this.isoWeekMonday(snap.year, snap.period).add(6, 'day');
        snapYear = sunday.year();
        snapMonth = sunday.month() + 1;

        // Se este mês já tem snapshot unificado (que inclui todos os drops),
        // pula este snapshot semanal para evitar dupla contagem
        if (unifiedMonthKeys.has(`${snapYear}:${snapMonth}`)) continue;
      }

      // Não incluir o mês atual no histórico
      if (snapYear === currentYear && snapMonth === currentMonth) continue;

      const key = `${snapYear}:${snapMonth}`;
      const existing: MonthData = monthMap.get(key) ?? {
        npcTotal: 0,
        items: [],
        totalTasks: 0,
        completedTasks: 0,
        weeks: [],
        isUnified: snap.frequency === 'monthly' && snap.isUnified,
      };

      if (snap.lootData) {
        existing.npcTotal += snap.lootData.npcTotal;
        for (const item of snap.lootData.items) {
          const existingItem = existing.items.find(
            (i) => i.slug === item.slug && i.templateName === item.templateName,
          );
          if (existingItem) {
            existingItem.quantity += item.quantity;
            existingItem.npcTotal += item.npcTotal;
          } else {
            existing.items.push({ ...item });
          }
        }
      }

      existing.totalTasks += snap.totalTasks;
      existing.completedTasks += snap.completedTasks;

      if (snap.frequency === 'weekly') {
        existing.weeks.push({
          year: snap.year,
          week: snap.period,
          weekLabel: `S${snap.period}/${snap.year}`,
          npcTotal: snap.lootData?.npcTotal ?? 0,
          rareItemCount:
            snap.lootData?.items
              .filter((i) => i.isRare)
              .reduce((s, i) => s + i.quantity, 0) ?? 0,
        });
      }

      monthMap.set(key, existing);
    }

    // Resiliência: para meses históricos sem snapshot mas com DropRecord,
    // constrói o snapshot sob demanda (lazy creation)
    const histDropRecords = await this.dropRecordRepository.find({
      where: { charId },
    });
    const histDropsByMonth = new Map<string, DropRecord[]>();
    for (const dr of histDropRecords) {
      if (dr.calendarYear === currentYear && dr.calendarMonth === currentMonth)
        continue;
      const key = `${dr.calendarYear}:${dr.calendarMonth}`;
      const list = histDropsByMonth.get(key) ?? [];
      list.push(dr);
      histDropsByMonth.set(key, list);
    }

    for (const [key, records] of histDropsByMonth.entries()) {
      if (monthMap.has(key)) continue; // já coberto por snapshot
      const lootData = this.buildLootFromDropRecords(records);
      if (lootData.items.length === 0) continue;

      const [year, month] = key.split(':').map(Number);
      monthMap.set(key, {
        npcTotal: lootData.npcTotal,
        items: lootData.items,
        totalTasks: 0,
        completedTasks: 0,
        weeks: [],
        isUnified: true,
      });

      // Persiste o snapshot para queries futuras
      const exists = await this.periodSnapshotRepository.findOne({
        where: { charId, frequency: 'monthly', year, period: month },
      });
      if (!exists) {
        await this.periodSnapshotRepository.save(
          this.periodSnapshotRepository.create({
            charId,
            frequency: 'monthly',
            year,
            period: month,
            totalTasks: 0,
            completedTasks: 0,
            completedAt: dayjs(`${year}-${String(month).padStart(2, '0')}-01`)
              .endOf('month')
              .toDate(),
            lootData,
            isUnified: true,
          }),
        );
      }
    }

    const history = [...monthMap.entries()]
      .map(([key, data]) => {
        const [year, month] = key.split(':').map(Number);
        const rareItemCount = data.items
          .filter((i) => i.isRare)
          .reduce((s, i) => s + i.quantity, 0);
        return {
          year,
          month,
          label: this.formatPeriodLabel('monthly', year, month),
          npcTotal: data.npcTotal,
          rareItemCount,
          completedTasks: data.completedTasks,
          totalTasks: data.totalTasks,
          items: data.items,
          weeks: data.weeks.sort((a, b) => b.year - a.year || b.week - a.week),
        };
      })
      .sort((a, b) => b.year - a.year || b.month - a.month);

    // ── Insights automáticos ──
    const insights = this.buildInsights(currentDropRecords, weeklyBreakdown, history);

    // ── Estatísticas globais ──
    const allNpcValues = [currentLoot.npcTotal, ...history.map((h) => h.npcTotal)];
    const allTimeNpc = allNpcValues.reduce((s, n) => s + n, 0);
    const periodsWithDrops =
      (currentLoot.npcTotal > 0 ? 1 : 0) + history.filter((h) => h.npcTotal > 0).length;

    const nonZeroNpc = allNpcValues.filter((v) => v > 0);
    const avgNpc =
      nonZeroNpc.length > 0
        ? Math.round(nonZeroNpc.reduce((s, n) => s + n, 0) / nonZeroNpc.length)
        : 0;

    const bestMonthNpc = allNpcValues.length > 0 ? Math.max(...allNpcValues) : 0;
    let bestMonthLabel = this.formatPeriodLabel('monthly', currentYear, currentMonth);
    if (bestMonthNpc !== currentLoot.npcTotal || bestMonthNpc === 0) {
      const best = history.find((h) => h.npcTotal === bestMonthNpc);
      if (best) bestMonthLabel = best.label;
    }

    const totalRareItemsCollected = [
      ...currentLoot.items.filter((i) => i.isRare),
      ...history.flatMap((h) => h.items.filter((i) => i.isRare)),
    ].reduce((s, i) => s + i.quantity, 0);

    let streak = 0;
    if (currentLoot.npcTotal > 0) streak++;
    for (const h of history) {
      if (h.npcTotal > 0) streak++;
      else break;
    }

    return {
      currentCycle: {
        year: currentYear,
        month: currentMonth,
        label: this.formatPeriodLabel('monthly', currentYear, currentMonth),
        npcTotal: currentLoot.npcTotal,
        items: currentLoot.items.filter((i) => !i.isRare),
        rareItems: currentLoot.items.filter((i) => i.isRare),
        completedLootTasks,
        weeklyBreakdown,
        monthProgressPct,
      },
      history,
      allTime: {
        npcTotal: allTimeNpc,
        rareItemsCollected: totalRareItemsCollected,
        periodsWithDrops,
        bestMonthNpc,
        bestMonthLabel,
        avgNpc,
        streak,
      },
      insights,
    };
  }

  // ---------------------------------------------------------------------------
  // Drops Summary (legacy endpoint, mantido para compatibilidade)
  // ---------------------------------------------------------------------------

  async getDropsSummary(
    userId: string,
    charId: string,
    frequency: 'weekly' | 'monthly',
  ) {
    await this.ensureOwnedChar(userId, charId);

    const now = dayjs();
    const currentYear = frequency === 'weekly' ? now.isoWeekYear() : now.year();
    const currentPeriod = frequency === 'weekly' ? now.isoWeek() : now.month() + 1;

    const allInstances = await this.taskInstanceRepository.find({
      where: { charId },
      relations: ['template'],
    });

    const lootInstances = allInstances.filter(
      (i) =>
        i.template.frequency === frequency &&
        i.done &&
        (i.loot?.length ?? 0) > 0,
    );

    const currentInstances = lootInstances.filter(
      (i) => i.year === currentYear && i.period === currentPeriod,
    );
    const histInstances = lootInstances.filter(
      (i) => !(i.year === currentYear && i.period === currentPeriod),
    );

    const allTemplateIds = [...new Set(lootInstances.map((i) => i.templateId))];
    const templateItems =
      allTemplateIds.length > 0
        ? await this.templateItemRepository.find({
            where: { templateId: In(allTemplateIds) },
          })
        : [];

    const currentLoot = this.buildLootSnapshot(currentInstances, templateItems);

    const periodMap = new Map<string, typeof histInstances>();
    for (const inst of histInstances) {
      const key = `${inst.year}:${inst.period}`;
      const list = periodMap.get(key) ?? [];
      list.push(inst);
      periodMap.set(key, list);
    }

    const snapshots = await this.periodSnapshotRepository.find({
      where: { charId, frequency },
    });
    const snapshotMap = new Map<string, PeriodSnapshot>();
    for (const s of snapshots) snapshotMap.set(`${s.year}:${s.period}`, s);

    const snapshotHistKeys = [...snapshotMap.keys()].filter(
      (k) => k !== `${currentYear}:${currentPeriod}`,
    );
    const allHistKeySet = new Set([...periodMap.keys(), ...snapshotHistKeys]);
    const historyKeys = [...allHistKeySet].sort((a, b) => {
      const [ay, ap] = a.split(':').map(Number);
      const [by, bp] = b.split(':').map(Number);
      return ay !== by ? by - ay : bp - ap;
    });

    const history = historyKeys.map((key) => {
      const [year, period] = key.split(':').map(Number);
      const instances = periodMap.get(key) ?? [];
      const snap = snapshotMap.get(key);
      const lootData =
        snap?.lootData ?? this.buildLootSnapshot(instances, templateItems);
      const rareItemCount = lootData.items
        .filter((i) => i.isRare)
        .reduce((s, i) => s + i.quantity, 0);

      return {
        year,
        period,
        label: this.formatPeriodLabel(frequency, year, period),
        npcTotal: lootData.npcTotal,
        rareItemCount,
        completedTasks: snap?.completedTasks ?? instances.length,
        totalTasks: snap?.totalTasks ?? instances.length,
        items: lootData.items,
      };
    });

    const allNpcValues = [currentLoot.npcTotal, ...history.map((h) => h.npcTotal)];
    const allTimeNpc = allNpcValues.reduce((s, n) => s + n, 0);
    const bestPeriodNpc = allNpcValues.length > 0 ? Math.max(...allNpcValues) : 0;

    let bestPeriodLabel = this.formatPeriodLabel(frequency, currentYear, currentPeriod);
    if (bestPeriodNpc !== currentLoot.npcTotal || bestPeriodNpc === 0) {
      const best = history.find((h) => h.npcTotal === bestPeriodNpc);
      if (best) bestPeriodLabel = best.label;
    }

    const totalRareItemsCollected = [
      ...currentLoot.items.filter((i) => i.isRare),
      ...history.flatMap((h) => h.items.filter((i) => i.isRare)),
    ].reduce((s, i) => s + i.quantity, 0);

    const periodsWithHistNpc = history.filter((h) => h.npcTotal > 0);
    const avgNpc =
      periodsWithHistNpc.length > 0
        ? Math.round(
            periodsWithHistNpc.reduce((s, h) => s + h.npcTotal, 0) /
              periodsWithHistNpc.length,
          )
        : 0;

    let streak = 0;
    if (currentLoot.npcTotal > 0) streak++;
    for (const h of history) {
      if (h.npcTotal > 0) streak++;
      else break;
    }

    return {
      frequency,
      current: {
        year: currentYear,
        period: currentPeriod,
        label: this.formatPeriodLabel(frequency, currentYear, currentPeriod),
        npcTotal: currentLoot.npcTotal,
        items: currentLoot.items.filter((i) => !i.isRare),
        rareItems: currentLoot.items.filter((i) => i.isRare),
        completedLootTasks: currentInstances.length,
      },
      history,
      allTime: {
        npcTotal: allTimeNpc,
        rareItemsCollected: totalRareItemsCollected,
        periodsWithDrops:
          (currentLoot.npcTotal > 0 ? 1 : 0) + history.filter((h) => h.npcTotal > 0).length,
        bestPeriodNpc,
        bestPeriodLabel,
        avgNpc,
        streak,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Scheduled Jobs
  // ---------------------------------------------------------------------------

  /** Job: snapshot semana anterior + reset semana atual (segunda 7:30) */
  async snapshotAndResetWeekly(): Promise<void> {
    const now = dayjs();
    const prevWeek = now.subtract(1, 'week');
    const prevYear = prevWeek.isoWeekYear();
    const prevWeekNum = prevWeek.isoWeek();
    const currYear = now.isoWeekYear();
    const currWeek = now.isoWeek();

    const prevInstances = await this.taskInstanceRepository.find({
      where: { year: prevYear, period: prevWeekNum },
      relations: ['template', 'char'],
    });

    const byChar = new Map<string, { total: number; completed: number }>();
    for (const inst of prevInstances) {
      if (inst.template.frequency !== 'weekly') continue;
      const key = inst.charId;
      const cur = byChar.get(key) ?? { total: 0, completed: 0 };
      cur.total += 1;
      if (inst.done) cur.completed += 1;
      byChar.set(key, cur);
    }

    for (const [charId, stats] of byChar.entries()) {
      const exists = await this.periodSnapshotRepository.findOne({
        where: { charId, frequency: 'weekly', year: prevYear, period: prevWeekNum },
      });
      if (!exists) {
        const lootData = await this.buildLootSnapshotForPeriod(
          charId,
          'weekly',
          prevYear,
          prevWeekNum,
        );
        await this.periodSnapshotRepository.save(
          this.periodSnapshotRepository.create({
            charId,
            frequency: 'weekly',
            year: prevYear,
            period: prevWeekNum,
            totalTasks: stats.total,
            completedTasks: stats.completed,
            completedAt: prevWeek.endOf('isoWeek').toDate(),
            lootData: lootData.items.length > 0 ? lootData : null,
            isUnified: false,
          }),
        );
      }
    }

    // Reset weekly TaskInstances — DropRecords são PRESERVADOS
    const weeklyTemplateIds = await this.templateRepository.find({
      where: { frequency: 'weekly' },
      select: ['id'],
    });
    const ids = weeklyTemplateIds.map((t) => t.id);
    if (ids.length > 0) {
      await this.taskInstanceRepository.update(
        { year: currYear, period: currWeek, templateId: In(ids) },
        { done: false, completedAt: null, loot: null },
      );
    }
  }

  /**
   * Job: snapshot mensal unificado do mês anterior + reset mês atual (dia 1 às 7:30).
   *
   * O snapshot mensal agora usa DropRecord como fonte primária (todos os drops
   * do mês — tanto de tarefas semanais quanto mensais). Para meses sem DropRecord
   * (dados pré-migração), usa o comportamento legado com TaskInstance.loot.
   */
  async snapshotAndResetMonthly(): Promise<void> {
    const now = dayjs();
    const prevMonth = now.subtract(1, 'month');
    const prevYear = prevMonth.year();
    const prevMonthNum = prevMonth.month() + 1;
    const currYear = now.year();
    const currMonth = now.month() + 1;

    // ── Coleta drops do mês anterior via DropRecord (nova abordagem) ──
    const prevMonthDropRecords = await this.dropRecordRepository.find({
      where: { calendarYear: prevYear, calendarMonth: prevMonthNum },
    });

    // Agrupa por charId
    const dropsByChar = new Map<string, DropRecord[]>();
    for (const dr of prevMonthDropRecords) {
      const list = dropsByChar.get(dr.charId) ?? [];
      list.push(dr);
      dropsByChar.set(dr.charId, list);
    }

    // ── Coleta instâncias mensais para contagem de tarefas ──
    const prevInstances = await this.taskInstanceRepository.find({
      where: { year: prevYear, period: prevMonthNum },
      relations: ['template', 'char'],
    });

    const taskCountByChar = new Map<string, { total: number; completed: number }>();
    for (const inst of prevInstances) {
      if (inst.template.frequency !== 'monthly') continue;
      const key = inst.charId;
      const cur = taskCountByChar.get(key) ?? { total: 0, completed: 0 };
      cur.total += 1;
      if (inst.done) cur.completed += 1;
      taskCountByChar.set(key, cur);
    }

    // Reúne todos os charIds com atividade no mês
    const allCharIds = new Set([...dropsByChar.keys(), ...taskCountByChar.keys()]);

    for (const charId of allCharIds) {
      const exists = await this.periodSnapshotRepository.findOne({
        where: { charId, frequency: 'monthly', year: prevYear, period: prevMonthNum },
      });
      if (exists) continue; // idempotente

      const charDropRecords = dropsByChar.get(charId) ?? [];
      const taskCounts = taskCountByChar.get(charId) ?? { total: 0, completed: 0 };

      let lootData: LootSnapshotData;

      if (charDropRecords.length > 0) {
        // Nova abordagem: DropRecord cobre todos os drops do mês
        lootData = this.buildLootFromDropRecords(charDropRecords);
      } else {
        // Fallback legado: usa TaskInstance.loot (apenas tarefas mensais)
        const monthlyLootInstances = prevInstances.filter(
          (i) =>
            i.charId === charId &&
            i.template.frequency === 'monthly' &&
            i.done &&
            (i.loot?.length ?? 0) > 0,
        );
        const templateIds = [...new Set(monthlyLootInstances.map((i) => i.templateId))];
        const templateItems =
          templateIds.length > 0
            ? await this.templateItemRepository.find({
                where: { templateId: In(templateIds) },
              })
            : [];
        lootData = this.buildLootSnapshot(monthlyLootInstances, templateItems);
      }

      await this.periodSnapshotRepository.save(
        this.periodSnapshotRepository.create({
          charId,
          frequency: 'monthly',
          year: prevYear,
          period: prevMonthNum,
          totalTasks: taskCounts.total,
          completedTasks: taskCounts.completed,
          completedAt: prevMonth.endOf('month').toDate(),
          lootData: lootData.items.length > 0 ? lootData : null,
          // isUnified = true apenas quando DropRecord foi a fonte
          isUnified: charDropRecords.length > 0,
        }),
      );
    }

    // Reset monthly TaskInstances — DropRecords são PRESERVADOS
    const monthlyTemplateIds = await this.templateRepository.find({
      where: { frequency: 'monthly' },
      select: ['id'],
    });
    const ids = monthlyTemplateIds.map((t) => t.id);
    if (ids.length > 0) {
      await this.taskInstanceRepository.update(
        { year: currYear, period: currMonth, templateId: In(ids) },
        { done: false, completedAt: null, loot: null },
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  /**
   * Constrói LootSnapshotData a partir de DropRecords.
   * Agrega por (slug, templateName) para preservar separação entre templates.
   */
  private buildLootFromDropRecords(records: DropRecord[]): LootSnapshotData {
    const agg = new Map<string, LootSnapshotItem>();
    for (const dr of records) {
      const key = `${dr.slug}:${dr.templateName ?? ''}`;
      const existing = agg.get(key);
      if (existing) {
        existing.quantity += dr.quantity;
        existing.npcTotal += dr.npcTotal;
      } else {
        agg.set(key, {
          slug: dr.slug,
          name: dr.itemName,
          spritePath: dr.spritePath,
          quantity: dr.quantity,
          npcUnitPrice: dr.npcUnitPrice,
          npcTotal: dr.npcTotal,
          isRare: dr.isRare,
          templateName: dr.templateName ?? '',
        });
      }
    }
    const items = [...agg.values()];
    const npcTotal = items.reduce((s, i) => s + i.npcTotal, 0);
    return { npcTotal, items };
  }

  /**
   * Constrói o breakdown semanal a partir de DropRecords do ciclo atual.
   * Agrupa por calendarWeek (semana ISO do dia do drop — não do início da semana).
   */
  private buildWeeklyBreakdownFromDropRecords(
    records: DropRecord[],
    year: number,
  ) {
    const weeklyMap = new Map<number, DropRecord[]>();
    for (const dr of records) {
      const list = weeklyMap.get(dr.calendarWeek) ?? [];
      list.push(dr);
      weeklyMap.set(dr.calendarWeek, list);
    }

    return [...weeklyMap.entries()]
      .map(([week, weekRecords]) => {
        const loot = this.buildLootFromDropRecords(weekRecords);
        if (loot.items.length === 0) return null;
        return {
          year,
          week,
          weekLabel: `S${week}/${year}`,
          npcTotal: loot.npcTotal,
          items: loot.items.filter((i) => !i.isRare),
          rareItems: loot.items.filter((i) => i.isRare),
        };
      })
      .filter((w): w is NonNullable<typeof w> => w !== null)
      .sort((a, b) => a.week - b.week);
  }

  /**
   * Gera insights automáticos baseados no ciclo atual.
   */
  private buildInsights(
    currentDropRecords: DropRecord[],
    weeklyBreakdown: Array<{ week: number; weekLabel: string; npcTotal: number }>,
    history: Array<{ npcTotal: number }>,
  ): CycleInsight[] {
    const insights: CycleInsight[] = [];
    const currentNpcTotal = currentDropRecords.reduce(
      (s, dr) => s + dr.npcTotal,
      0,
    );

    // Melhor semana do ciclo atual (apenas quando há mais de uma semana)
    if (weeklyBreakdown.length > 1) {
      const bestWeek = weeklyBreakdown.reduce((max, w) =>
        w.npcTotal > max.npcTotal ? w : max,
      );
      if (bestWeek.npcTotal > 0) {
        insights.push({
          type: 'best_week',
          weekLabel: bestWeek.weekLabel,
          value: bestWeek.npcTotal,
        });
      }
    }

    // Conteúdo mais lucrativo (apenas quando há mais de um template)
    const templateNpc = new Map<string, number>();
    for (const dr of currentDropRecords) {
      if (!dr.templateName) continue;
      templateNpc.set(dr.templateName, (templateNpc.get(dr.templateName) ?? 0) + dr.npcTotal);
    }
    if (templateNpc.size > 1) {
      const [bestTemplate, bestNpc] = [...templateNpc.entries()].sort(
        ([, a], [, b]) => b - a,
      )[0];
      insights.push({
        type: 'top_template',
        templateName: bestTemplate,
        value: bestNpc,
      });
    }

    // Comparação com mês anterior
    const prevMonth = history[0];
    if (prevMonth && prevMonth.npcTotal > 0 && currentNpcTotal > 0) {
      const pct = Math.round(
        ((currentNpcTotal - prevMonth.npcTotal) / prevMonth.npcTotal) * 100,
      );
      insights.push({
        type: 'vs_previous',
        value: Math.abs(pct),
        direction: pct >= 0 ? 'up' : 'down',
      });
    }

    return insights;
  }

  private async buildLootSnapshotForPeriod(
    charId: string,
    frequency: 'weekly' | 'monthly',
    year: number,
    period: number,
  ): Promise<LootSnapshotData> {
    const instances = await this.taskInstanceRepository.find({
      where: { charId, year, period },
      relations: ['template'],
    });

    const lootInstances = instances.filter(
      (i) =>
        i.template.frequency === frequency &&
        i.done &&
        (i.loot?.length ?? 0) > 0,
    );

    if (lootInstances.length === 0) return { npcTotal: 0, items: [] };

    const templateIds = [...new Set(lootInstances.map((i) => i.templateId))];
    const templateItems = await this.templateItemRepository.find({
      where: { templateId: In(templateIds) },
    });

    return this.buildLootSnapshot(lootInstances, templateItems);
  }

  private buildLootSnapshot(
    lootInstances: TaskInstance[],
    templateItems: TemplateItem[],
  ): LootSnapshotData {
    const metaByTemplateAndSlug = new Map<string, TemplateItem>();
    const metaBySlug = new Map<string, TemplateItem>();
    for (const item of templateItems) {
      metaByTemplateAndSlug.set(`${item.templateId}:${item.itemSlug}`, item);
      if (!metaBySlug.has(item.itemSlug)) metaBySlug.set(item.itemSlug, item);
    }

    const agg = new Map<string, LootSnapshotItem>();

    for (const instance of lootInstances) {
      for (const line of instance.loot ?? []) {
        if (line.quantity <= 0) continue;
        const meta =
          metaByTemplateAndSlug.get(`${instance.templateId}:${line.slug}`) ??
          metaBySlug.get(line.slug);

        const isRare = meta ? meta.isRare : line.npcUnitPriceDollars === 0;
        const npcUnitPrice = isRare ? 0 : line.npcUnitPriceDollars;
        const npcTotal = isRare ? 0 : line.quantity * npcUnitPrice;

        const existing = agg.get(line.slug);
        if (existing) {
          existing.quantity += line.quantity;
          existing.npcTotal += npcTotal;
        } else {
          agg.set(line.slug, {
            slug: line.slug,
            name: meta?.itemName ?? line.slug,
            spritePath: meta?.spritePath ?? '',
            quantity: line.quantity,
            npcUnitPrice,
            npcTotal,
            isRare,
            templateName: instance.template?.name ?? '',
          });
        }
      }
    }

    const items = [...agg.values()];
    const npcTotal = items.reduce((s, i) => s + i.npcTotal, 0);
    return { npcTotal, items };
  }

  /** ISO weeks whose Monday falls within the given calendar month. */
  private getIsoWeeksForMonth(
    year: number,
    month: number,
  ): Array<{ year: number; week: number }> {
    const monthStr = String(month).padStart(2, '0');
    const monthStart = dayjs(`${year}-${monthStr}-01`);
    const monthEnd = monthStart.endOf('month');
    const result: Array<{ year: number; week: number }> = [];

    let d = monthStart.startOf('isoWeek');
    while (!d.isAfter(monthEnd)) {
      if (d.year() === year && d.month() + 1 === month) {
        result.push({ year: d.isoWeekYear(), week: d.isoWeek() });
      }
      d = d.add(1, 'week');
    }
    return result;
  }

  /** Returns the Monday (dayjs) of a given ISO year+week. */
  private isoWeekMonday(isoYear: number, isoWeek: number): dayjs.Dayjs {
    const jan4 = dayjs(`${isoYear}-01-04`);
    return jan4.startOf('isoWeek').add(isoWeek - 1, 'week');
  }

  private formatPeriodLabel(
    frequency: 'weekly' | 'monthly',
    year: number,
    period: number,
  ): string {
    if (frequency === 'weekly') return `S${period}/${year}`;
    const months = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
    ];
    return `${months[period - 1]}/${year}`;
  }

  private async ensureOwnedChar(userId: string, charId: string) {
    const char = await this.charRepository.findOne({
      where: { id: charId, userId },
    });
    if (!char) throw new NotFoundException('Char não encontrado');
  }

  private async ensureCurrentInstances(charId: string, userId: string) {
    const now = dayjs();
    const weekYear = now.isoWeekYear();
    const week = now.isoWeek();
    const monthYear = now.year();
    const month = now.month() + 1;

    const links = await this.charTemplateRepository.find({
      where: { charId },
      relations: ['template'],
    });

    for (const link of links) {
      if (link.template.scope !== 'global' && link.template.userId !== userId) continue;

      const periodData =
        link.template.frequency === 'weekly'
          ? { year: weekYear, period: week }
          : { year: monthYear, period: month };

      const existing = await this.taskInstanceRepository.findOne({
        where: {
          charId,
          templateId: link.templateId,
          year: periodData.year,
          period: periodData.period,
        },
      });

      if (!existing) {
        await this.taskInstanceRepository.save(
          this.taskInstanceRepository.create({
            charId,
            templateId: link.templateId,
            year: periodData.year,
            period: periodData.period,
            done: false,
            completedAt: null,
            notes: '',
          }),
        );
      }
    }
  }

  private normalizeLoot(loot: TaskLootLine[] | null | undefined): TaskLootLine[] {
    if (!loot?.length) return [];
    return loot
      .filter((l) => l.quantity > 0)
      .map((l) => ({
        slug: l.slug,
        quantity: l.quantity,
        npcUnitPriceDollars: l.npcUnitPriceDollars,
      }));
  }

  private sumLootByPreset(
    rows: Array<{
      done: boolean;
      loot: TaskLootLine[] | null;
      presetKey: string | null;
    }>,
  ): Record<string, number> {
    const out: Record<string, number> = {};
    for (const row of rows) {
      if (!row.done || !row.loot?.length || !row.presetKey) continue;
      let sum = 0;
      for (const line of row.loot) {
        sum += line.quantity * line.npcUnitPriceDollars;
      }
      if (sum <= 0) continue;
      out[row.presetKey] = (out[row.presetKey] ?? 0) + sum;
    }
    return out;
  }

  private async getCurrentWeeklyLootRows(userId: string, charId: string) {
    await this.ensureOwnedChar(userId, charId);
    await this.ensureCurrentInstances(charId, userId);
    const now = dayjs();
    const weekYear = now.isoWeekYear();
    const week = now.isoWeek();

    const links = await this.charTemplateRepository.find({
      where: { charId },
      relations: ['template'],
    });
    const templateIds = links.map((l) => l.templateId);
    if (templateIds.length === 0) return [];

    const instances = await this.taskInstanceRepository.find({
      where: { charId, templateId: In(templateIds), year: weekYear, period: week },
      relations: ['template'],
    });

    return instances
      .filter((i) => i.template.frequency === 'weekly')
      .map((i) => ({
        done: i.done,
        loot: i.loot,
        presetKey: i.template.presetKey,
      }));
  }
}
