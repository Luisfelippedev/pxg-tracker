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
    const { charId, frequency, limit = 20 } = params;
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
        await this.periodSnapshotRepository.save(
          this.periodSnapshotRepository.create({
            charId,
            frequency: 'weekly',
            year: prevYear,
            period: prevWeekNum,
            totalTasks: stats.total,
            completedTasks: stats.completed,
            completedAt: prevWeek.endOf('isoWeek').toDate(),
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
        await this.periodSnapshotRepository.save(
          this.periodSnapshotRepository.create({
            charId,
            frequency: 'monthly',
            year: prevYear,
            period: prevMonthNum,
            totalTasks: stats.total,
            completedTasks: stats.completed,
            completedAt: prevMonth.endOf('month').toDate(),
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
