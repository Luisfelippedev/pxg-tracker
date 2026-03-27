import { useChar } from "@/contexts/CharContext";
import { useDashboard, useChars } from "@/hooks/useTaskData";
import StatCard from "@/components/StatCard";
import ProgressBar from "@/components/ProgressBar";
import CharProgressMiniCard from "@/components/CharProgressMiniCard";
import { SkeletonCard } from "@/components/Skeletons";
import {
  ListChecks,
  CheckCircle2,
  TrendingUp,
  Users,
  CircleDollarSign,
} from "lucide-react";
import { NIGHTMARE_TERROR_PRESET_KEY } from "@/data/nightmareTerrorItems";
import { formatNpcDollars } from "@/lib/utils";
import EmptyState from "@/components/EmptyState";
import NoCharsEmptyState from "@/components/NoCharsEmptyState";

export default function DashboardPage() {
  const { selectedChar, setSelectedChar } = useChar();
  const { data: chars } = useChars();
  const { data, isLoading } = useDashboard(selectedChar?.id);
  const hasNoChars = chars && chars.length === 0;

  if (hasNoChars) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-display font-bold tracking-tight">Dashboard</h1>
        <NoCharsEmptyState context="para ver o progresso das tarefas" />
      </div>
    );
  }

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

  const selectedProgress = data?.charProgress.find((cp) => cp.charId === selectedChar.id);
  const otherCharsProgress = data?.charProgress.filter((cp) => cp.charId !== selectedChar.id) ?? [];
  const lootNpc = data?.weeklyLootNpcByPreset ?? {};
  const terrorNpc = lootNpc[NIGHTMARE_TERROR_PRESET_KEY] ?? 0;

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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Total de Tarefas" value={data.totalTasks} icon={ListChecks} />
            <StatCard title="Concluídas" value={data.completedTasks} icon={CheckCircle2} />
            <StatCard
              title="Progresso"
              value={`${data.completionPercentage}%`}
              subtitle="taxa de conclusão"
              icon={TrendingUp}
              accent
            />
            <StatCard
              title="NPC — Nightmare Terrors"
              value={formatNpcDollars(terrorNpc)}
              subtitle="semana atual (drops × preço NPC)"
              icon={CircleDollarSign}
            />
          </div>

          {selectedProgress && (
            <div className="rounded-xl border border-border gradient-card p-6 shadow-card">
              <h2 className="text-lg font-display font-bold mb-6 flex items-center gap-2">
                <div className="w-1 h-5 rounded-full gradient-primary" />
                Progresso de {selectedChar.name}
              </h2>
              <ProgressBar
                label={selectedChar.name}
                sublabel={`${selectedProgress.completed}/${selectedProgress.total} tarefas`}
                value={selectedProgress.percentage}
              />
            </div>
          )}

          {otherCharsProgress.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-base font-display font-bold flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                Visão geral dos outros chars
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {otherCharsProgress.map((cp) => (
                  <CharProgressMiniCard
                    key={cp.charId}
                    charId={cp.charId}
                    charName={cp.charName}
                    total={cp.total}
                    completed={cp.completed}
                    percentage={cp.percentage}
                    onSelect={setSelectedChar}
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
