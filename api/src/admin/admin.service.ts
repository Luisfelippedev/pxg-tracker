import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { TrackerService } from '../tracker/tracker.service';
import { TaskTemplate } from '../tracker/entities/task-template.entity';
import { TemplateItem } from '../tracker/entities/template-item.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(TaskTemplate)
    private readonly templateRepository: Repository<TaskTemplate>,
    @InjectRepository(TemplateItem)
    private readonly templateItemRepository: Repository<TemplateItem>,
    private readonly trackerService: TrackerService,
  ) {}

  async listUsers() {
    const users = await this.userRepository.find({
      order: { createdAt: 'ASC' },
    });

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role ?? 'user',
    }));
  }

  async getUserDashboard(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) return null;

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role ?? 'user',
      },
      dashboard: await this.trackerService.getDashboardSummary(user.id),
    };
  }

  async getAdminDashboard() {
    const users = await this.userRepository.find({
      order: { createdAt: 'ASC' },
    });

    // Reuso da lógica do TrackerService para manter a definição de progresso idêntica.
    return Promise.all(
      users.map(async (u) => ({
        user: {
          id: u.id,
          email: u.email,
          role: u.role ?? 'user',
        },
        dashboard: await this.trackerService.getDashboardSummary(u.id),
      })),
    );
  }

  // --- Templates globais ---
  async listGlobalTemplates() {
    return this.templateRepository.find({
      where: { scope: 'global' },
      order: { createdAt: 'ASC' },
    });
  }

  async createGlobalTemplate(
    adminUserId: string,
    dto: {
      name: string;
      frequency: 'weekly' | 'monthly';
      kind: 'standard' | 'loot';
      presetKey?: string | null;
    },
  ) {
    const name = dto.name.trim();
    const existing = await this.templateRepository.findOne({
      where: { scope: 'global', name },
    });
    if (existing)
      throw new BadRequestException(
        'Já existe um template global com esse nome',
      );

    return this.templateRepository.save(
      this.templateRepository.create({
        userId: adminUserId,
        name,
        frequency: dto.frequency,
        kind: dto.kind,
        presetKey: dto.presetKey ?? null,
        scope: 'global',
      }),
    );
  }

  async updateGlobalTemplate(
    id: string,
    dto: {
      name: string;
      frequency: 'weekly' | 'monthly';
      kind: 'standard' | 'loot';
      presetKey?: string | null;
    },
  ) {
    const template = await this.templateRepository.findOne({ where: { id } });
    if (!template || template.scope !== 'global')
      throw new NotFoundException('Template global não encontrado');

    const name = dto.name.trim();
    if (name !== template.name) {
      const existing = await this.templateRepository.findOne({
        where: { scope: 'global', name },
      });
      if (existing)
        throw new BadRequestException(
          'Já existe um template global com esse nome',
        );
    }

    template.name = name;
    template.frequency = dto.frequency;
    template.kind = dto.kind;
    template.presetKey = dto.presetKey ?? null;
    return this.templateRepository.save(template);
  }

  async deleteGlobalTemplate(id: string) {
    const template = await this.templateRepository.findOne({ where: { id } });
    if (!template || template.scope !== 'global')
      throw new NotFoundException('Template global não encontrado');
    if (template.presetKey)
      throw new BadRequestException(
        'Templates pré-definidos não podem ser excluídos',
      );
    await this.templateRepository.remove(template);
    return { success: true };
  }

  async listGlobalTemplateItems(templateId: string) {
    const tpl = await this.templateRepository.findOne({
      where: { id: templateId },
    });
    if (!tpl || tpl.scope !== 'global')
      throw new NotFoundException('Template global não encontrado');
    return this.templateItemRepository.find({
      where: { templateId },
      order: { itemName: 'ASC' },
    });
  }

  async replaceGlobalTemplateItems(
    templateId: string,
    items: Array<{
      itemSlug: string;
      itemName: string;
      spritePath: string;
      isRare?: boolean;
      npcPriceDollars?: number | null;
    }>,
  ) {
    const tpl = await this.templateRepository.findOne({
      where: { id: templateId },
    });
    if (!tpl || tpl.scope !== 'global')
      throw new NotFoundException('Template global não encontrado');

    const normalized = items.map((i) => ({
      itemSlug: i.itemSlug.trim(),
      itemName: i.itemName.trim(),
      spritePath: i.spritePath.trim(),
      isRare: Boolean(i.isRare),
      npcPriceDollars:
        i.npcPriceDollars === undefined || i.npcPriceDollars === null
          ? null
          : Number(i.npcPriceDollars),
    }));

    for (const i of normalized) {
      const hasNpc = i.npcPriceDollars !== null && i.npcPriceDollars >= 0;
      if (i.isRare && hasNpc) {
        throw new BadRequestException(
          `Item "${i.itemName}": raro não pode ter valor NPC`,
        );
      }
      if (!i.isRare && i.npcPriceDollars !== null && i.npcPriceDollars < 0) {
        throw new BadRequestException(
          `Item "${i.itemName}": valor NPC inválido`,
        );
      }
      if (i.isRare) i.npcPriceDollars = null;
      if (!i.spritePath.startsWith('/')) {
        throw new BadRequestException(
          `Item "${i.itemName}": spritePath deve começar com "/"`,
        );
      }
    }

    await this.templateItemRepository.delete({ templateId });
    if (normalized.length === 0) return [];

    const entities = normalized.map((i) =>
      this.templateItemRepository.create({
        templateId,
        itemSlug: i.itemSlug,
        itemName: i.itemName,
        spritePath: i.spritePath,
        isRare: i.isRare,
        npcPriceDollars: i.npcPriceDollars,
      }),
    );
    return this.templateItemRepository.save(entities);
  }

  // --- Catálogo de itens (JSON) ---
  listItems(params: {
    q?: string;
    hasRealSprite?: boolean;
    usedPlaceholder?: boolean;
  }) {
    const candidatePaths = [
      '/data/pokex-items/items.json', // docker: ./data → /data
      path.join(process.cwd(), 'data', 'pokex-items', 'items.json'),
    ];
    const itemsPath = candidatePaths.find((p) => fs.existsSync(p));
    if (!itemsPath) {
      throw new NotFoundException(
        'Catálogo de itens indisponível (items.json não encontrado no servidor)',
      );
    }
    const raw = fs.readFileSync(itemsPath, 'utf8');
    const json = JSON.parse(raw) as {
      items: Array<{
        slug: string;
        name: string;
        icon: string;
        hasRealSprite?: boolean;
        usedPlaceholder?: boolean;
      }>;
    };

    const q = (params.q ?? '').trim().toLowerCase();
    let out = json.items;
    if (q) {
      out = out.filter(
        (i) =>
          i.name.toLowerCase().includes(q) || i.slug.toLowerCase().includes(q),
      );
    }
    if (params.hasRealSprite !== undefined) {
      out = out.filter(
        (i) => Boolean(i.hasRealSprite) === params.hasRealSprite,
      );
    }
    if (params.usedPlaceholder !== undefined) {
      out = out.filter(
        (i) => Boolean(i.usedPlaceholder) === params.usedPlaceholder,
      );
    }

    return out.slice(0, 500).map((i) => ({
      slug: i.slug,
      name: i.name,
      // Convenção: sprites ficam em `client/public/items/<slug>.png`
      defaultSpritePath: `/items/${i.slug}.png`,
      hasRealSprite: Boolean(i.hasRealSprite),
      usedPlaceholder: Boolean(i.usedPlaceholder),
    }));
  }

  listSprites(params: { q?: string }) {
    const candidateDirs = [
      '/public-items', // docker volume
      path.join(process.cwd(), 'client', 'public', 'items'),
      path.join(path.resolve(process.cwd(), '..'), 'client', 'public', 'items'),
    ];
    const dir = candidateDirs.find((d) => fs.existsSync(d));
    if (!dir) return [];
    const q = (params.q ?? '').trim().toLowerCase();

    const files = fs.readdirSync(dir, { withFileTypes: true });
    const paths = files
      .filter((d) => d.isFile())
      .map((d) => d.name)
      .filter((name) => /\.(png|gif|webp|jpg|jpeg)$/i.test(name))
      .map((name) => `/items/${name}`);

    const filtered = q
      ? paths.filter((p) => p.toLowerCase().includes(q))
      : paths;
    return filtered.slice(0, 1000);
  }
}
