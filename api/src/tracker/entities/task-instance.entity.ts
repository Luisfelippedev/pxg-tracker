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

@Entity('task_instances')
@Unique(['charId', 'templateId', 'year', 'period'])
export class TaskInstance {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  charId!: string;

  @Column()
  templateId!: string;

  @Column({ type: 'int' })
  year!: number;

  @Column({ type: 'int' })
  period!: number;

  @Column({ default: false })
  done!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  completedAt!: Date | null;

  @Column({ default: '' })
  notes!: string;

  @ManyToOne(() => Char, (char) => char.tasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'charId' })
  char!: Char;

  @ManyToOne(() => TaskTemplate, (template) => template.tasks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'templateId' })
  template!: TaskTemplate;
}
