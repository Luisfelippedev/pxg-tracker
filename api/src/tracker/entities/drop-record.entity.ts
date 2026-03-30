import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Char } from '../../chars/char.entity';

/**
 * DropRecord é a fonte primária de verdade para ganhos de loot.
 * Cada linha representa a quantidade de um item obtida em uma sessão de drops,
 * com atribuição direta ao mês/semana civil em que foi registrada.
 *
 * Isso desacopla drops de tarefas (TaskInstance) e resolve o problema de
 * atribuição por semana ISO versus mês civil.
 */
@Entity('drop_records')
@Index(['charId', 'calendarYear', 'calendarMonth'])
export class DropRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  charId!: string;

  /** Referência ao template do qual o drop veio (pode ser null se input manual no futuro) */
  @Column({ type: 'varchar', nullable: true })
  templateId!: string | null;

  /** Nome do template no momento do drop (desnormalizado para resiliência histórica) */
  @Column({ default: '' })
  templateName!: string;

  @Column()
  slug!: string;

  /** Nome do item no momento do drop (desnormalizado) */
  @Column()
  itemName!: string;

  /** Caminho do sprite no momento do drop (desnormalizado) */
  @Column({ default: '' })
  spritePath!: string;

  @Column({ type: 'int' })
  quantity!: number;

  /**
   * Preço unitário NPC em dólares.
   * 0 para itens raros (isRare=true).
   */
  @Column({ type: 'float' })
  npcUnitPrice!: number;

  /**
   * Total NPC = quantity × npcUnitPrice.
   * 0 para itens raros.
   */
  @Column({ type: 'float' })
  npcTotal!: number;

  @Column({ default: false })
  isRare!: boolean;

  /** Ano civil do drop (baseado na data real, não na semana ISO) */
  @Column({ type: 'int' })
  calendarYear!: number;

  /** Mês civil do drop (1-12), baseado na data real de conclusão */
  @Column({ type: 'int' })
  calendarMonth!: number;

  /** Semana ISO em que o drop ocorreu (para breakdown semanal dentro do mês) */
  @Column({ type: 'int' })
  calendarWeek!: number;

  /** Timestamp exato do drop */
  @Column({ type: 'timestamp' })
  droppedAt!: Date;

  /**
   * ID da TaskInstance que originou este drop.
   * Null para drops futuros de origem manual.
   */
  @Column({ type: 'varchar', nullable: true })
  sourceTaskInstanceId!: string | null;

  @ManyToOne(() => Char, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'charId' })
  char!: Char;
}
