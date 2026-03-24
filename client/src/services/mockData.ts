import {
  Char,
  TaskTemplate,
  TaskInstance,
  CharTemplate,
  PeriodSnapshot,
} from "@/types";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";

dayjs.extend(isoWeek);

export const mockChars: Char[] = [
  { id: "char-1", name: "Knight Main" },
  { id: "char-2", name: "Paladin Alt" },
  { id: "char-3", name: "Sorcerer PvP" },
];

export const mockTemplates: TaskTemplate[] = [
  { id: "tpl-1", name: "Boss Diário", frequency: "weekly" },
  { id: "tpl-2", name: "Quest de Clã", frequency: "weekly" },
  { id: "tpl-3", name: "Coleta de Recursos", frequency: "weekly" },
  { id: "tpl-4", name: "Evento Mensal", frequency: "monthly" },
  { id: "tpl-5", name: "Ranking PvP", frequency: "monthly" },
  { id: "tpl-6", name: "Missão de Exploração", frequency: "weekly" },
];

/** Quais templates cada char usa. Char 1 usa todos; chars 2 e 3 usam subconjuntos */
export const mockCharTemplates: CharTemplate[] = [
  { charId: "char-1", templateId: "tpl-1" },
  { charId: "char-1", templateId: "tpl-2" },
  { charId: "char-1", templateId: "tpl-3" },
  { charId: "char-1", templateId: "tpl-4" },
  { charId: "char-1", templateId: "tpl-5" },
  { charId: "char-1", templateId: "tpl-6" },
  { charId: "char-2", templateId: "tpl-1" },
  { charId: "char-2", templateId: "tpl-2" },
  { charId: "char-2", templateId: "tpl-4" },
  { charId: "char-3", templateId: "tpl-1" },
  { charId: "char-3", templateId: "tpl-5" },
  { charId: "char-3", templateId: "tpl-6" },
];

const now = dayjs();
const currentWeek = now.isoWeek();
const currentYear = now.isoWeekYear();
const currentMonth = now.month() + 1;
const currentMonthYear = now.year();

function generateInstances(): TaskInstance[] {
  const instances: TaskInstance[] = [];
  let idCounter = 1;

  mockChars.forEach((char) => {
    const enabledTemplates = mockCharTemplates
      .filter((ct) => ct.charId === char.id)
      .map((ct) => mockTemplates.find((t) => t.id === ct.templateId))
      .filter(Boolean) as TaskTemplate[];

    enabledTemplates.forEach((template) => {
      const done = template.frequency === "weekly" ? Math.random() > 0.5 : Math.random() > 0.6;
      if (template.frequency === "weekly") {
        instances.push({
          id: `inst-${idCounter++}`,
          charId: char.id,
          templateId: template.id,
          year: currentYear,
          period: currentWeek,
          done,
          completedAt: done ? now.subtract(Math.floor(Math.random() * 5), "day").toISOString() : null,
          notes: "",
        });
      } else {
        instances.push({
          id: `inst-${idCounter++}`,
          charId: char.id,
          templateId: template.id,
          year: currentMonthYear,
          period: currentMonth,
          done,
          completedAt: done ? now.subtract(Math.floor(Math.random() * 10), "day").toISOString() : null,
          notes: "",
        });
      }
    });
  });

  return instances;
}

/** Histórico de períodos passados (snapshots). Mock de semanas/meses anteriores */
function generatePeriodSnapshots(): PeriodSnapshot[] {
  const snapshots: PeriodSnapshot[] = [];
  let idCounter = 1;

  mockChars.forEach((char) => {
    const enabledTemplates = mockCharTemplates
      .filter((ct) => ct.charId === char.id)
      .map((ct) => mockTemplates.find((t) => t.id === ct.templateId))
      .filter(Boolean) as TaskTemplate[];

    const weeklyTemplates = enabledTemplates.filter((t) => t.frequency === "weekly");
    const monthlyTemplates = enabledTemplates.filter((t) => t.frequency === "monthly");

    for (let i = 1; i <= 4; i++) {
      const pastWeek = now.subtract(i, "week");
      const w = pastWeek.isoWeek();
      const y = pastWeek.isoWeekYear();
      const total = weeklyTemplates.length;
      const completed = Math.floor(Math.random() * (total + 1));

      snapshots.push({
        id: `snap-${idCounter++}`,
        charId: char.id,
        frequency: "weekly",
        year: y,
        period: w,
        totalTasks: total,
        completedTasks: completed,
        completedAt: pastWeek.endOf("isoWeek").toISOString(),
      });
    }

    for (let i = 1; i <= 2; i++) {
      const pastMonth = now.subtract(i, "month");
      const m = pastMonth.month() + 1;
      const y = pastMonth.year();
      const total = monthlyTemplates.length;
      const completed = Math.floor(Math.random() * (total + 1));

      snapshots.push({
        id: `snap-${idCounter++}`,
        charId: char.id,
        frequency: "monthly",
        year: y,
        period: m,
        totalTasks: total,
        completedTasks: completed,
        completedAt: pastMonth.endOf("month").toISOString(),
      });
    }
  });

  return snapshots;
}

export let mockInstances: TaskInstance[] = generateInstances();
export let mockPeriodSnapshots: PeriodSnapshot[] = generatePeriodSnapshots();

/** Regenera instâncias mock (simula reset ao mudar de semana/mês). Backend fará isso via job. */
export function resetMockInstances() {
  mockInstances = generateInstances();
}

export function getCurrentWeeklyPeriod() {
  return { year: currentYear, week: currentWeek };
}

export function getCurrentMonthlyPeriod() {
  return { year: currentMonthYear, month: currentMonth };
}
