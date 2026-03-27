import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';
import { CharTemplate } from './char-template.entity';
import { TaskInstance } from './task-instance.entity';

export type TaskFrequency = 'weekly' | 'monthly';

export type TaskTemplateKind = 'standard' | 'loot';

export type TaskTemplateScope = 'user' | 'global';

@Entity('task_templates')
@Unique(['userId', 'name'])
export class TaskTemplate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ type: 'varchar' })
  frequency!: TaskFrequency;

  @Column({ type: 'varchar', default: 'standard' })
  kind!: TaskTemplateKind;

  /** Ex.: nightmare_terror — template criado automaticamente para o usuário */
  @Column({ type: 'varchar', nullable: true })
  presetKey!: string | null;

  /** `global` = disponível para todos; `user` = privado do usuário */
  @Column({ type: 'varchar', default: 'user' })
  scope!: TaskTemplateScope;

  @Column()
  userId!: string;

  @ManyToOne(() => User, (user) => user.templates, { onDelete: 'CASCADE' })
  user!: User;

  @OneToMany(() => CharTemplate, (charTemplate) => charTemplate.template)
  charTemplates!: CharTemplate[];

  @OneToMany(() => TaskInstance, (task) => task.template)
  tasks!: TaskInstance[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
