import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';
import { ReplaceTemplateItemsDto, UpsertGlobalTemplateDto } from './dto/global-templates.dto';
import { CurrentUser } from '../common/current-user.decorator';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  getAdminDashboard() {
    return this.adminService.getAdminDashboard();
  }

  @Get('users')
  listUsers() {
    return this.adminService.listUsers();
  }

  @Get('users/:userId/dashboard')
  getUserDashboard(@Param('userId') userId: string) {
    return this.adminService.getUserDashboard(userId);
  }

  // --- Templates globais ---
  @Get('global-templates')
  listGlobalTemplates() {
    return this.adminService.listGlobalTemplates();
  }

  @Post('global-templates')
  createGlobalTemplate(
    @CurrentUser() user: { sub: string },
    @Body() dto: UpsertGlobalTemplateDto,
  ) {
    return this.adminService.createGlobalTemplate(user.sub, dto);
  }

  @Patch('global-templates/:id')
  updateGlobalTemplate(@Param('id') id: string, @Body() dto: UpsertGlobalTemplateDto) {
    return this.adminService.updateGlobalTemplate(id, dto);
  }

  @Delete('global-templates/:id')
  deleteGlobalTemplate(@Param('id') id: string) {
    return this.adminService.deleteGlobalTemplate(id);
  }

  @Get('global-templates/:id/items')
  listGlobalTemplateItems(@Param('id') id: string) {
    return this.adminService.listGlobalTemplateItems(id);
  }

  @Post('global-templates/:id/items')
  replaceGlobalTemplateItems(@Param('id') id: string, @Body() dto: ReplaceTemplateItemsDto) {
    return this.adminService.replaceGlobalTemplateItems(id, dto.items ?? []);
  }

  // --- Catálogo de itens ---
  @Get('items')
  listItems(
    @Query('q') q?: string,
    @Query('hasRealSprite') hasRealSprite?: string,
    @Query('usedPlaceholder') usedPlaceholder?: string,
  ) {
    return this.adminService.listItems({
      q,
      hasRealSprite: hasRealSprite === undefined ? undefined : hasRealSprite === 'true',
      usedPlaceholder: usedPlaceholder === undefined ? undefined : usedPlaceholder === 'true',
    });
  }

  // --- Sprites (paths) ---
  @Get('sprites')
  listSprites(@Query('q') q?: string) {
    return this.adminService.listSprites({ q });
  }
}

