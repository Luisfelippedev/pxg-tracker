import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Char } from '../chars/char.entity';
import { User } from '../users/user.entity';
import { NonAdminGuard } from '../admin/non-admin.guard';
import { CharTemplate } from './entities/char-template.entity';
import { DropRecord } from './entities/drop-record.entity';
import { PeriodSnapshot } from './entities/period-snapshot.entity';
import { TaskInstance } from './entities/task-instance.entity';
import { TaskTemplate } from './entities/task-template.entity';
import { TemplateItem } from './entities/template-item.entity';
import { TrackerController } from './tracker.controller';
import { TrackerService } from './tracker.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TaskTemplate,
      TemplateItem,
      CharTemplate,
      TaskInstance,
      Char,
      User,
      PeriodSnapshot,
      DropRecord,
    ]),
  ],
  controllers: [TrackerController],
  providers: [TrackerService, NonAdminGuard],
  exports: [TrackerService],
})
export class TrackerModule {}
