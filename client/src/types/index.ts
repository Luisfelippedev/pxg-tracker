/** Personagem/char do jogo PxgTracker */
export interface Char {
  id: string;
  name: string;
}

export type UserRole = "admin" | "user";

export type TaskFrequency = "weekly" | "monthly";

export type TaskTemplateKind = "standard" | "loot";

export interface TaskTemplate {
  id: string;
  name: string;
  frequency: TaskFrequency;
  kind: TaskTemplateKind;
  presetKey: string | null;
  scope?: "user" | "global";
}

export interface TemplateItem {
  id: string;
  templateId: string;
  itemSlug: string;
  itemName: string;
  spritePath: string;
  isRare: boolean;
  npcPriceDollars: number | null;
}

export interface GameItem {
  slug: string;
  name: string;
  defaultSpritePath: string;
  hasRealSprite: boolean;
  usedPlaceholder: boolean;
}

export interface TaskLootLine {
  slug: string;
  quantity: number;
  npcUnitPriceDollars: number;
}

/** Indica quais templates um char usa. Backend: char_template */
export interface CharTemplate {
  charId: string;
  templateId: string;
}

/** Período semanal: ano ISO + semana ISO (segunda a domingo) */
export interface WeeklyPeriod {
  year: number;
  week: number;
}

/** Período mensal: ano + mês (1-12) */
export interface MonthlyPeriod {
  year: number;
  month: number;
}

export interface TaskInstance {
  id: string;
  charId: string;
  templateId: string;
  /** Semanal: year+week ISO. Mensal: year, period = month */
  year: number;
  period: number; // week ISO (1-53) ou month (1-12)
  done: boolean;
  completedAt: string | null;
  notes: string;
  loot: TaskLootLine[] | null;
}

export interface TaskInstanceEnriched extends TaskInstance {
  charName: string;
  templateName: string;
  frequency: TaskFrequency;
  templateKind: TaskTemplateKind;
  presetKey: string | null;
}

export interface DashboardSummary {
  totalTasks: number;
  completedTasks: number;
  completionPercentage: number;
  /** Soma (qty × preço unitário NPC) por presetKey, período semanal atual do char */
  weeklyLootNpcByPreset: Record<string, number>;
  charProgress: Array<{
    charId: string;
    charName: string;
    total: number;
    completed: number;
    percentage: number;
  }>;
}

export interface AdminDashboardEntry {
  user: { id: string; email: string; role: UserRole };
  dashboard: DashboardSummary;
}

/** Snapshot de um período concluído para histórico. Backend: period_snapshot */
export interface PeriodSnapshot {
  id: string;
  charId: string;
  frequency: TaskFrequency;
  year: number;
  period: number; // week ISO ou month
  totalTasks: number;
  completedTasks: number;
  completedAt: string;
  lootData: LootSnapshotData | null;
}

// ---------------------------------------------------------------------------
// Drops / Loot Management
// ---------------------------------------------------------------------------

export interface LootSnapshotData {
  npcTotal: number;
  items: LootSnapshotItem[];
}

export interface LootSnapshotItem {
  slug: string;
  name: string;
  spritePath: string;
  quantity: number;
  /** Preço unitário NPC. 0 para itens raros. */
  npcUnitPrice: number;
  /** quantity × npcUnitPrice. 0 para itens raros. */
  npcTotal: number;
  isRare: boolean;
  templateName: string;
}

export interface DropsPeriodHistory {
  year: number;
  period: number;
  label: string;
  npcTotal: number;
  rareItemCount: number;
  completedTasks: number;
  totalTasks: number;
  items: LootSnapshotItem[];
}

export interface DropsSummary {
  frequency: TaskFrequency;
  current: {
    year: number;
    period: number;
    label: string;
    npcTotal: number;
    items: LootSnapshotItem[];
    rareItems: LootSnapshotItem[];
    completedLootTasks: number;
  };
  history: DropsPeriodHistory[];
  allTime: {
    npcTotal: number;
    rareItemsCollected: number;
    periodsWithDrops: number;
    bestPeriodNpc: number;
    bestPeriodLabel: string;
    avgNpc: number;
    streak: number;
  };
}

// ---------------------------------------------------------------------------
// Monthly Cycle (unified weekly + monthly by calendar month)
// ---------------------------------------------------------------------------

export interface WeeklyBreakdownEntry {
  year: number;
  week: number;
  weekLabel: string;
  npcTotal: number;
  items: LootSnapshotItem[];
  rareItems: LootSnapshotItem[];
}

export interface MonthlyHistoryEntry {
  year: number;
  month: number;
  label: string;
  npcTotal: number;
  rareItemCount: number;
  completedTasks: number;
  totalTasks: number;
  items: LootSnapshotItem[];
  weeks: Array<{
    year: number;
    week: number;
    weekLabel: string;
    npcTotal: number;
    rareItemCount: number;
  }>;
}

// ---------------------------------------------------------------------------
// Insights automáticos do ciclo ativo
// ---------------------------------------------------------------------------

export type CycleInsightType = 'best_week' | 'top_template' | 'vs_previous';

export interface CycleInsight {
  type: CycleInsightType;
  /** Rótulo da semana (best_week) */
  weekLabel?: string;
  /** Nome do template (top_template) */
  templateName?: string;
  /** 'up' | 'down' (vs_previous) */
  direction?: 'up' | 'down';
  /** NPC total (best_week/top_template) ou percentual absoluto (vs_previous) */
  value: number;
}

export interface MonthlyCycleSummary {
  currentCycle: {
    year: number;
    month: number;
    label: string;
    npcTotal: number;
    items: LootSnapshotItem[];
    rareItems: LootSnapshotItem[];
    completedLootTasks: number;
    weeklyBreakdown: WeeklyBreakdownEntry[];
    /** Percentual de dias decorridos no mês atual (1–100) */
    monthProgressPct: number;
  };
  history: MonthlyHistoryEntry[];
  allTime: {
    npcTotal: number;
    rareItemsCollected: number;
    periodsWithDrops: number;
    bestMonthNpc: number;
    bestMonthLabel: string;
    avgNpc: number;
    streak: number;
  };
  /** Insights automáticos gerados a partir dos dados do ciclo ativo */
  insights: CycleInsight[];
}

/** @deprecated Alias para compatibilidade - usar Char */
export type Account = Char;
