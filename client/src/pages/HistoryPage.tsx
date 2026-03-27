import { useState } from "react";
import { useChar } from "@/contexts/CharContext";
import { useChars, usePeriodHistory } from "@/hooks/useTaskData";
import { SkeletonCard, SkeletonTable } from "@/components/Skeletons";
import StatCard from "@/components/StatCard";
import EmptyState from "@/components/EmptyState";
import NoCharsEmptyState from "@/components/NoCharsEmptyState";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  History,
  CalendarDays,
  CalendarRange,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  Target,
  Flame,
  BarChart3,
  Lightbulb,
  Award,
} from "lucide-react";
import { getIsoWeekRange } from "@/services/periods";
import { PeriodSnapshot } from "@/types";

const monthNames = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

function formatPeriodLabel(snap: Pick<PeriodSnapshot, "frequency" | "year" | "period">) {
  if (snap.frequency === "weekly") {
    const { weekStart, weekEnd } = getIsoWeekRange(snap.year, snap.period);
    return `S${snap.period} (${weekStart.format("DD/MM")} – ${weekEnd.format("DD/MM")})`;
  }
  return `${monthNames[snap.period - 1]}/${snap.year}`;
}

function formatPeriodShort(snap: Pick<PeriodSnapshot, "frequency" | "year" | "period">) {
  if (snap.frequency === "weekly") return `S${snap.period}`;
  return monthNames[snap.period - 1];
}

function calcPct(completed: number, total: number): number {
  return total > 0 ? Math.round((completed / total) * 100) : 0;
}

function pctTextColor(pct: number): string {
  if (pct === 100) return "text-emerald-400";
  if (pct >= 75) return "text-yellow-400";
  if (pct >= 50) return "text-orange-400";
  return "text-red-400";
}

function pctBarColor(pct: number): string {
  if (pct === 100) return "bg-emerald-500";
  if (pct >= 75) return "bg-yellow-500";
  if (pct >= 50) return "bg-orange-500";
  return "bg-red-500";
}

function formatNpc(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${value}`;
}

// ---------------------------------------------------------------------------
// Overview Cards
// ---------------------------------------------------------------------------

function OverviewCards({ history }: { history: PeriodSnapshot[] }) {
  const pcts = history.map((s) => calcPct(s.completedTasks, s.totalTasks));
  const totalPeriods = history.length;
  const avgPct =
    pcts.length > 0
      ? Math.round(pcts.reduce((s, p) => s + p, 0) / pcts.length)
      : 0;
  const perfectPeriods = pcts.filter((p) => p === 100).length;
  const bestPct = pcts.length > 0 ? Math.max(...pcts) : 0;
  const bestIdx = pcts.indexOf(bestPct);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard title="Períodos Registrados" value={totalPeriods} icon={BarChart3} />
      <StatCard
        title="Média de Conclusão"
        value={`${avgPct}%`}
        subtitle="por período"
        icon={TrendingUp}
      />
      <StatCard
        title="Períodos Perfeitos"
        value={perfectPeriods}
        subtitle="com 100% concluído"
        icon={CheckCircle2}
      />
      <StatCard
        title="Melhor Período"
        value={`${bestPct}%`}
        subtitle={bestIdx >= 0 ? formatPeriodShort(history[bestIdx]) : "-"}
        icon={Award}
        accent
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Performance Timeline
// ---------------------------------------------------------------------------

function PerformanceTimeline({ history }: { history: PeriodSnapshot[] }) {
  // Exibe últimos 20 períodos: mais antigo à esquerda, mais recente à direita
  const displayed = [...history].reverse().slice(-20);
  if (displayed.length < 2) return null;

  return (
    <div className="rounded-xl border border-border gradient-card p-6 shadow-card">
      <h2 className="text-base font-display font-bold mb-5 flex items-center gap-2">
        <div className="w-1 h-5 rounded-full gradient-primary" />
        Timeline de Desempenho
        <span className="text-xs text-muted-foreground font-normal ml-auto">
          Últimos {displayed.length} períodos
        </span>
      </h2>

      <div className="flex items-end gap-1.5" style={{ height: "120px" }}>
        {displayed.map((snap) => {
          const pct = calcPct(snap.completedTasks, snap.totalTasks);
          const heightPct = Math.max(5, pct);
          return (
            <div
              key={snap.id}
              className="group flex flex-col items-center justify-end flex-1 min-w-0 h-full gap-0"
              title={`${formatPeriodLabel(snap)}: ${pct}%`}
            >
              <span className="text-[9px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity font-mono leading-none mb-1">
                {pct}%
              </span>
              <div
                className={`w-full rounded-t-sm transition-all duration-200 ${pctBarColor(pct)} opacity-75 group-hover:opacity-100`}
                style={{ height: `${heightPct}%` }}
              />
              <span className="text-[9px] text-muted-foreground truncate w-full text-center mt-1 leading-none">
                {formatPeriodShort(snap)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-5 text-[10px] text-muted-foreground border-t border-border/50 pt-3">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-500" />
          100%
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-yellow-500" />
          75%+
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-orange-500" />
          50%+
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-500" />
          &lt;50%
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Insights Panel
// ---------------------------------------------------------------------------

function InsightsPanel({ history }: { history: PeriodSnapshot[] }) {
  if (history.length < 2) return null;

  const pcts = history.map((s) => calcPct(s.completedTasks, s.totalTasks));
  const avgPct = Math.round(pcts.reduce((s, p) => s + p, 0) / pcts.length);
  const perfectCount = pcts.filter((p) => p === 100).length;

  const maxPct = Math.max(...pcts);
  const bestIdx = pcts.indexOf(maxPct);

  // Streak: períodos consecutivos com >= 50% (do mais recente para o mais antigo)
  let streak = 0;
  for (const pct of pcts) {
    if (pct >= 50) streak++;
    else break;
  }

  // Tendência: últimos 4 vs 4 anteriores
  let trendText = "";
  let TrendIcon = Minus;
  let trendClass = "text-muted-foreground";
  if (pcts.length >= 5) {
    const recent4Avg = pcts.slice(0, 4).reduce((s, p) => s + p, 0) / 4;
    const prev4 = pcts.slice(4, 8);
    if (prev4.length >= 2) {
      const prev4Avg = prev4.reduce((s, p) => s + p, 0) / prev4.length;
      const diff = recent4Avg - prev4Avg;
      if (diff > 5) {
        trendText = `Tendência de alta: últimos 4 períodos ${Math.abs(diff).toFixed(0)}pp acima dos anteriores.`;
        TrendIcon = TrendingUp;
        trendClass = "text-emerald-400";
      } else if (diff < -5) {
        trendText = `Tendência de queda: últimos 4 períodos ${Math.abs(diff).toFixed(0)}pp abaixo dos anteriores.`;
        TrendIcon = TrendingDown;
        trendClass = "text-red-400";
      } else {
        trendText = "Desempenho estável nos últimos períodos.";
        TrendIcon = Minus;
        trendClass = "text-muted-foreground";
      }
    }
  }

  const insights: Array<{
    icon: React.ElementType;
    iconClass: string;
    text: string;
  }> = [
    {
      icon: Award,
      iconClass: "text-yellow-400",
      text: `Melhor período: ${formatPeriodLabel(history[bestIdx])} com ${maxPct}% de conclusão.`,
    },
    ...(streak >= 3
      ? [
          {
            icon: Flame,
            iconClass: "text-orange-400",
            text: `Sequência ativa: ${streak} períodos consecutivos com 50%+ concluído.`,
          },
        ]
      : []),
    ...(perfectCount > 0
      ? [
          {
            icon: CheckCircle2,
            iconClass: "text-emerald-400",
            text: `${perfectCount} ${perfectCount === 1 ? "período perfeito" : "períodos perfeitos"} (100%) de ${history.length} registrados.`,
          },
        ]
      : []),
    ...(trendText ? [{ icon: TrendIcon, iconClass: trendClass, text: trendText }] : []),
    {
      icon: Target,
      iconClass: "text-primary",
      text: `Média geral de conclusão: ${avgPct}% ao longo de ${history.length} períodos.`,
    },
  ];

  return (
    <div className="rounded-xl border border-border gradient-card p-6 shadow-card">
      <h2 className="text-base font-display font-bold mb-4 flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-yellow-400" />
        Insights
      </h2>
      <div className="space-y-3">
        {insights.map((insight, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted/50 border border-border mt-0.5">
              <insight.icon className={`h-3.5 w-3.5 ${insight.iconClass}`} />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{insight.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Enhanced History Table
// ---------------------------------------------------------------------------

function EnhancedHistoryTable({ history }: { history: PeriodSnapshot[] }) {
  const hasNpcData = history.some((s) => (s.lootData?.npcTotal ?? 0) > 0);

  return (
    <div className="rounded-xl border border-border overflow-hidden shadow-card gradient-card">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-muted/20">
            <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Período
            </th>
            <th className="px-5 py-3.5 text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Progresso
            </th>
            <th className="px-4 py-3.5 text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              %
            </th>
            {hasNpcData && (
              <th className="px-5 py-3.5 text-right text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                NPC Total
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {history.map((snap) => {
            const pct = calcPct(snap.completedTasks, snap.totalTasks);
            const npc = snap.lootData?.npcTotal ?? 0;
            return (
              <tr
                key={snap.id}
                className="border-b border-border/50 last:border-0 hover:bg-primary/[0.03]"
              >
                <td className="px-5 py-3 text-sm font-medium">{formatPeriodLabel(snap)}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2 justify-center">
                    <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${pctBarColor(pct)}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums w-12 text-right">
                      {snap.completedTasks}/{snap.totalTasks}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-mono font-semibold ${pctTextColor(pct)}`}
                  >
                    {pct}%
                  </span>
                </td>
                {hasNpcData && (
                  <td className="px-5 py-3 text-right text-sm font-mono text-muted-foreground">
                    {npc > 0 ? formatNpc(npc) : "–"}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Content wrapper (one per tab)
// ---------------------------------------------------------------------------

function HistoryContent({
  snapshots,
  isLoading,
  freqLabel,
}: {
  snapshots: PeriodSnapshot[] | undefined;
  isLoading: boolean;
  freqLabel: string;
}) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <SkeletonTable rows={6} />
      </div>
    );
  }

  if (!snapshots || snapshots.length === 0) {
    return (
      <EmptyState
        title={`Sem histórico de ${freqLabel}`}
        description="Complete um período de tarefas para que ele apareça aqui."
      />
    );
  }

  return (
    <div className="space-y-6">
      <OverviewCards history={snapshots} />
      <PerformanceTimeline history={snapshots} />
      <InsightsPanel history={snapshots} />
      <EnhancedHistoryTable history={snapshots} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HistoryPage() {
  const { selectedChar } = useChar();
  const { data: chars } = useChars();
  const [freqTab, setFreqTab] = useState<"weekly" | "monthly">("weekly");

  const { data: history, isLoading } = usePeriodHistory(
    selectedChar?.id ?? null,
    freqTab,
  );

  const hasNoChars = chars && chars.length === 0;

  const pageHeader = (
    <div>
      <h1 className="text-3xl font-display font-bold tracking-tight flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
          <History className="h-5 w-5 text-primary" />
        </div>
        Histórico
      </h1>
      <p className="text-muted-foreground text-sm mt-1.5 pl-12">
        Desempenho e evolução por período
      </p>
    </div>
  );

  if (hasNoChars) {
    return (
      <div className="space-y-6">
        {pageHeader}
        <NoCharsEmptyState context="para ver o histórico" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {pageHeader}

      {!selectedChar ? (
        <EmptyState
          title="Selecione um char"
          description="Escolha um personagem para ver o histórico."
        />
      ) : (
        <Tabs
          value={freqTab}
          onValueChange={(v) => setFreqTab(v as "weekly" | "monthly")}
        >
          <TabsList className="grid w-full max-w-xs grid-cols-2">
            <TabsTrigger value="weekly" className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Semanais
            </TabsTrigger>
            <TabsTrigger value="monthly" className="flex items-center gap-2">
              <CalendarRange className="h-4 w-4" />
              Mensais
            </TabsTrigger>
          </TabsList>

          <TabsContent value="weekly" className="mt-6">
            <HistoryContent
              snapshots={history}
              isLoading={isLoading}
              freqLabel="semanais"
            />
          </TabsContent>
          <TabsContent value="monthly" className="mt-6">
            <HistoryContent
              snapshots={history}
              isLoading={isLoading}
              freqLabel="mensais"
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
