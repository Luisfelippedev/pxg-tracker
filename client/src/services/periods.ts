/**
 * Lógica de períodos para o PokéxGames Tracker.
 * Backend deve implementar:
 * - Reset semanal: toda segunda-feira (início do dia)
 * - Reset mensal: todo dia 1 do mês
 *
 * Semana usa ISO 8601 (segunda a domingo).
 * Ao mudar de semana/mês, o backend deve:
 * 1. Salvar snapshot do período anterior em period_snapshot
 * 2. Criar novas TaskInstances para o período atual
 */

import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";

dayjs.extend(isoWeek);

export function getCurrentWeekISO() {
  return { year: dayjs().isoWeekYear(), week: dayjs().isoWeek() };
}

export function getCurrentMonth() {
  return { year: dayjs().year(), month: dayjs().month() + 1 };
}

/**
 * Intervalo da semana ISO atual (segunda–domingo).
 * Não use `dayjs().isoWeekYear(x).isoWeek(y)` — isoWeekYear() retorna número, não dayjs.
 */
export function getCurrentIsoWeekRange() {
  const weekStart = dayjs().startOf("isoWeek");
  const weekEnd = weekStart.add(6, "day");
  return {
    weekStart,
    weekEnd,
    week: dayjs().isoWeek(),
    year: dayjs().isoWeekYear(),
  };
}

/**
 * Intervalo de uma semana ISO específica (para histórico / labels).
 * A semana 1 do ano ISO sempre contém 4 de janeiro.
 */
export function getIsoWeekRange(isoYear: number, isoWeek: number) {
  const weekStart = dayjs(`${isoYear}-01-04`).startOf("isoWeek").add(isoWeek - 1, "week");
  const weekEnd = weekStart.add(6, "day");
  return { weekStart, weekEnd };
}
