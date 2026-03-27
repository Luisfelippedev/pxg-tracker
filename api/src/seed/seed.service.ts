import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { IsNull, Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { CharTemplate } from '../tracker/entities/char-template.entity';
import { TaskInstance } from '../tracker/entities/task-instance.entity';
import { TaskTemplate } from '../tracker/entities/task-template.entity';
import { TemplateItem } from '../tracker/entities/template-item.entity';
import { NIGHTMARE_TERROR_PRESET_KEY } from '../tracker/tracker.service';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  private static readonly LEGACY_EMAIL = "admin@local";

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(TaskTemplate)
    private readonly templateRepository: Repository<TaskTemplate>,
    @InjectRepository(TemplateItem)
    private readonly templateItemRepository: Repository<TemplateItem>,
    @InjectRepository(CharTemplate)
    private readonly charTemplateRepository: Repository<CharTemplate>,
    @InjectRepository(TaskInstance)
    private readonly taskInstanceRepository: Repository<TaskInstance>,
  ) {}

  async onApplicationBootstrap() {
    await this.backfillMissingRoles();
    await this.ensureAdminUser();
    await this.ensureGlobalTerrorTemplate();
  }

  private async backfillMissingRoles() {
    // Backfill para bases antigas onde a coluna role pode não existir.
    await this.userRepository.update(
      { role: IsNull() },
      { role: 'user' } as Partial<User>,
    );
  }

  private async ensureAdminUser() {
    const rawEmail = this.configService.get<string>('ADMIN_EMAIL');
    const rawPassword = this.configService.get<string>('ADMIN_PASSWORD');

    const adminEmail =
      rawEmail && rawEmail.trim() ? rawEmail.trim() : 'admin@local.com';
    const adminPassword =
      rawPassword && rawPassword ? rawPassword : 'admin123';

    await this.ensureAdminUserForEmail(adminEmail, adminPassword);

    // Mantém compatibilidade com seeds antigas.
    if (adminEmail.trim().toLowerCase() !== SeedService.LEGACY_EMAIL.toLowerCase()) {
      const legacyEmailNormalized = SeedService.LEGACY_EMAIL.toLowerCase();
      const legacyExists = await this.userRepository.findOne({
        where: { email: legacyEmailNormalized },
      });
      if (legacyExists) {
        await this.ensureAdminUserForEmail(
          SeedService.LEGACY_EMAIL,
          adminPassword,
        );
      }
    }
  }

  private async ensureAdminUserForEmail(adminEmail: string, adminPassword: string) {
    const emailNormalized = adminEmail.trim().toLowerCase();

    const existing = await this.userRepository.findOne({
      where: { email: emailNormalized },
    });

    if (!existing) {
      this.logger.log(`Criando admin: ${emailNormalized}`);
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await this.userRepository.save(
        this.userRepository.create({
          email: emailNormalized,
          passwordHash,
          role: 'admin',
        }),
      );
      return;
    }

    let needsPasswordUpdate = false;
    if (existing.passwordHash) {
      // bcrypt precisa de compare para não ficar re-hash a cada boot.
      needsPasswordUpdate = !(await bcrypt.compare(adminPassword, existing.passwordHash));
    }

    if (existing.role !== 'admin' || needsPasswordUpdate) {
      this.logger.log(`Atualizando admin: ${emailNormalized}`);
      const passwordHash = needsPasswordUpdate
        ? await bcrypt.hash(adminPassword, 10)
        : existing.passwordHash;

      await this.userRepository.update(
        { id: existing.id },
        { passwordHash, role: 'admin' },
      );
    }
  }

  private async ensureGlobalTerrorTemplate() {
    // Garante que o preset "terror" exista uma vez e seja editável pelo admin.
    // Usa como owner o primeiro admin encontrado (ou cria um template sem depender de owner específico).
    const admin = await this.userRepository.findOne({
      where: { role: 'admin' },
      order: { createdAt: 'ASC' },
    });
    if (!admin) return;

    // Itens default do terror: começamos com os slugs atuais do client (sem acoplar aqui).
    // O admin poderá editar/expandir via módulo administrativo.
    const defaults: Array<{
      itemSlug: string;
      itemName: string;
      spritePath: string;
      isRare: boolean;
      npcPriceDollars: number | null;
    }> = [
      { itemSlug: 'star-dust', itemName: 'Star Dust', spritePath: '/items/star-dust.png', isRare: false, npcPriceDollars: 10_000 },
      { itemSlug: 'technological-crystal-tier-7', itemName: 'Technological Crystal (Tier: 7)', spritePath: '/items/technological-crystal-tier-7.png', isRare: true, npcPriceDollars: null },
      { itemSlug: 'technological-crystal-tier-8', itemName: 'Technological Crystal (Tier: 8)', spritePath: '/items/technological-crystal-tier-8.png', isRare: true, npcPriceDollars: null },
      { itemSlug: 'rough-gemstone', itemName: 'Rough Gemstone', spritePath: '/items/rough-gemstone.png', isRare: true, npcPriceDollars: null },
      { itemSlug: 'terror-shard', itemName: 'Shard de terror (qualquer cor)', spritePath: '/items/kermes-shard.png', isRare: false, npcPriceDollars: 150_000 },
      { itemSlug: 'terror-giant-exclusive', itemName: 'Giant / item exclusivo do terror', spritePath: '/items/giant-belt.png', isRare: false, npcPriceDollars: 1_000_000 },
      { itemSlug: 'cosmic-addons-recipe', itemName: 'Cosmic Addons Recipe', spritePath: '/items/cosmic-addons-recipe.png', isRare: true, npcPriceDollars: null },
      { itemSlug: 'yellow-star-piece', itemName: 'Yellow Star Piece', spritePath: '/items/yellow-star-piece.gif', isRare: true, npcPriceDollars: null },
      { itemSlug: 'red-star-piece', itemName: 'Red Star Piece', spritePath: '/items/red-star-piece.gif', isRare: true, npcPriceDollars: null },
      { itemSlug: 'green-star-piece', itemName: 'Green Star Piece', spritePath: '/items/green-star-piece.gif', isRare: true, npcPriceDollars: null },
      { itemSlug: 'tm-tank-random', itemName: 'TM Tank (qualquer boss)', spritePath: '/items/tm-tank-random.gif', isRare: true, npcPriceDollars: null },
      { itemSlug: 'tm-otdd-random', itemName: 'TM OTDD (qualquer boss)', spritePath: '/items/tm-otdd-random.gif', isRare: true, npcPriceDollars: null },
    ];

    let template = await this.templateRepository.findOne({
      where: { scope: 'global', presetKey: NIGHTMARE_TERROR_PRESET_KEY },
    });

    if (!template) {
      this.logger.log('Criando template global preset: nightmare_terror');
      template = await this.templateRepository.save(
        this.templateRepository.create({
          userId: admin.id,
          name: 'Nightmare World Terrors',
          frequency: 'weekly',
          kind: 'loot',
          presetKey: NIGHTMARE_TERROR_PRESET_KEY,
          scope: 'global',
        }),
      );
    } else {
      let changed = false;
      if (template.kind !== 'loot') {
        template.kind = 'loot';
        changed = true;
      }
      if (template.frequency !== 'weekly') {
        template.frequency = 'weekly';
        changed = true;
      }
      if (changed) {
        template = await this.templateRepository.save(template);
      }
    }

    const existingItems = await this.templateItemRepository.count({
      where: { templateId: template.id },
    });
    if (existingItems > 0) {
      await this.migrateLegacyTerrorTemplatesToGlobal(template.id);
      return;
    }

    await this.templateItemRepository.save(
      defaults.map((d) =>
        this.templateItemRepository.create({
          templateId: template.id,
          itemSlug: d.itemSlug,
          itemName: d.itemName,
          spritePath: d.spritePath,
          isRare: d.isRare,
          npcPriceDollars: d.npcPriceDollars,
        }),
      ),
    );

    await this.migrateLegacyTerrorTemplatesToGlobal(template.id);
  }

  private async migrateLegacyTerrorTemplatesToGlobal(globalTemplateId: string) {
    const legacyTemplates = await this.templateRepository.find({
      where: {
        scope: 'user',
        presetKey: NIGHTMARE_TERROR_PRESET_KEY,
      },
    });
    if (!legacyTemplates.length) return;

    for (const legacy of legacyTemplates) {
      // Reaponta ativações de chars para o template global.
      const links = await this.charTemplateRepository.find({
        where: { templateId: legacy.id },
      });
      for (const link of links) {
        const exists = await this.charTemplateRepository.findOne({
          where: { charId: link.charId, templateId: globalTemplateId },
        });
        if (!exists) {
          await this.charTemplateRepository.save(
            this.charTemplateRepository.create({
              charId: link.charId,
              templateId: globalTemplateId,
            }),
          );
        }
        await this.charTemplateRepository.delete({ id: link.id });
      }

      // Reaponta instâncias históricas/atuais para o template global.
      const instances = await this.taskInstanceRepository.find({
        where: { templateId: legacy.id },
      });
      for (const inst of instances) {
        const collision = await this.taskInstanceRepository.findOne({
          where: {
            charId: inst.charId,
            templateId: globalTemplateId,
            year: inst.year,
            period: inst.period,
          },
        });
        if (collision) {
          // Mantém a linha já global e remove duplicata legada.
          await this.taskInstanceRepository.delete({ id: inst.id });
        } else {
          inst.templateId = globalTemplateId;
          await this.taskInstanceRepository.save(inst);
        }
      }

      // Remove o template legado para evitar duplicidade na UI do usuário.
      await this.templateRepository.delete({ id: legacy.id });
      this.logger.log(
        `Migrado template legado "${legacy.name}" (${legacy.id}) para global`,
      );
    }
  }
}

