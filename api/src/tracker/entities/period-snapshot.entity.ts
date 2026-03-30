import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Char } from '../../chars/char.entity';
import { LootSnapshotData } from './loot-snapshot.types';

@Entity('period_snapshots')
export class PeriodSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  charId!: string;

  @Column({ type: 'varchar' })
  frequency!: 'weekly' | 'monthly';

  @Column({ type: 'int' })
  year!: number;

  @Column({ type: 'int' })
  period!: number;

  @Column({ type: 'int' })
  totalTasks!: number;

  @Column({ type: 'int' })
  completedTasks!: number;

  @Column({ type: 'timestamp' })
  completedAt!: Date;

  @Column({ type: 'jsonb', nullable: true })
  lootData!: LootSnapshotData | null;

  /**
   * Quando true, este snapshot mensal foi criado pela lógica unificada que usa
   * DropRecord como fonte. Isso evita dupla contagem ao mesclar snapshots
   * semanais e mensais no histórico.
   */
  @Column({ default: false })
  isUnified!: boolean;

  @ManyToOne(() => Char, (char) => char.snapshots, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'charId' })
  char!: Char;
}
