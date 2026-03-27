import { useEffect, useMemo, useState } from "react";
import { useChar } from "@/contexts/CharContext";
import { useChars, useDropsSummary } from "@/hooks/useTaskData";
import { cn, formatNpcDollars } from "@/lib/utils";
import StatCard from "@/components/StatCard";
import { SkeletonCard } from "@/components/Skeletons";
import EmptyState from "@/components/EmptyState";
import NoCharsEmptyState from "@/components/NoCharsEmptyState";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  Trophy,
  BarChart2,
  Gem,
  Flame,
  Sparkles,
  PackageOpen,
  Calendar,
  CheckCircle2,
  Coins,
} from "lucide-react";
import { nightmareCycleIconsBySlug } from "@/data/nightmareTerrorItems";
import type { DropsPeriodHistory, LootSnapshotItem, TaskFrequency } from "@/types";

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ItemSprite({
  slug,
  src,
  size = "md",
}: {
  slug: string;
  src: string;
  size?: "sm" | "md" | "lg";
}) {
  const cycle = nightmareCycleIconsBySlug(slug);
  const frames = useMemo(
    () => (cycle?.length ? [...cycle] : src ? [src] : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slug, src],
  );
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setIdx(0);
  }, [slug, src]);

  useEffect(() => {
    if (frames.length < 2) return;
    const timer = window.setInterval(
      () => setIdx((p) => (p + 1) % frames.length),
      1_000,
    );
    return () => window.clearInterval(timer);
  }, [frames.length]);

  const containerCls =
    size === "sm"
      ? "h-7 w-7 rounded-md"
      : size === "lg"
        ? "h-14 w-14 rounded-xl"
        : "h-8 w-8 rounded-md";
  const imgCls =
    size === "sm"
      ? "h-5 w-5"
      : size === "lg"
        ? "h-10 w-10"
        : "h-6 w-6";

  return (
    <div
      className={cn(
        "flex items-center justify-center bg-muted/40 shrink-0",
        containerCls,
      )}
    >
      {frames.length > 0 ? (
        <img
          src={frames[idx]}
          alt=""
          className={cn("object-contain", imgCls)}
        />
      ) : (
        <PackageOpen className={cn("text-muted-foreground/40", imgCls)} />
      )}
    </div>
  );
}

function NpcItemsTable({ items }: { items: LootSnapshotItem[] }) {
  const sorted = useMemo(
    () => [...items].sort((a, b) => b.npcTotal - a.npcTotal),
    [items],
  );
  const total = useMemo(
    () => items.reduce((s, i) => s + i.npcTotal, 0),
    [items],
  );

  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border border-border overflow-hidden shadow-card">
      <div className="px-5 py-3 bg-primary/[0.06] border-b border-border flex items-center gap-2">
        <Coins className="h-4 w-4 text-primary" />
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-primary">
          Itens com Valor NPC
        </p>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-border/50 bg-muted/10">
            <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Item
            </th>
            <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Qtd
            </th>
            <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground hidden sm:table-cell">
              Preço/un
            </th>
            <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Total NPC
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((item) => (
            <tr
              key={item.slug}
              className="border-b border-border/30 last:border-0 hover:bg-primary/[0.02] transition-colors"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <ItemSprite slug={item.slug} src={item.spritePath} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {item.templateName}
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-right text-sm font-mono tabular-nums">
                {item.quantity.toLocaleString("pt-BR")}
              </td>
              <td className="px-4 py-3 text-right text-xs text-muted-foreground hidden sm:table-cell">
                {formatNpcDollars(item.npcUnitPrice)}
              </td>
              <td className="px-4 py-3 text-right">
                <span className="text-sm font-semibold text-primary">
                  {formatNpcDollars(item.npcTotal)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-primary/[0.04] border-t border-border">
            <td colSpan={4} className="px-4 py-3 text-right">
              <span className="text-xs text-muted-foreground mr-2">
                Total estimado:
              </span>
              <span className="text-base font-display font-bold text-primary">
                {formatNpcDollars(total)}
              </span>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function RareItemsShowcase({ items }: { items: LootSnapshotItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.03] overflow-hidden shadow-card">
      <div className="px-5 py-3 border-b border-amber-500/20 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-amber-400" />
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-amber-400">
          Itens Raros
        </p>
        <Badge
          variant="outline"
          className="ml-auto border-amber-500/20 text-amber-400 text-[10px]"
        >
          {items.length} {items.length === 1 ? "tipo" : "tipos"}
        </Badge>
      </div>
      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {items.map((item) => (
          <div
            key={item.slug}
            className="flex flex-col items-center gap-2.5 p-3 rounded-xl border border-amber-500/10 bg-amber-500/[0.04] hover:bg-amber-500/[0.08] hover:border-amber-500/20 transition-all duration-200"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/15">
              <ItemSprite slug={item.slug} src={item.spritePath} size="lg" />
            </div>
            <div className="text-center min-w-0 w-full space-y-0.5">
              <p
                className="text-xs font-medium text-foreground leading-tight line-clamp-2"
                title={item.name}
              >
                {item.name}
              </p>
              <p className="text-[11px] font-bold text-amber-400">
                ×{item.quantity.toLocaleString("pt-BR")}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HistoryList({
  history,
}: {
  history: DropsPeriodHistory[];
}) {
  if (history.length === 0) return null;

  return (
    <div className="rounded-xl border border-border overflow-hidden shadow-card gradient-card">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-muted/20">
            <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Período
            </th>
            <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              NPC Total
            </th>
            <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground hidden sm:table-cell">
              Raros
            </th>
            <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground hidden sm:table-cell">
              Conclusão
            </th>
          </tr>
        </thead>
        <tbody>
          {history.map((h) => (
            <tr
              key={`${h.year}-${h.period}`}
              className="border-b border-border/50 last:border-0 hover:bg-primary/[0.02] transition-colors"
            >
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                  <span className="text-sm font-medium">{h.label}</span>
                </div>
              </td>
              <td className="px-5 py-3.5 text-right">
                {h.npcTotal > 0 ? (
                  <span className="text-sm font-semibold text-primary">
                    {formatNpcDollars(h.npcTotal)}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-5 py-3.5 text-right hidden sm:table-cell">
                {h.rareItemCount > 0 ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400">
                    <Sparkles className="h-3 w-3" />
                    {h.rareItemCount}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-5 py-3.5 text-right hidden sm:table-cell">
                {h.totalTasks > 0 ? (
                  <span className="text-xs text-muted-foreground">
                    {h.completedTasks}/{h.totalTasks}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DropsPage() {
  const { selectedChar } = useChar();
  const { data: chars } = useChars();
  const [frequency, setFrequency] = useState<TaskFrequency>("weekly");
  const { data, isLoading } = useDropsSummary(
    selectedChar?.id ?? null,
    frequency,
  );

  const hasNoChars = chars && chars.length === 0;

  const { current, history, allTime } = data ?? {};

  const performance = useMemo(() => {
    const avg = allTime?.avgNpc ?? 0;
    const curr = current?.npcTotal ?? 0;
    if (avg === 0 || curr === 0) return null;
    const pct = Math.round(((curr - avg) / avg) * 100);
    return { pct, positive: pct >= 0 };
  }, [allTime?.avgNpc, current?.npcTotal]);

  // ------------------------------------------------------------------
  // Early returns
  // ------------------------------------------------------------------

  if (hasNoChars) {
    return (
      <div className="space-y-6">
        <PageTitle frequency={frequency} onFreqChange={setFrequency} />
        <NoCharsEmptyState context="para ver os drops" />
      </div>
    );
  }

  if (!selectedChar) {
    return (
      <div className="space-y-6">
        <PageTitle frequency={frequency} onFreqChange={setFrequency} />
        <EmptyState
          title="Selecione um char"
          description="Escolha um personagem na sidebar para ver os drops."
        />
      </div>
    );
  }

  const periodLabel = frequency === "weekly" ? "Esta Semana" : "Este Mês";
  const hasCurrentDrops =
    (current?.items.length ?? 0) > 0 || (current?.rareItems.length ?? 0) > 0;

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageTitle
        frequency={frequency}
        onFreqChange={setFrequency}
        charName={selectedChar.name}
      />

      {/* All-time stats */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="NPC Total (geral)"
            value={formatNpcDollars(allTime?.npcTotal ?? 0)}
            subtitle="soma de todos os períodos"
            icon={TrendingUp}
          />
          <StatCard
            title="Melhor Período"
            value={formatNpcDollars(allTime?.bestPeriodNpc ?? 0)}
            subtitle={allTime?.bestPeriodLabel ?? "—"}
            icon={Trophy}
            accent={!!(allTime?.bestPeriodNpc)}
          />
          <StatCard
            title="Média por Período"
            value={formatNpcDollars(allTime?.avgNpc ?? 0)}
            subtitle="baseado no histórico"
            icon={BarChart2}
          />
          <StatCard
            title="Raros Coletados"
            value={allTime?.rareItemsCollected ?? 0}
            subtitle="itens raros no total"
            icon={Gem}
          />
        </div>
      )}

      {/* Gamification indicators */}
      {!isLoading &&
        ((allTime?.streak ?? 0) > 1 || performance !== null) && (
          <div className="flex flex-wrap gap-2">
            {(allTime?.streak ?? 0) > 1 && (
              <div className="flex items-center gap-1.5 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1.5">
                <Flame className="h-3.5 w-3.5 text-orange-400" />
                <span className="text-xs font-semibold text-orange-400">
                  {allTime!.streak}{" "}
                  {frequency === "weekly" ? "semanas" : "meses"} seguidos com
                  drops
                </span>
              </div>
            )}
            {performance !== null && (
              <div
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5",
                  performance.positive
                    ? "border-emerald-500/20 bg-emerald-500/10"
                    : "border-amber-500/20 bg-amber-500/10",
                )}
              >
                {performance.positive ? (
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-amber-400" />
                )}
                <span
                  className={cn(
                    "text-xs font-semibold",
                    performance.positive
                      ? "text-emerald-400"
                      : "text-amber-400",
                  )}
                >
                  {performance.positive
                    ? `↑ ${performance.pct}% acima da média`
                    : `↓ ${Math.abs(performance.pct)}% abaixo da média`}
                </span>
              </div>
            )}
          </div>
        )}

      {/* Current period */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-display font-bold flex items-center gap-2.5">
            <div className="w-1 h-5 rounded-full gradient-primary" />
            {periodLabel}
            {current?.label && (
              <span className="text-muted-foreground font-normal text-sm">
                {current.label}
              </span>
            )}
          </h2>
          {(current?.completedLootTasks ?? 0) > 0 && (
            <Badge variant="secondary" className="gap-1.5 text-xs">
              <CheckCircle2 className="h-3 w-3" />
              {current!.completedLootTasks}{" "}
              {current!.completedLootTasks === 1
                ? "tarefa concluída"
                : "tarefas concluídas"}
            </Badge>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : hasCurrentDrops ? (
          <div className="space-y-4">
            <NpcItemsTable items={current!.items} />
            <RareItemsShowcase items={current!.rareItems} />
          </div>
        ) : (
          <div className="rounded-xl border border-border gradient-card p-10 text-center shadow-card">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/40 border border-border mx-auto mb-4">
              <PackageOpen className="h-7 w-7 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground">
              Nenhum drop registrado{" "}
              {frequency === "weekly" ? "nesta semana" : "neste mês"}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1.5 max-w-xs mx-auto">
              Complete tarefas de loot e registre seus drops para ver o
              balancete aqui
            </p>
          </div>
        )}
      </section>

      {/* History */}
      {!isLoading && (history?.length ?? 0) > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-display font-bold flex items-center gap-2.5">
            <div className="w-1 h-5 rounded-full bg-muted-foreground/30 rounded-full" />
            Histórico
            <span className="text-muted-foreground font-normal text-sm">
              {history!.length}{" "}
              {history!.length === 1 ? "período anterior" : "períodos anteriores"}
            </span>
          </h2>
          <HistoryList history={history!} />
        </section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page header
// ---------------------------------------------------------------------------

function PageTitle({
  frequency,
  onFreqChange,
  charName,
}: {
  frequency: TaskFrequency;
  onFreqChange: (f: TaskFrequency) => void;
  charName?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
            <Gem className="h-5 w-5 text-primary" />
          </div>
          Gestão de Drops
        </h1>
        {charName && (
          <p className="text-muted-foreground text-sm mt-1.5 pl-12">
            Drops de <strong>{charName}</strong>
          </p>
        )}
      </div>
      <Tabs
        value={frequency}
        onValueChange={(v) => onFreqChange(v as TaskFrequency)}
      >
        <TabsList>
          <TabsTrigger value="weekly">Semanal</TabsTrigger>
          <TabsTrigger value="monthly">Mensal</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
