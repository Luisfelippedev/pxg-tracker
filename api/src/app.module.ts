import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CharsModule } from './chars/chars.module';
import { AdminModule } from './admin/admin.module';
import { TrackerModule } from './tracker/tracker.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { SeedModule } from './seed/seed.module';
import { User } from './users/user.entity';
import { Char } from './chars/char.entity';
import { TaskTemplate } from './tracker/entities/task-template.entity';
import { CharTemplate } from './tracker/entities/char-template.entity';
import { TaskInstance } from './tracker/entities/task-instance.entity';
import { PeriodSnapshot } from './tracker/entities/period-snapshot.entity';
import { TemplateItem } from './tracker/entities/template-item.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USER ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_NAME ?? 'pxg_tracker',
      entities: [
        User,
        Char,
        TaskTemplate,
        CharTemplate,
        TaskInstance,
        PeriodSnapshot,
        TemplateItem,
      ],
      synchronize: true,
    }),
    AuthModule,
    CharsModule,
    TrackerModule,
    SchedulerModule,
    AdminModule,
    SeedModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
