import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Char } from '../chars/char.entity';
import { CharTemplate } from './entities/char-template.entity';
import { PeriodSnapshot } from './entities/period-snapshot.entity';
import { TaskInstance } from './entities/task-instance.entity';
import { TaskTemplate } from './entities/task-template.entity';
import { TrackerController } from './tracker.controller';
import { TrackerService } from './tracker.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TaskTemplate,
      CharTemplate,
      TaskInstance,
      Char,
      PeriodSnapshot,
    ]),
  ],
  controllers: [TrackerController],
  providers: [TrackerService],
  exports: [TrackerService],
})
export class TrackerModule {}
