import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { In, Repository } from 'typeorm';
import { Char } from '../chars/char.entity';
import { CharTemplate } from './entities/char-template.entity';
import { PeriodSnapshot } from './entities/period-snapshot.entity';
import { TaskInstance } from './entities/task-instance.entity';
import { TaskTemplate } from './entities/task-template.entity';

dayjs.extend(isoWeek);

@Injectable()
export class TrackerService {
  constructor(
    @InjectRepository(TaskTemplate)
    private readonly templateRepository: Repository<TaskTemplate>,
    @InjectRepository(CharTemplate)
    private readonly charTemplateRepository: Repository<CharTemplate>,
    @InjectRepository(TaskInstance)
    private readonly taskInstanceRepository: Repository<TaskInstance>,
    @InjectRepository(Char)
    private readonly charRepository: Repository<Char>,
    @InjectRepository(PeriodSnapshot)
    private readonly periodSnapshotRepository: Repository<PeriodSnapshot>,
  ) {}

  getTemplates(userId: string) {
    return this.templateRepository.find({
      where: { userId },
      order: { createdAt: 'ASC' },
    });
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

    if (data.name) template.name = data.name.trim();
    if (data.frequency) template.frequency = data.frequency;
    return this.templateRepository.save(template);
  }

  async deleteTemplate(userId: string, id: string) {
    const result = await this.templateRepository.delete({ id, userId });
    if (!result.affected)
      throw new NotFoundException('Template não encontrado');
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
          where: { id: In(templateIds), userId },
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
        charName: item.char.name,
        templateName: item.template.name,
        frequency: item.template.frequency,
      }));
  }

  async updateTaskStatus(userId: string, id: string, done: boolean) {
    const task = await this.taskInstanceRepository.findOne({
      where: { id },
      relations: ['char'],
    });
    if (!task || task.char.userId !== userId)
      throw new NotFoundException('Tarefa não encontrada');

    task.done = done;
    task.completedAt = done ? new Date() : null;
    return this.taskInstanceRepository.save(task);
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
    const statsSource = targetProgress
      ? [targetProgress]
      : charProgress;

    const totalTasks = statsSource.reduce((sum, item) => sum + item.total, 0);
    const completedTasks = statsSource.reduce(
      (sum, item) => sum + item.completed,
      0,
    );

    return {
      totalTasks,
      completedTasks,
      completionPercentage:
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      charProgress,
    };
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
      if (link.template.userId !== userId) continue;

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
        { done: false, completedAt: null },
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
        { done: false, completedAt: null },
      );
    }
  }
}
