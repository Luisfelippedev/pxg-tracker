import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TaskTemplate } from './task-template.entity';

@Entity('template_items')
@Index(['templateId', 'itemSlug'], { unique: true })
export class TemplateItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  templateId!: string;

  /** Slug do item do jogo (catálogo). */
  @Column({ type: 'varchar' })
  itemSlug!: string;

  /** Nome do item no momento da criação (para resiliência). */
  @Column({ type: 'varchar' })
  itemName!: string;

  /** Path para sprite no client `public/` (ex: `/items/absolite.png`). */
  @Column({ type: 'varchar' })
  spritePath!: string;

  /** Se true, não pode ter valor NPC. */
  @Column({ type: 'boolean', default: false })
  isRare!: boolean;

  /** Valor NPC unitário (em dollars). Se setado, isRare deve ser false. */
  @Column({ type: 'int', nullable: true })
  npcPriceDollars!: number | null;

  @ManyToOne(() => TaskTemplate, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'templateId' })
  template!: TaskTemplate;
}

