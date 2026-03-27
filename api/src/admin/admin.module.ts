import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminGuard } from './admin.guard';
import { User } from '../users/user.entity';
import { TrackerModule } from '../tracker/tracker.module';
import { TaskTemplate } from '../tracker/entities/task-template.entity';
import { TemplateItem } from '../tracker/entities/template-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, TaskTemplate, TemplateItem]), TrackerModule],
  controllers: [AdminController],
  providers: [AdminService, AdminGuard],
})
export class AdminModule {}

