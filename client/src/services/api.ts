import {
  Char,
  TaskTemplate,
  TaskInstance,
  TaskInstanceEnriched,
  CharTemplate,
  DashboardSummary,
  PeriodSnapshot,
} from "@/types";
import {
  mockChars,
  mockTemplates,
  mockInstances,
  mockCharTemplates,
  mockPeriodSnapshots,
  getCurrentWeeklyPeriod,
  getCurrentMonthlyPeriod,
} from "./mockData";

function ensureInstancesForChar(charId: string) {
  const { year, week } = getCurrentWeeklyPeriod();
  const { year: mYear, month } = getCurrentMonthlyPeriod();
  const enabled = mockCharTemplates
    .filter((ct) => ct.charId === charId)
    .map((ct) => ct.templateId);
  let idCounter =
    Math.max(
      0,
      ...mockInstances.map((i) => parseInt(i.id.replace(/\D/g, ""), 10) || 0),
    ) + 1;

  mockTemplates.forEach((template) => {
    if (!enabled.includes(template.id)) return;
    if (template.frequency === "weekly") {
      const exists = mockInstances.some(
        (i) =>
          i.charId === charId &&
          i.templateId === template.id &&
          i.year === year &&
          i.period === week,
      );
      if (!exists) {
        mockInstances.push({
          id: `inst-${idCounter++}`,
          charId,
          templateId: template.id,
          year,
          period: week,
          done: false,
          completedAt: null,
          notes: "",
        });
      }
    } else {
      const exists = mockInstances.some(
        (i) =>
          i.charId === charId &&
          i.templateId === template.id &&
          i.year === mYear &&
          i.period === month,
      );
      if (!exists) {
        mockInstances.push({
          id: `inst-${idCounter++}`,
          charId,
          templateId: template.id,
          year: mYear,
          period: month,
          done: false,
          completedAt: null,
          notes: "",
        });
      }
    }
  });
}
import dayjs from "dayjs";

const delay = (ms = 400) =>
  new Promise((r) => setTimeout(r, ms + Math.random() * 200));

// --- Chars ---
export async function getChars(): Promise<Char[]> {
  await delay();
  return [...mockChars];
}

// --- Templates ---
export async function getTemplates(): Promise<TaskTemplate[]> {
  await delay();
  return [...mockTemplates];
}

export async function createTemplate(
  data: Omit<TaskTemplate, "id">,
): Promise<TaskTemplate> {
  await delay(300);
  const template: TaskTemplate = { ...data, id: `tpl-${Date.now()}` };
  mockTemplates.push(template);
  return template;
}

export async function updateTemplate(
  id: string,
  data: Partial<TaskTemplate>,
): Promise<TaskTemplate> {
  await delay(300);
  const idx = mockTemplates.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error("Template não encontrado");
  mockTemplates[idx] = { ...mockTemplates[idx], ...data };
  return mockTemplates[idx];
}

export async function deleteTemplate(id: string): Promise<void> {
  await delay(300);
  const idx = mockTemplates.findIndex((t) => t.id === id);
  if (idx !== -1) mockTemplates.splice(idx, 1);
}

// --- Char Templates (quais templates cada char usa) ---
export async function getCharTemplates(
  charId: string,
): Promise<CharTemplate[]> {
  await delay();
  return mockCharTemplates.filter((ct) => ct.charId === charId);
}

export async function setCharTemplates(
  charId: string,
  templateIds: string[],
): Promise<CharTemplate[]> {
  await delay(300);
  const filtered = mockCharTemplates.filter((ct) => ct.charId !== charId);
  templateIds.forEach((templateId) => filtered.push({ charId, templateId }));
  mockCharTemplates.length = 0;
  mockCharTemplates.push(...filtered);
  return mockCharTemplates.filter((ct) => ct.charId === charId);
}

// --- Task Instances ---
export interface GetTaskInstancesParams {
  frequency?: "weekly" | "monthly";
  charId: string; // obrigatório: sempre um char por vez
  year?: number;
  week?: number;
  month?: number;
}

export async function getTaskInstances(
  params: GetTaskInstancesParams,
): Promise<TaskInstanceEnriched[]> {
  await delay();
  const { charId, frequency } = params;

  ensureInstancesForChar(charId);

  let filtered = mockInstances.filter((t) => t.charId === charId);

  if (frequency) {
    const templateIds = mockTemplates
      .filter((t) => t.frequency === frequency)
      .map((t) => t.id);
    filtered = filtered.filter((t) => templateIds.includes(t.templateId));
  }

  const templates = mockTemplates;
  if (frequency === "weekly") {
    const { year, week } = getCurrentWeeklyPeriod();
    filtered = filtered.filter((t) => t.year === year && t.period === week);
  } else if (frequency === "monthly") {
    const { year, month } = getCurrentMonthlyPeriod();
    filtered = filtered.filter((t) => t.year === year && t.period === month);
  }

  return filtered.map((inst) => {
    const char = mockChars.find((c) => c.id === inst.charId);
    const template = templates.find((t) => t.id === inst.templateId);
    return {
      ...inst,
      charName: char?.name ?? "Desconhecido",
      templateName: template?.name ?? "Desconhecido",
      frequency: (template?.frequency ?? "weekly") as "weekly" | "monthly",
    };
  });
}

export async function updateTaskStatus(
  id: string,
  done: boolean,
): Promise<TaskInstance> {
  await delay(200);
  const idx = mockInstances.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error("Tarefa não encontrada");
  mockInstances[idx] = {
    ...mockInstances[idx],
    done,
    completedAt: done ? dayjs().toISOString() : null,
  };
  return mockInstances[idx];
}

// --- Dashboard (por char ou resumo de todos) ---
export async function getDashboardSummary(
  charId?: string,
): Promise<DashboardSummary> {
  await delay();

  const { year, week } = getCurrentWeeklyPeriod();
  const { year: mYear, month } = getCurrentMonthlyPeriod();

  const currentInstances = mockInstances.filter((t) => {
    if (charId && t.charId !== charId) return false;
    if (
      mockTemplates.find((tp) => tp.id === t.templateId)?.frequency === "weekly"
    ) {
      return t.year === year && t.period === week;
    }
    return t.year === mYear && t.period === month;
  });

  const total = currentInstances.length;
  const completed = currentInstances.filter((t) => t.done).length;

  const charsToShow = charId
    ? mockChars.filter((c) => c.id === charId)
    : mockChars;
  const charProgress = charsToShow.map((char) => {
    const charTasks = currentInstances.filter((t) => t.charId === char.id);
    const charCompleted = charTasks.filter((t) => t.done).length;
    return {
      charId: char.id,
      charName: char.name,
      total: charTasks.length,
      completed: charCompleted,
      percentage:
        charTasks.length > 0
          ? Math.round((charCompleted / charTasks.length) * 100)
          : 0,
    };
  });

  return {
    totalTasks: total,
    completedTasks: completed,
    completionPercentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    charProgress,
  };
}

// --- Histórico de períodos ---
export interface GetPeriodHistoryParams {
  charId: string;
  frequency?: "weekly" | "monthly";
  limit?: number;
}

export async function getPeriodHistory(
  params: GetPeriodHistoryParams,
): Promise<PeriodSnapshot[]> {
  await delay();
  const { charId, frequency, limit = 20 } = params;

  let filtered = mockPeriodSnapshots.filter((s) => s.charId === charId);
  if (frequency) {
    filtered = filtered.filter((s) => s.frequency === frequency);
  }

  filtered.sort(
    (a, b) =>
      new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
  );
  return filtered.slice(0, limit);
}
