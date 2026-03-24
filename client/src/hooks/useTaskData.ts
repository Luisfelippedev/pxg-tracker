import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "@/services/api";
import { TaskFrequency } from "@/types";

export function useChars() {
  return useQuery({
    queryKey: ["chars"],
    queryFn: api.getChars,
  });
}

export function useDashboard(charId?: string) {
  return useQuery({
    queryKey: ["dashboard", charId],
    queryFn: () => api.getDashboardSummary(charId),
  });
}

export function useTemplates() {
  return useQuery({
    queryKey: ["templates"],
    queryFn: api.getTemplates,
  });
}

export function useCharTemplates(charId: string | null) {
  return useQuery({
    queryKey: ["char-templates", charId],
    queryFn: () => api.getCharTemplates(charId!),
    enabled: !!charId,
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
  });
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) => api.updateTaskStatus(id, done),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
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
  });
}
