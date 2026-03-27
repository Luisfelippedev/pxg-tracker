import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import {
  CreateTemplateDto,
  SetCharTemplatesDto,
  UpdateTaskStatusDto,
  UpdateTemplateDto,
} from './dto/tracker.dto';
import { TrackerService } from './tracker.service';
import { NonAdminGuard } from '../admin/non-admin.guard';

@UseGuards(JwtAuthGuard, NonAdminGuard)
@Controller()
export class TrackerController {
  constructor(private readonly trackerService: TrackerService) {}

  @Get('templates')
  getTemplates(@CurrentUser() user: { sub: string }) {
    return this.trackerService.getTemplates(user.sub);
  }

  @Post('templates')
  createTemplate(
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateTemplateDto,
  ) {
    return this.trackerService.createTemplate(user.sub, dto);
  }

  @Patch('templates/:id')
  updateTemplate(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.trackerService.updateTemplate(user.sub, id, dto);
  }

  @Delete('templates/:id')
  deleteTemplate(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
  ) {
    return this.trackerService.deleteTemplate(user.sub, id);
  }

  @Get('templates/:id/items')
  getTemplateItems(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
  ) {
    return this.trackerService.getTemplateItems(user.sub, id);
  }

  @Get('chars/:charId/templates')
  getCharTemplates(
    @CurrentUser() user: { sub: string },
    @Param('charId') charId: string,
  ) {
    return this.trackerService.getCharTemplates(user.sub, charId);
  }

  @Put('chars/:charId/templates')
  setCharTemplates(
    @CurrentUser() user: { sub: string },
    @Param('charId') charId: string,
    @Body() dto: SetCharTemplatesDto,
  ) {
    return this.trackerService.setCharTemplates(
      user.sub,
      charId,
      dto.templateIds ?? [],
    );
  }

  @Get('tasks')
  getTasks(
    @CurrentUser() user: { sub: string },
    @Query('charId') charId: string,
    @Query('frequency') frequency?: 'weekly' | 'monthly',
  ) {
    return this.trackerService.getTaskInstances(user.sub, {
      charId,
      frequency,
    });
  }

  @Patch('tasks/:id/status')
  updateTaskStatus(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() body: UpdateTaskStatusDto,
  ) {
    return this.trackerService.updateTaskStatus(user.sub, id, body);
  }

  @Get('dashboard')
  getDashboard(
    @CurrentUser() user: { sub: string },
    @Query('charId') charId?: string,
  ) {
    return this.trackerService.getDashboardSummary(user.sub, charId);
  }

  @Get('drops')
  getDropsSummary(
    @CurrentUser() user: { sub: string },
    @Query('charId') charId: string,
    @Query('frequency') frequency?: 'weekly' | 'monthly',
  ) {
    return this.trackerService.getDropsSummary(
      user.sub,
      charId,
      frequency ?? 'weekly',
    );
  }

  @Get('history')
  getHistory(
    @CurrentUser() user: { sub: string },
    @Query('charId') charId: string,
    @Query('frequency') frequency?: 'weekly' | 'monthly',
    @Query('limit') limit?: string,
  ) {
    return this.trackerService.getHistory(user.sub, {
      charId,
      frequency,
      limit: limit ? Number(limit) : 20,
    });
  }
}
