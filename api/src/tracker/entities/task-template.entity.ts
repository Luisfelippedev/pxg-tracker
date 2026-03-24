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

@Entity('task_templates')
@Unique(['userId', 'name'])
export class TaskTemplate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ type: 'varchar' })
  frequency!: TaskFrequency;

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
