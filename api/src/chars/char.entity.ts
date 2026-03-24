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
import { User } from '../users/user.entity';
import { CharTemplate } from '../tracker/entities/char-template.entity';
import { TaskInstance } from '../tracker/entities/task-instance.entity';
import { PeriodSnapshot } from '../tracker/entities/period-snapshot.entity';

@Entity('chars')
@Unique(['userId', 'name'])
export class Char {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column()
  userId!: string;

  @ManyToOne(() => User, (user) => user.chars, { onDelete: 'CASCADE' })
  user!: User;

  @OneToMany(() => CharTemplate, (charTemplate) => charTemplate.char)
  charTemplates!: CharTemplate[];

  @OneToMany(() => TaskInstance, (task) => task.char)
  tasks!: TaskInstance[];

  @OneToMany(() => PeriodSnapshot, (snapshot) => snapshot.char)
  snapshots!: PeriodSnapshot[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
