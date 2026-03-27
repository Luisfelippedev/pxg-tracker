import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { CharTemplate } from '../tracker/entities/char-template.entity';
import { TaskInstance } from '../tracker/entities/task-instance.entity';
import { TaskTemplate } from '../tracker/entities/task-template.entity';
import { TemplateItem } from '../tracker/entities/template-item.entity';
import { SeedService } from './seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      TaskTemplate,
      TemplateItem,
      CharTemplate,
      TaskInstance,
    ]),
  ],
  providers: [SeedService],
})
export class SeedModule {}

