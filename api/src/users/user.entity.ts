import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Char } from '../chars/char.entity';
import { TaskTemplate } from '../tracker/entities/task-template.entity';

export type UserRole = 'admin' | 'user';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  passwordHash!: string;

  @Column({ type: 'varchar', default: 'user', nullable: true })
  role!: UserRole | null;

  @Column({ type: 'text', nullable: true })
  refreshTokenHash!: string | null;

  @OneToMany(() => Char, (char) => char.user)
  chars!: Char[];

  @OneToMany(() => TaskTemplate, (template) => template.user)
  templates!: TaskTemplate[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
