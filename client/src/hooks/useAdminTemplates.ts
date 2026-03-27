import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/services/api";

export function useAdminGlobalTemplates() {
  return useQuery({
    queryKey: ["admin-global-templates"],
    queryFn: api.getAdminGlobalTemplates,
    staleTime: 10_000,
  });
}

export function useCreateAdminGlobalTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createAdminGlobalTemplate,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-global-templates"] }),
  });
}

export function useUpdateAdminGlobalTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof api.updateAdminGlobalTemplate>[1] }) =>
      api.updateAdminGlobalTemplate(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-global-templates"] }),
  });
}

export function useDeleteAdminGlobalTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteAdminGlobalTemplate,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-global-templates"] }),
  });
}

export function useAdminGlobalTemplateItems(templateId: string | null) {
  return useQuery({
    queryKey: ["admin-global-template-items", templateId],
    queryFn: () => {
      if (!templateId) throw new Error("templateId ausente");
      return api.getAdminGlobalTemplateItems(templateId);
    },
    enabled: Boolean(templateId),
    staleTime: 5_000,
  });
}

export function useReplaceAdminGlobalTemplateItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ templateId, items }: { templateId: string; items: Parameters<typeof api.replaceAdminGlobalTemplateItems>[1] }) =>
      api.replaceAdminGlobalTemplateItems(templateId, items),
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: ["admin-global-template-items", vars.templateId] }),
  });
}

