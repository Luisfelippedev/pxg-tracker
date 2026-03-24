import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TrackerService } from '../tracker/tracker.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(private readonly trackerService: TrackerService) {}

  /** Segunda-feira 7:30 - snapshot semana anterior + reset semanais */
  @Cron('30 7 * * 1', {
    name: 'weekly-reset',
    timeZone: process.env.TZ ?? 'America/Sao_Paulo',
  })
  async handleWeeklyReset(): Promise<void> {
    this.logger.log('Executando job: snapshot e reset de tarefas semanais');
    try {
      await this.trackerService.snapshotAndResetWeekly();
      this.logger.log('Job semanal concluído com sucesso');
    } catch (error) {
      this.logger.error('Erro no job semanal', error);
    }
  }

  /** Dia 1 de cada mês às 7:30 - snapshot mês anterior + reset mensais */
  @Cron('30 7 1 * *', {
    name: 'monthly-reset',
    timeZone: process.env.TZ ?? 'America/Sao_Paulo',
  })
  async handleMonthlyReset(): Promise<void> {
    this.logger.log('Executando job: snapshot e reset de tarefas mensais');
    try {
      await this.trackerService.snapshotAndResetMonthly();
      this.logger.log('Job mensal concluído com sucesso');
    } catch (error) {
      this.logger.error('Erro no job mensal', error);
    }
  }
}
