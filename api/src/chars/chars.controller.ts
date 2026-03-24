import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { CharsService } from './chars.service';
import { CreateCharDto, UpdateCharDto } from './dto/chars.dto';

@UseGuards(JwtAuthGuard)
@Controller('chars')
export class CharsController {
  constructor(private readonly charsService: CharsService) {}

  @Get()
  findAll(@CurrentUser() user: { sub: string }) {
    return this.charsService.findAll(user.sub);
  }

  @Post()
  create(@CurrentUser() user: { sub: string }, @Body() dto: CreateCharDto) {
    return this.charsService.create(user.sub, dto.name);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() dto: UpdateCharDto,
  ) {
    return this.charsService.update(user.sub, id, dto.name);
  }

  @Delete(':id')
  remove(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.charsService.remove(user.sub, id);
  }
}
