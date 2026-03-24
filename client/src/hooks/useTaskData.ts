import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "@/services/api";
import { DashboardSummary, TaskFrequency, TaskInstanceEnriched } from "@/types";

export function useChars() {
  return useQuery({
    queryKey: ["chars"],
    queryFn: api.getChars,
    staleTime: 60_000,
  });
}

export function useCreateChar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createChar,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chars"] }),
  });
}

export function useUpdateChar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.updateChar(id, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chars"] }),
  });
}

export function useDeleteChar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteChar,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chars"] }),
  });
}

export function useDashboard(charId?: string) {
  return useQuery({
    queryKey: ["dashboard", charId],
    queryFn: () => api.getDashboardSummary(charId),
    staleTime: 30_000,
  });
}

export function useTemplates() {
  return useQuery({
    queryKey: ["templates"],
    queryFn: api.getTemplates,
    staleTime: 30_000,
  });
}

export function useCharTemplates(charId: string | null) {
  return useQuery({
    queryKey: ["char-templates", charId],
    queryFn: () => api.getCharTemplates(charId!),
    enabled: !!charId,
    staleTime: 30_000,
  });
}

export function useSetCharTemplates() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ charId, templateIds }: { charId: string; templateIds: string[] }) =>
      api.setCharTemplates(charId, templateIds),
    onSuccess: (_, { charId }) => {
      queryClient.invalidateQueries({ queryKey: ["char-templates", charId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export interface TaskInstancesFilters {
  frequency: TaskFrequency;
  charId: string | null;
}

export function useTaskInstances(filters: TaskInstancesFilters) {
  return useQuery({
    queryKey: ["tasks", filters],
    queryFn: () => api.getTaskInstances({ frequency: filters.frequency, charId: filters.charId! }),
    enabled: !!filters.charId,
    staleTime: 20_000,
  });
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) => api.updateTaskStatus(id, done),
    onMutate: async ({ id, done }) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      await queryClient.cancelQueries({ queryKey: ["dashboard"] });

      const previousTasks = queryClient.getQueriesData<TaskInstanceEnriched[]>({
        queryKey: ["tasks"],
      });
      const previousDashboards = queryClient.getQueriesData<DashboardSummary>({
        queryKey: ["dashboard"],
      });

      const nowIso = new Date().toISOString();

      for (const [key, current] of previousTasks) {
        if (!current) continue;
        const next = current.map((task) =>
          task.id === id
            ? { ...task, done, completedAt: done ? nowIso : null }
            : task,
        );
        queryClient.setQueryData(key, next);
      }

      const originalTask = previousTasks
        .flatMap(([, tasks]) => tasks ?? [])
        .find((task) => task.id === id);
      const previousDone = originalTask?.done;

      for (const [key, current] of previousDashboards) {
        if (!current) continue;
        if (previousDone === undefined || previousDone === done) continue;
        const delta = done ? 1 : -1;
        const total = current.totalTasks;
        const completed = current.completedTasks;
        const updatedCompleted = Math.max(0, Math.min(total, completed + delta));
        queryClient.setQueryData(key, {
          ...current,
          completedTasks: updatedCompleted,
          completionPercentage:
            total > 0 ? Math.round((updatedCompleted / total) * 100) : 0,
        });
      }

      return { previousTasks, previousDashboards };
    },
    onError: (_error, _variables, context) => {
      if (!context) return;
      for (const [key, data] of context.previousTasks) {
        queryClient.setQueryData(key, data);
      }
      for (const [key, data] of context.previousDashboards) {
        queryClient.setQueryData(key, data);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"], refetchType: "inactive" });
      queryClient.invalidateQueries({ queryKey: ["dashboard"], refetchType: "inactive" });
    },
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createTemplate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["templates"] }),
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<{ name: string; frequency: TaskFrequency }> }) =>
      api.updateTemplate(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["templates"] }),
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      queryClient.invalidateQueries({ queryKey: ["char-templates"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function usePeriodHistory(charId: string | null, frequency?: TaskFrequency) {
  return useQuery({
    queryKey: ["period-history", charId, frequency],
    queryFn: () => api.getPeriodHistory({ charId: charId!, frequency }),
    enabled: !!charId,
    staleTime: 30_000,
  });
}
