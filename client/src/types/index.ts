/** Personagem/char do jogo PokéxGames */
export interface Char {
  id: string;
  name: string;
}

export type TaskFrequency = "weekly" | "monthly";

export interface TaskTemplate {
  id: string;
  name: string;
  frequency: TaskFrequency;
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
}

export interface TaskInstanceEnriched extends TaskInstance {
  charName: string;
  templateName: string;
  frequency: TaskFrequency;
}

export interface DashboardSummary {
  totalTasks: number;
  completedTasks: number;
  completionPercentage: number;
  charProgress: Array<{
    charId: string;
    charName: string;
    total: number;
    completed: number;
    percentage: number;
  }>;
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
}

/** @deprecated Alias para compatibilidade - usar Char */
export type Account = Char;
