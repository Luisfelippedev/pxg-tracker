import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Char } from './char.entity';
import { CharsController } from './chars.controller';
import { CharsService } from './chars.service';

@Module({
  imports: [TypeOrmModule.forFeature([Char])],
  controllers: [CharsController],
  providers: [CharsService],
  exports: [TypeOrmModule],
})
export class CharsModule {}
