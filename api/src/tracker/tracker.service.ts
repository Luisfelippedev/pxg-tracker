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

/** Preset espelhado pelo client (nightmareTerrorItems.ts) */
export const NIGHTMARE_TERROR_PRESET_KEY = 'nightmare_terror';

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
  ) {}

  async getTemplates(userId: string) {
    // Global + templates do usuário
    const rows = await this.templateRepository.find({
      where: [{ scope: 'global' }, { userId, scope: 'user' }],
      order: { createdAt: 'ASC' },
    });
    // Segurança extra contra legado duplicado por presetKey:
    // se existir global com mesmo preset, não expõe a versão user.
    const globalPresetKeys = new Set(
      rows.filter((t) => t.scope === 'global' && t.presetKey).map((t) => t.presetKey),
    );
    return rows.filter(
      (t) =>
        !(
          t.scope === 'user' &&
          t.presetKey &&
          globalPresetKeys.has(t.presetKey)
        ),
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
      throw new BadRequestException('Templates globais são somente leitura para usuários comuns');

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
      throw new BadRequestException('Templates globais são somente leitura para usuários comuns');
    if (template.presetKey)
      throw new BadRequestException(
        'Templates pré-definidos não podem ser excluídos. Desative no char se não quiser usar.',
      );
    await this.templateRepository.remove(template);
    return { success: true };
  }

  async getCharTemplates(userId: string, charId: string) {
    await this.ensureOwnedChar(userId, charId);
    return this.charTemplateRepository.find({ where: { charId } });
  }

  async setCharTemplates(
    userId: string,
    charId: string,
    templateIds: string[],
  ) {
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
    if (template.scope !== 'global' && template.userId !== userId) {
      throw new NotFoundException('Template não encontrado');
    }
    return this.templateItemRepository.find({
      where: { templateId: template.id },
      order: { itemName: 'ASC' },
    });
  }

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
        if (item.template.frequency === 'weekly') {
          return item.year === weekYear && item.period === week;
        }
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

  async updateTaskStatus(userId: string, id: string, body: UpdateTaskStatusDto) {
    const task = await this.taskInstanceRepository.findOne({
      where: { id },
      relations: ['char', 'template'],
    });
    if (!task || task.char.userId !== userId)
      throw new NotFoundException('Tarefa não encontrada');

    const { done, loot } = body;

    if (!done) {
      task.done = false;
      task.completedAt = null;
      task.loot = null;
      return this.taskInstanceRepository.save(task);
    }

    if (task.template.kind === 'loot') {
      if (loot === undefined)
        throw new BadRequestException(
          'Informe a lista de drops (loot) ao concluir esta tarefa. Pode ser vazia se não dropou nada.',
        );
      task.loot = this.normalizeLoot(loot);
    } else {
      task.loot = null;
    }

    task.done = true;
    task.completedAt = new Date();
    return this.taskInstanceRepository.save(task);
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
    const completedTasks = statsSource.reduce(
      (sum, item) => sum + item.completed,
      0,
    );

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
      where: {
        charId,
        templateId: In(templateIds),
        year: weekYear,
        period: week,
      },
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

  async getHistory(
    userId: string,
    params: {
      charId: string;
      frequency?: 'weekly' | 'monthly';
      limit?: number;
    },
  ) {
    const { charId, frequency, limit = 52 } = params;
    await this.ensureOwnedChar(userId, charId);

    return this.periodSnapshotRepository.find({
      where: {
        charId,
        ...(frequency ? { frequency } : {}),
      },
      order: { completedAt: 'DESC' },
      take: limit,
    });
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

  // ---------------------------------------------------------------------------
  // Drops Summary
  // ---------------------------------------------------------------------------

  async getDropsSummary(
    userId: string,
    charId: string,
    frequency: 'weekly' | 'monthly',
  ) {
    await this.ensureOwnedChar(userId, charId);

    const now = dayjs();
    const currentYear =
      frequency === 'weekly' ? now.isoWeekYear() : now.year();
    const currentPeriod =
      frequency === 'weekly' ? now.isoWeek() : now.month() + 1;

    // Todas as instâncias do char com loot concluído para esta frequência
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

    // Separa período atual do histórico
    const currentInstances = lootInstances.filter(
      (i) => i.year === currentYear && i.period === currentPeriod,
    );
    const histInstances = lootInstances.filter(
      (i) => !(i.year === currentYear && i.period === currentPeriod),
    );

    // Carrega metadata dos itens (TemplateItem) para todos os templates
    const allTemplateIds = [...new Set(lootInstances.map((i) => i.templateId))];
    const templateItems =
      allTemplateIds.length > 0
        ? await this.templateItemRepository.find({
            where: { templateId: In(allTemplateIds) },
          })
        : [];

    // Período atual
    const currentLoot = this.buildLootSnapshot(currentInstances, templateItems);

    // Histórico: agrupa instâncias por (year, period)
    const periodMap = new Map<string, typeof histInstances>();
    for (const inst of histInstances) {
      const key = `${inst.year}:${inst.period}`;
      const list = periodMap.get(key) ?? [];
      list.push(inst);
      periodMap.set(key, list);
    }

    // Snapshots para pegar totalTasks / completedTasks
    const snapshots = await this.periodSnapshotRepository.find({
      where: { charId, frequency },
    });
    const snapshotMap = new Map<string, PeriodSnapshot>();
    for (const s of snapshots) {
      snapshotMap.set(`${s.year}:${s.period}`, s);
    }

    // Ordena períodos: mais recente primeiro
    // Inclui tanto períodos com instâncias de loot quanto períodos só com snapshot
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
      // Prefere lootData do snapshot quando disponível (dados congelados no reset)
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

    // Estatísticas gerais
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

    const periodsWithDrops =
      (currentLoot.npcTotal > 0 ? 1 : 0) +
      history.filter((h) => h.npcTotal > 0).length;

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
        periodsWithDrops,
        bestPeriodNpc,
        bestPeriodLabel,
        avgNpc,
        streak,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Monthly Cycle Summary (unified weekly + monthly by calendar month)
  // ---------------------------------------------------------------------------

  async getMonthlyCycleSummary(userId: string, charId: string) {
    await this.ensureOwnedChar(userId, charId);

    const now = dayjs();
    const currentYear = now.year();
    const currentMonth = now.month() + 1;

    // ISO weeks whose Monday falls within the current calendar month
    const weeksInMonth = this.getIsoWeeksForMonth(currentYear, currentMonth);

    // All instances for this char (same approach as getDropsSummary)
    const allInstances = await this.taskInstanceRepository.find({
      where: { charId },
      relations: ['template'],
    });

    // Current cycle: completed loot tasks from this calendar month
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

    const currentTemplateIds = [
      ...new Set(currentInstances.map((i) => i.templateId)),
    ];
    const currentTemplateItems =
      currentTemplateIds.length > 0
        ? await this.templateItemRepository.find({
            where: { templateId: In(currentTemplateIds) },
          })
        : [];

    const currentLoot = this.buildLootSnapshot(
      currentInstances,
      currentTemplateItems,
    );

    // Weekly breakdown within the current month
    const weeklyBreakdown = weeksInMonth
      .map(({ year: wy, week }) => {
        const weekInsts = currentWeeklyInst.filter(
          (i) => i.year === wy && i.period === week,
        );
        if (weekInsts.length === 0) return null;
        const loot = this.buildLootSnapshot(weekInsts, currentTemplateItems);
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

    // ── History: group PeriodSnapshots by calendar month ──
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
    };
    const monthMap = new Map<string, MonthData>();

    for (const snap of allSnapshots) {
      let snapYear: number;
      let snapMonth: number;

      if (snap.frequency === 'monthly') {
        snapYear = snap.year;
        snapMonth = snap.period;
      } else {
        const monday = this.isoWeekMonday(snap.year, snap.period);
        snapYear = monday.year();
        snapMonth = monday.month() + 1;
      }

      if (snapYear === currentYear && snapMonth === currentMonth) continue;

      const key = `${snapYear}:${snapMonth}`;
      const existing: MonthData = monthMap.get(key) ?? {
        npcTotal: 0,
        items: [],
        totalTasks: 0,
        completedTasks: 0,
        weeks: [],
      };

      if (snap.lootData) {
        existing.npcTotal += snap.lootData.npcTotal;
        for (const item of snap.lootData.items) {
          const existingItem = existing.items.find(
            (i) =>
              i.slug === item.slug && i.templateName === item.templateName,
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

    // ── All-time stats ──
    const allNpcValues = [
      currentLoot.npcTotal,
      ...history.map((h) => h.npcTotal),
    ];
    const allTimeNpc = allNpcValues.reduce((s, n) => s + n, 0);
    const periodsWithDrops =
      (currentLoot.npcTotal > 0 ? 1 : 0) +
      history.filter((h) => h.npcTotal > 0).length;

    const nonZeroNpc = allNpcValues.filter((v) => v > 0);
    const avgNpc =
      nonZeroNpc.length > 0
        ? Math.round(
            nonZeroNpc.reduce((s, n) => s + n, 0) / nonZeroNpc.length,
          )
        : 0;

    const bestMonthNpc =
      allNpcValues.length > 0 ? Math.max(...allNpcValues) : 0;
    let bestMonthLabel = this.formatPeriodLabel(
      'monthly',
      currentYear,
      currentMonth,
    );
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
        completedLootTasks: currentInstances.length,
        weeklyBreakdown,
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
    };
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
    // Jan 4 of the ISO year is always in ISO week 1
    const jan4 = dayjs(`${isoYear}-01-04`);
    return jan4.startOf('isoWeek').add(isoWeek - 1, 'week');
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

  // ---------------------------------------------------------------------------

  private async ensureOwnedChar(userId: string, charId: string) {
    const char = await this.charRepository.findOne({
      where: { id: charId, userId },
    });
    if (!char) throw new NotFoundException('Char não encontrado');
  }

  /** Job: snapshot semana anterior e reset semana atual (segunda 7:30) */
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
        where: {
          charId,
          frequency: 'weekly',
          year: prevYear,
          period: prevWeekNum,
        },
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
          }),
        );
      }
    }

    const weeklyTemplateIds = await this.templateRepository.find({
      where: { frequency: 'weekly' },
      select: ['id'],
    });
    const ids = weeklyTemplateIds.map((t) => t.id);
    if (ids.length > 0) {
      await this.taskInstanceRepository.update(
        {
          year: currYear,
          period: currWeek,
          templateId: In(ids),
        },
        { done: false, completedAt: null, loot: null },
      );
    }
  }

  /** Job: snapshot mês anterior e reset mês atual (dia 1 às 7:30) */
  async snapshotAndResetMonthly(): Promise<void> {
    const now = dayjs();
    const prevMonth = now.subtract(1, 'month');
    const prevYear = prevMonth.year();
    const prevMonthNum = prevMonth.month() + 1;
    const currYear = now.year();
    const currMonth = now.month() + 1;

    const prevInstances = await this.taskInstanceRepository.find({
      where: { year: prevYear, period: prevMonthNum },
      relations: ['template', 'char'],
    });

    const byChar = new Map<string, { total: number; completed: number }>();
    for (const inst of prevInstances) {
      if (inst.template.frequency !== 'monthly') continue;
      const key = inst.charId;
      const cur = byChar.get(key) ?? { total: 0, completed: 0 };
      cur.total += 1;
      if (inst.done) cur.completed += 1;
      byChar.set(key, cur);
    }

    for (const [charId, stats] of byChar.entries()) {
      const exists = await this.periodSnapshotRepository.findOne({
        where: {
          charId,
          frequency: 'monthly',
          year: prevYear,
          period: prevMonthNum,
        },
      });
      if (!exists) {
        const lootData = await this.buildLootSnapshotForPeriod(
          charId,
          'monthly',
          prevYear,
          prevMonthNum,
        );
        await this.periodSnapshotRepository.save(
          this.periodSnapshotRepository.create({
            charId,
            frequency: 'monthly',
            year: prevYear,
            period: prevMonthNum,
            totalTasks: stats.total,
            completedTasks: stats.completed,
            completedAt: prevMonth.endOf('month').toDate(),
            lootData: lootData.items.length > 0 ? lootData : null,
          }),
        );
      }
    }

    const monthlyTemplateIds = await this.templateRepository.find({
      where: { frequency: 'monthly' },
      select: ['id'],
    });
    const ids = monthlyTemplateIds.map((t) => t.id);
    if (ids.length > 0) {
      await this.taskInstanceRepository.update(
        {
          year: currYear,
          period: currMonth,
          templateId: In(ids),
        },
        { done: false, completedAt: null, loot: null },
      );
    }
  }
}
