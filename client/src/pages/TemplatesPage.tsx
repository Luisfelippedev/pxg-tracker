import { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Settings2, Plus, Trash2, ChevronDown } from "lucide-react";
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
  const [charTemplatesOpen, setCharTemplatesOpen] = useState(false);
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

  const enabledTemplateIds = new Set(
    charTemplates?.map((ct) => ct.templateId) ?? [],
  );

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

  const handleDelete = (id: string) => {
    deleteTemplate.mutate(id, {
      onSuccess: () => toast.success("Template removido!"),
    });
  };

  const handleToggleTemplate = (templateId: string, checked: boolean) => {
    if (!selectedChar) return;
    const newIds = checked
      ? [...enabledTemplateIds, templateId]
      : [...enabledTemplateIds].filter((id) => id !== templateId);
    setCharTemplates.mutate(
      { charId: selectedChar.id, templateIds: newIds },
      { onSuccess: () => toast.success("Templates atualizados!") },
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
            <Settings2 className="h-5 w-5 text-primary" />
          </div>
          Templates de Tarefas
        </h1>
        <p className="text-muted-foreground text-sm mt-1.5 pl-12">
          Crie templates e escolha quais usar em cada char
        </p>
      </div>

      {/* Templates por char */}
      <Collapsible open={charTemplatesOpen} onOpenChange={setCharTemplatesOpen}>
        <div className="rounded-xl border border-border gradient-card overflow-hidden shadow-card">
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors text-left">
              <span className="font-display font-bold">
                Templates por char{" "}
                {selectedChar ? `— ${selectedChar.name}` : ""}
              </span>
              <ChevronDown
                className={`h-5 w-5 text-muted-foreground transition-transform ${charTemplatesOpen ? "rotate-180" : ""}`}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-5 pb-5 pt-0">
              {!selectedChar ? (
                <p className="text-sm text-muted-foreground py-4">
                  Selecione um char na sidebar para configurar quais templates
                  ele usa.
                </p>
              ) : loadingCharTemplates ? (
                <SkeletonTable rows={3} />
              ) : (
                <div className="space-y-2">
                  {templates?.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={`tpl-${t.id}`}
                          checked={enabledTemplateIds.has(t.id)}
                          onCheckedChange={(checked) =>
                            handleToggleTemplate(t.id, checked === true)
                          }
                        />
                        <label
                          htmlFor={`tpl-${t.id}`}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {t.name}
                        </label>
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border ${
                            t.frequency === "weekly"
                              ? "bg-primary/8 text-primary border-primary/20"
                              : "bg-accent/10 text-accent border-accent/20"
                          }`}
                        >
                          {freqLabel(t.frequency)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {(!templates || templates.length === 0) && (
                    <p className="text-sm text-muted-foreground py-2">
                      Crie templates abaixo para habilitá-los por char.
                    </p>
                  )}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Lista global de templates + criar */}
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground font-semibold shadow-primary hover:opacity-90 transition-opacity">
              <Plus className="h-4 w-4 mr-1.5" />
              Novo Template
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
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
                <th className="px-5 py-3.5 text-right text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-border/50 last:border-0 transition-colors hover:bg-primary/[0.03]"
                >
                  <td className="px-5 py-3.5 text-sm font-medium">{t.name}</td>
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
                  <td className="px-5 py-3.5 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(t.id)}
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
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
