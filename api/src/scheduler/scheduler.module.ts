import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TrackerModule } from '../tracker/tracker.module';
import { SchedulerService } from './scheduler.service';

@Module({
  imports: [ScheduleModule.forRoot(), TrackerModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}
