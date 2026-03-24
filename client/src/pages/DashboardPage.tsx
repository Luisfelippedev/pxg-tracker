import { useChar } from "@/contexts/CharContext";
import { useDashboard } from "@/hooks/useTaskData";
import StatCard from "@/components/StatCard";
import ProgressBar from "@/components/ProgressBar";
import { SkeletonCard } from "@/components/Skeletons";
import { ListChecks, CheckCircle2, TrendingUp } from "lucide-react";
import EmptyState from "@/components/EmptyState";

export default function DashboardPage() {
  const { selectedChar } = useChar();
  const { data, isLoading } = useDashboard(selectedChar?.id);

  if (!selectedChar) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-display font-bold tracking-tight">Dashboard</h1>
        <EmptyState
          title="Selecione um char"
          description="Escolha um personagem na sidebar para ver o progresso."
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Progresso de <strong>{selectedChar.name}</strong> na semana e mês atuais
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard title="Total de Tarefas" value={data.totalTasks} icon={ListChecks} />
            <StatCard title="Concluídas" value={data.completedTasks} icon={CheckCircle2} />
            <StatCard
              title="Progresso"
              value={`${data.completionPercentage}%`}
              subtitle="taxa de conclusão"
              icon={TrendingUp}
              accent
            />
          </div>

          {data.charProgress.length > 0 && (
            <div className="rounded-xl border border-border gradient-card p-6 shadow-card">
              <h2 className="text-lg font-display font-bold mb-6 flex items-center gap-2">
                <div className="w-1 h-5 rounded-full gradient-primary" />
                Progresso do Char
              </h2>
              <div className="space-y-5">
                {data.charProgress.map((cp) => (
                  <ProgressBar
                    key={cp.charId}
                    label={cp.charName}
                    sublabel={`${cp.completed}/${cp.total} tarefas`}
                    value={cp.percentage}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
