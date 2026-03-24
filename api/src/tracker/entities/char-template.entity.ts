import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Char } from '../../chars/char.entity';
import { TaskTemplate } from './task-template.entity';

@Entity('char_templates')
@Unique(['charId', 'templateId'])
export class CharTemplate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  charId!: string;

  @Column()
  templateId!: string;

  @ManyToOne(() => Char, (char) => char.charTemplates, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'charId' })
  char!: Char;

  @ManyToOne(() => TaskTemplate, (template) => template.charTemplates, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'templateId' })
  template!: TaskTemplate;
}
