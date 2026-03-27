import { useEffect, useMemo, useState } from "react";
import { useChar } from "@/contexts/CharContext";
import {
  useTemplates,
  useCreateTemplate,
  useDeleteTemplate,
  useCharTemplates,
  useSetCharTemplates,
} from "@/hooks/useTaskData";
import { SkeletonTable } from "@/components/Skeletons";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Settings2, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { TaskFrequency } from "@/types";
import { toast } from "sonner";

const templateSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  frequency: z.enum(["weekly", "monthly"]),
});

type TemplateForm = z.infer<typeof templateSchema>;

const freqLabel = (f: TaskFrequency) => (f === "weekly" ? "Semanal" : "Mensal");

export default function TemplatesPage() {
  const [open, setOpen] = useState(false);
  const [confirmTemplateClose, setConfirmTemplateClose] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<{ id: string; name: string } | null>(null);
  const [draftTemplateIds, setDraftTemplateIds] = useState<string[]>([]);
  const { selectedChar } = useChar();
  const { data: templates, isLoading } = useTemplates();
  const { data: charTemplates, isLoading: loadingCharTemplates } =
    useCharTemplates(selectedChar?.id ?? null);
  const createTemplate = useCreateTemplate();
  const deleteTemplate = useDeleteTemplate();
  const setCharTemplates = useSetCharTemplates();

  const form = useForm<TemplateForm>({
    resolver: zodResolver(templateSchema),
    defaultValues: { name: "", frequency: "weekly" },
  });

  const enabledTemplateIds = useMemo(
    () => (charTemplates?.map((ct) => ct.templateId) ?? []).sort(),
    [charTemplates],
  );
  const sortedTemplates = useMemo(() => {
    if (!templates?.length) return [];
    return [...templates].sort((a, b) => {
      const aIsPredefined = Boolean(a.presetKey) || a.scope === "global";
      const bIsPredefined = Boolean(b.presetKey) || b.scope === "global";
      if (aIsPredefined !== bIsPredefined) return aIsPredefined ? 1 : -1;
      return a.name.localeCompare(b.name, "pt-BR");
    });
  }, [templates]);
  const draftEnabledSet = useMemo(
    () => new Set(draftTemplateIds),
    [draftTemplateIds],
  );
  const isDirty = useMemo(() => {
    if (draftTemplateIds.length !== enabledTemplateIds.length) return true;
    return draftTemplateIds.some((id) => !enabledTemplateIds.includes(id));
  }, [draftTemplateIds, enabledTemplateIds]);

  useEffect(() => {
    setDraftTemplateIds(enabledTemplateIds);
  }, [enabledTemplateIds, selectedChar?.id]);

  const onSubmit = (data: TemplateForm) => {
    createTemplate.mutate(
      { name: data.name, frequency: data.frequency },
      {
        onSuccess: () => {
          toast.success("Template criado com sucesso!");
          form.reset();
          setOpen(false);
        },
      },
    );
  };

  const handleDelete = (id: string, name: string, presetKey: string | null) => {
    if (presetKey) {
      toast.error("Templates pré-definidos não podem ser excluídos.");
      return;
    }
    setTemplateToDelete({ id, name });
  };

  const handleConfirmDeleteTemplate = () => {
    if (!templateToDelete) return;
    deleteTemplate.mutate(templateToDelete.id, {
      onSuccess: () => {
        toast.success("Template removido!");
        setTemplateToDelete(null);
      },
      onError: () => {
        toast.error("Não foi possível excluir o template.");
      },
    });
  };

  const handleToggleTemplate = (templateId: string, checked: boolean) => {
    setDraftTemplateIds((prev) => {
      const set = new Set(prev);
      if (checked) {
        set.add(templateId);
      } else {
        set.delete(templateId);
      }
      return [...set].sort();
    });
  };

  const handleSave = () => {
    if (!selectedChar) return;
    setCharTemplates.mutate(
      { charId: selectedChar.id, templateIds: draftTemplateIds },
      { onSuccess: () => toast.success("Templates ativos salvos!") },
    );
  };

  const handleReset = () => {
    setDraftTemplateIds(enabledTemplateIds);
    toast.info("Alterações locais redefinidas.");
  };

  return (
    <div className="space-y-6">
      <AlertDialog
        open={!!templateToDelete}
        onOpenChange={(open) => !open && setTemplateToDelete(null)}
      >
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              Excluir template?
            </AlertDialogTitle>
            <AlertDialogDescription>
              O template &quot;{templateToDelete?.name}&quot; será removido permanentemente. Isso o
              removerá de todos os chars que o utilizam. O histórico de tarefas já concluídas pode
              ser afetado. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDeleteTemplate();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
            <Settings2 className="h-5 w-5 text-primary" />
          </div>
          Templates de Tarefas
        </h1>
        <p className="text-muted-foreground text-sm mt-1.5 pl-12">
          Catálogo global de templates. Marque "Ativo" para incluir no char selecionado.
        </p>
      </div>

      {/* Lista global de templates + criar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!selectedChar || !isDirty || setCharTemplates.isPending}
            onClick={handleReset}
          >
            Redefinir
          </Button>
          <Button
            type="button"
            disabled={!selectedChar || !isDirty || setCharTemplates.isPending}
            onClick={handleSave}
            className="gradient-primary text-primary-foreground font-semibold shadow-primary"
          >
            Salvar
          </Button>
        </div>
        <AlertDialog open={confirmTemplateClose} onOpenChange={setConfirmTemplateClose}>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-display">Fechar sem salvar?</AlertDialogTitle>
              <AlertDialogDescription>
                As informações preenchidas serão perdidas.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Continuar editando</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setConfirmTemplateClose(false);
                  setOpen(false);
                  form.reset();
                }}
              >
                Fechar mesmo assim
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog
          open={open}
          onOpenChange={(o) => {
            if (!o) {
              setConfirmTemplateClose(true);
            } else {
              setOpen(true);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground font-semibold shadow-primary hover:opacity-90 transition-opacity">
              <Plus className="h-4 w-4 mr-1.5" />
              Novo Template
            </Button>
          </DialogTrigger>
          <DialogContent
            className="bg-card border-border"
            onInteractOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => { e.preventDefault(); setConfirmTemplateClose(true); }}
          >
            <DialogHeader>
              <DialogTitle className="font-display text-xl">
                Criar Template
              </DialogTitle>
            </DialogHeader>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 pt-2"
            >
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome</label>
                <Input
                  {...form.register("name")}
                  placeholder="Ex: Boss Diário"
                  className="bg-muted border-border"
                />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Frequência</label>
                <Select
                  value={form.watch("frequency")}
                  onValueChange={(v) =>
                    form.setValue("frequency", v as TaskFrequency)
                  }
                >
                  <SelectTrigger className="bg-muted border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="submit"
                className="w-full gradient-primary text-primary-foreground font-semibold shadow-primary"
              >
                Criar
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <SkeletonTable rows={4} />
      ) : !templates || templates.length === 0 ? (
        <EmptyState
          title="Sem templates"
          description="Crie seu primeiro template de tarefa."
        />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden shadow-card gradient-card">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  Nome
                </th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  Frequência
                </th>
                <th className="px-5 py-3.5 text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  {selectedChar ? `Ativo (${selectedChar.name})` : "Ativo"}
                </th>
                <th className="px-5 py-3.5 text-right text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedTemplates.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-border/50 last:border-0 transition-colors hover:bg-primary/[0.03]"
                >
                  <td className="px-5 py-3.5 text-sm font-medium">
                    <div className="flex flex-wrap items-center gap-2">
                      {t.name}
                      {(t.presetKey || t.scope === "global") && (
                        <Badge variant="outline" className="text-[10px] font-normal">
                          Pré-definido
                        </Badge>
                      )}
                      {t.kind === "loot" && (
                        <Badge variant="secondary" className="text-[10px] font-normal">
                          Loot
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium border ${
                        t.frequency === "weekly"
                          ? "bg-primary/8 text-primary border-primary/20"
                          : "bg-accent/10 text-accent border-accent/20"
                      }`}
                    >
                      {freqLabel(t.frequency)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <div className="flex justify-center">
                      <Switch
                        checked={draftEnabledSet.has(t.id)}
                        disabled={!selectedChar || loadingCharTemplates}
                        onCheckedChange={(checked) =>
                          handleToggleTemplate(t.id, checked)
                        }
                      />
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!!t.presetKey || t.scope === "global"}
                      title={
                        t.presetKey
                          ? "Template do sistema"
                          : t.scope === "global"
                            ? "Template global (somente leitura)"
                            : "Excluir template"
                      }
                      onClick={() => handleDelete(t.id, t.name, t.presetKey)}
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
