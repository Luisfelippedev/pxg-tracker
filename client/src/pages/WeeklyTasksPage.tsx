import { useChar } from "@/contexts/CharContext";
import { useTaskInstances, useUpdateTaskStatus } from "@/hooks/useTaskData";
import { SkeletonTable } from "@/components/Skeletons";
import EmptyState from "@/components/EmptyState";
import { Switch } from "@/components/ui/switch";
import { CalendarDays } from "lucide-react";
import dayjs from "dayjs";
import { getCurrentIsoWeekRange } from "@/services/periods";

export default function WeeklyTasksPage() {
  const { selectedChar } = useChar();
  const { data: tasks, isLoading, isFetching } = useTaskInstances({
    frequency: "weekly",
    charId: selectedChar?.id ?? null,
  });
  const updateStatus = useUpdateTaskStatus();

  const { weekStart, weekEnd, week: currentWeek } = getCurrentIsoWeekRange();

  if (!selectedChar) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-display font-bold tracking-tight flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
            <CalendarDays className="h-5 w-5 text-primary" />
          </div>
          Tarefas Semanais
        </h1>
        <EmptyState
          title="Selecione um char"
          description="Escolha um personagem na sidebar para gerenciar as tarefas semanais."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
            <CalendarDays className="h-5 w-5 text-primary" />
          </div>
          Tarefas Semanais
        </h1>
        <p className="text-muted-foreground text-sm mt-1.5 pl-12">
          Semana atual: {weekStart.format("DD/MM")} – {weekEnd.format("DD/MM")} (S{currentWeek})
        </p>
      </div>

      {isLoading ? (
        <SkeletonTable />
      ) : !tasks || tasks.length === 0 ? (
        <EmptyState
          title="Sem tarefas semanais"
          description="Nenhuma tarefa semanal configurada para este char. Adicione templates em Templates → por char."
        />
      ) : (
        <div className={`rounded-xl border border-border overflow-hidden shadow-card gradient-card transition-opacity ${isFetching ? "opacity-80" : "opacity-100"}`}>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Tarefa</th>
                <th className="px-5 py-3.5 text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Concluída</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Data</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id} className={`border-b border-border/50 last:border-0 transition-colors hover:bg-primary/[0.03] ${task.done ? "opacity-60" : ""}`}>
                  <td className="px-5 py-3.5 text-sm font-medium">{task.templateName}</td>
                  <td className="px-5 py-3.5 text-center">
                    <Switch
                      checked={task.done}
                      onCheckedChange={(checked) => updateStatus.mutate({ id: task.id, done: checked })}
                      disabled={updateStatus.isPending}
                    />
                  </td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">
                    {task.completedAt ? dayjs(task.completedAt).format("DD/MM/YYYY") : "—"}
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
