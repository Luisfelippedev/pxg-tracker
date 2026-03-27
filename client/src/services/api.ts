import axios from "axios";
import { authStore } from "@/stores/authStore";
import {
  Char,
  CharTemplate,
  DashboardSummary,
  AdminDashboardEntry,
  PeriodSnapshot,
  TaskFrequency,
  TaskInstance,
  TaskInstanceEnriched,
  TaskLootLine,
  TaskTemplate,
  TemplateItem,
  GameItem,
} from "@/types";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3000",
});

api.interceptors.request.use((config) => {
  const token = authStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const originalRequest = error.config;

    if (status !== 401 || originalRequest?._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (!refreshPromise) {
      refreshPromise = refreshToken()
        .then((tokens) => tokens.accessToken)
        .catch(() => null)
        .finally(() => {
          refreshPromise = null;
        });
    }

    const newToken = await refreshPromise;
    if (!newToken) {
      authStore.getState().clearSession();
      return Promise.reject(error);
    }

    originalRequest.headers.Authorization = `Bearer ${newToken}`;
    return api.request(originalRequest);
  },
);

export interface AuthResponse {
  user: { id: string; email: string; role: "admin" | "user" };
  accessToken: string;
  refreshToken: string;
}

export async function register(email: string, password: string) {
  const { data } = await api.post<AuthResponse>("/auth/register", { email, password });
  return data;
}

export async function login(email: string, password: string) {
  const { data } = await api.post<AuthResponse>("/auth/login", { email, password });
  return data;
}

export async function refreshToken() {
  const refreshTokenValue = authStore.getState().refreshToken;
  if (!refreshTokenValue) throw new Error("Sem refresh token");
  const { data } = await api.post<AuthResponse>("/auth/refresh", {
    refreshToken: refreshTokenValue,
  });
  authStore.getState().setSession(data);
  return data;
}

export async function getMe() {
  const { data } = await api.get<{ id: string; email: string; role: "admin" | "user" }>("/auth/me");
  return data;
}

export async function logout() {
  await api.post("/auth/logout");
}

// --- Chars ---
export async function getChars(): Promise<Char[]> {
  const { data } = await api.get<Char[]>("/chars");
  return data;
}

export async function createChar(name: string): Promise<Char> {
  const { data } = await api.post<Char>("/chars", { name });
  return data;
}

export async function updateChar(id: string, name: string): Promise<Char> {
  const { data } = await api.patch<Char>(`/chars/${id}`, { name });
  return data;
}

export async function deleteChar(id: string): Promise<void> {
  await api.delete(`/chars/${id}`);
}

// --- Templates ---
export async function getTemplates(): Promise<TaskTemplate[]> {
  const { data } = await api.get<TaskTemplate[]>("/templates");
  return data;
}

export async function createTemplate(data: {
  name: string;
  frequency: TaskFrequency;
}): Promise<TaskTemplate> {
  const response = await api.post<TaskTemplate>("/templates", data);
  return response.data;
}

export async function updateTemplate(
  id: string,
  data: Partial<Pick<TaskTemplate, "name" | "frequency">>,
): Promise<TaskTemplate> {
  const response = await api.patch<TaskTemplate>(`/templates/${id}`, data);
  return response.data;
}

export async function deleteTemplate(id: string): Promise<void> {
  await api.delete(`/templates/${id}`);
}

export async function getTemplateItems(templateId: string): Promise<TemplateItem[]> {
  const { data } = await api.get<TemplateItem[]>(`/templates/${templateId}/items`);
  return data;
}

// --- Char Templates (quais templates cada char usa) ---
export async function getCharTemplates(
  charId: string,
): Promise<CharTemplate[]> {
  const response = await api.get<CharTemplate[]>(`/chars/${charId}/templates`);
  return response.data;
}

export async function setCharTemplates(
  charId: string,
  templateIds: string[],
): Promise<CharTemplate[]> {
  const response = await api.put<CharTemplate[]>(`/chars/${charId}/templates`, {
    templateIds,
  });
  return response.data;
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
  const response = await api.get<TaskInstanceEnriched[]>("/tasks", { params });
  return response.data;
}

export async function updateTaskStatus(
  id: string,
  done: boolean,
  loot?: TaskLootLine[] | null,
): Promise<TaskInstance> {
  const body: { done: boolean; loot?: TaskLootLine[] | null } = { done };
  if (loot !== undefined) body.loot = loot;
  const response = await api.patch<TaskInstance>(`/tasks/${id}/status`, body);
  return response.data;
}

// --- Dashboard (por char ou resumo de todos) ---
export async function getDashboardSummary(
  charId?: string,
): Promise<DashboardSummary> {
  const response = await api.get<DashboardSummary>("/dashboard", {
    params: { charId },
  });
  return response.data;
}

// --- Admin ---
export async function getAdminDashboard(): Promise<AdminDashboardEntry[]> {
  const { data } = await api.get<AdminDashboardEntry[]>("/admin/dashboard");
  return data;
}

// --- Admin: Templates globais ---
export async function getAdminGlobalTemplates(): Promise<TaskTemplate[]> {
  const { data } = await api.get<TaskTemplate[]>("/admin/global-templates");
  return data;
}

export async function createAdminGlobalTemplate(body: {
  name: string;
  frequency: TaskFrequency;
  kind: "standard" | "loot";
  presetKey?: string | null;
}): Promise<TaskTemplate> {
  const { data } = await api.post<TaskTemplate>("/admin/global-templates", body);
  return data;
}

export async function updateAdminGlobalTemplate(
  id: string,
  body: {
    name: string;
    frequency: TaskFrequency;
    kind: "standard" | "loot";
    presetKey?: string | null;
  },
): Promise<TaskTemplate> {
  const { data } = await api.patch<TaskTemplate>(`/admin/global-templates/${id}`, body);
  return data;
}

export async function deleteAdminGlobalTemplate(id: string): Promise<{ success: true }> {
  const { data } = await api.delete<{ success: true }>(`/admin/global-templates/${id}`);
  return data;
}

export async function getAdminGlobalTemplateItems(templateId: string): Promise<TemplateItem[]> {
  const { data } = await api.get<TemplateItem[]>(`/admin/global-templates/${templateId}/items`);
  return data;
}

export async function replaceAdminGlobalTemplateItems(
  templateId: string,
  items: Array<{
    itemSlug: string;
    itemName: string;
    spritePath: string;
    isRare?: boolean;
    npcPriceDollars?: number | null;
  }>,
): Promise<TemplateItem[]> {
  const { data } = await api.post<TemplateItem[]>(
    `/admin/global-templates/${templateId}/items`,
    { items },
  );
  return data;
}

export async function adminListItems(params: {
  q?: string;
  hasRealSprite?: boolean;
  usedPlaceholder?: boolean;
}): Promise<GameItem[]> {
  const { data } = await api.get<GameItem[]>("/admin/items", { params });
  return data;
}

export async function adminListSprites(params: { q?: string }): Promise<string[]> {
  const { data } = await api.get<string[]>("/admin/sprites", { params });
  return data;
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
  const response = await api.get<PeriodSnapshot[]>("/history", { params });
  return response.data;
}
