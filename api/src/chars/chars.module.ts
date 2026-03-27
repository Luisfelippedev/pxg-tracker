import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NonAdminGuard } from '../admin/non-admin.guard';
import { User } from '../users/user.entity';
import { Char } from './char.entity';
import { CharsController } from './chars.controller';
import { CharsService } from './chars.service';

@Module({
  imports: [TypeOrmModule.forFeature([Char, User])],
  controllers: [CharsController],
  providers: [CharsService, NonAdminGuard],
  exports: [TypeOrmModule],
})
export class CharsModule {}
