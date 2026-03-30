import { useEffect, useMemo, useRef, useState } from "react";
import { useChar } from "@/contexts/CharContext";
import { useChars, useMonthlyCycle } from "@/hooks/useTaskData";
import { cn, formatNpcDollars } from "@/lib/utils";
import StatCard from "@/components/StatCard";
import { SkeletonCard } from "@/components/Skeletons";
import EmptyState from "@/components/EmptyState";
import NoCharsEmptyState from "@/components/NoCharsEmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Coins,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Filter,
} from "lucide-react";
import { nightmareCycleIconsBySlug } from "@/data/nightmareTerrorItems";
import type {
  CycleInsight,
  LootSnapshotItem,
  MonthlyHistoryEntry,
  MonthlyCycleSummary,
  WeeklyBreakdownEntry,
} from "@/types";

// ---------------------------------------------------------------------------
// ItemSprite
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

  useEffect(() => setIdx(0), [slug, src]);
  useEffect(() => {
    if (frames.length < 2) return;
    const t = window.setInterval(
      () => setIdx((p) => (p + 1) % frames.length),
      1_000,
    );
    return () => window.clearInterval(t);
  }, [frames.length]);

  const containerCls =
    size === "sm"
      ? "h-7 w-7 rounded-md"
      : size === "lg"
        ? "h-14 w-14 rounded-xl"
        : "h-8 w-8 rounded-md";
  const imgCls =
    size === "sm" ? "h-5 w-5" : size === "lg" ? "h-10 w-10" : "h-6 w-6";

  return (
    <div
      className={cn(
        "flex items-center justify-center bg-muted/40 shrink-0",
        containerCls,
      )}
    >
      {frames[idx] ? (
        <img
          src={frames[idx]}
          alt={slug}
          className={cn("object-contain pixelated", imgCls)}
          draggable={false}
        />
      ) : (
        <Gem className={cn("text-muted-foreground/30", imgCls)} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ActiveCycleHero — header proeminente para o ciclo ativo
// ---------------------------------------------------------------------------

function ActiveCycleHero({
  cycle,
  vsInsight,
  streak,
}: {
  cycle: MonthlyCycleSummary["currentCycle"];
  vsInsight?: CycleInsight;
  streak: number;
}) {
  return (
    <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.07] via-background to-primary/[0.03] p-6 shadow-card">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        {/* Left: label + total */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
              Ciclo Ativo
            </span>
            <Badge className="text-[9px] px-1.5 py-0 h-4 bg-emerald-500/15 text-emerald-400 border-emerald-500/25 font-semibold">
              {cycle.label}
            </Badge>
          </div>
          <div className="text-4xl sm:text-5xl font-display font-black text-primary tabular-nums leading-none">
            {formatNpcDollars(cycle.npcTotal)}
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {vsInsight && (
              <div
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1",
                  vsInsight.direction === "up"
                    ? "border-emerald-500/20 bg-emerald-500/10"
                    : "border-amber-500/20 bg-amber-500/10",
                )}
              >
                {vsInsight.direction === "up" ? (
                  <TrendingUp className="h-3 w-3 text-emerald-400" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-amber-400" />
                )}
                <span
                  className={cn(
                    "text-[11px] font-semibold",
                    vsInsight.direction === "up"
                      ? "text-emerald-400"
                      : "text-amber-400",
                  )}
                >
                  {vsInsight.direction === "up" ? "+" : "-"}
                  {vsInsight.value}% vs mês anterior
                </span>
              </div>
            )}
            {streak > 1 && (
              <div className="flex items-center gap-1.5 rounded-full border border-orange-500/20 bg-orange-500/10 px-2.5 py-1">
                <Flame className="h-3 w-3 text-orange-400" />
                <span className="text-[11px] font-semibold text-orange-400">
                  {streak} meses seguidos
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right: month progress ring */}
        <div className="flex flex-col items-center gap-1.5 shrink-0">
          <div className="relative h-20 w-20">
            <svg
              viewBox="0 0 36 36"
              className="h-20 w-20"
              style={{ transform: "rotate(-90deg)" }}
            >
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                strokeWidth="2"
                className="stroke-muted/40"
              />
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="stroke-primary"
                style={{
                  strokeDasharray: `${(cycle.monthProgressPct / 100) * 94.2} 94.2`,
                  transition: "stroke-dasharray 0.7s ease",
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-base font-black tabular-nums text-foreground leading-none">
                {cycle.monthProgressPct}%
              </span>
              <span className="text-[9px] text-muted-foreground font-medium leading-tight mt-0.5">
                do mês
              </span>
            </div>
          </div>
          <span className="text-[10px] text-muted-foreground/60 text-center">
            progresso
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// InsightsPanel
// ---------------------------------------------------------------------------

function InsightsPanel({ insights }: { insights: CycleInsight[] }) {
  if (insights.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {insights.map((insight, i) => {
        if (insight.type === "best_week") {
          return (
            <div
              key={i}
              className="flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1.5"
            >
              <Calendar className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-xs font-semibold text-blue-400">
                Melhor semana:{" "}
                <span className="font-black">{insight.weekLabel}</span>
                {" • "}
                {formatNpcDollars(insight.value)}
              </span>
            </div>
          );
        }
        if (insight.type === "top_template") {
          return (
            <div
              key={i}
              className="flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1.5"
            >
              <PackageOpen className="h-3.5 w-3.5 text-violet-400" />
              <span className="text-xs font-semibold text-violet-400">
                Top conteúdo:{" "}
                <span className="font-black">{insight.templateName}</span>
                {" • "}
                {formatNpcDollars(insight.value)}
              </span>
            </div>
          );
        }
        if (insight.type === "vs_previous") {
          return (
            <div
              key={i}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5",
                insight.direction === "up"
                  ? "border-emerald-500/20 bg-emerald-500/10"
                  : "border-red-500/20 bg-red-500/10",
              )}
            >
              {insight.direction === "up" ? (
                <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-red-400" />
              )}
              <span
                className={cn(
                  "text-xs font-semibold",
                  insight.direction === "up" ? "text-emerald-400" : "text-red-400",
                )}
              >
                {insight.direction === "up" ? "+" : "-"}
                {insight.value}% vs mês anterior
              </span>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// WeeklyChart — evolução por semana dentro do ciclo
// ---------------------------------------------------------------------------

function WeeklyChart({
  weeks,
}: {
  weeks: Array<{ week: number; weekLabel: string; npcTotal: number; rareItems: LootSnapshotItem[] }>;
}) {
  const active = weeks.filter((w) => w.npcTotal > 0);
  if (active.length === 0) return null;

  const maxNpc = Math.max(...active.map((w) => w.npcTotal));

  return (
    <div className="rounded-xl border border-border overflow-hidden shadow-card gradient-card">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border/50">
        <BarChart2 className="h-4 w-4 text-muted-foreground/70" />
        <span className="text-sm font-semibold">Evolução por Semana</span>
        <Badge variant="outline" className="text-[10px] ml-auto">
          {active.length} semana{active.length === 1 ? "" : "s"}
        </Badge>
      </div>

      <div className="px-5 py-4 space-y-4">
        {active.map((w) => {
          const barPct = maxNpc > 0 ? Math.round((w.npcTotal / maxNpc) * 100) : 0;
          const rareCount = w.rareItems.reduce((s, i) => s + i.quantity, 0);
          const isBest = w.npcTotal === maxNpc && active.length > 1;

          return (
            <div key={`${w.week}`} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-foreground/80 w-16 tabular-nums">
                    {w.weekLabel}
                  </span>
                  {isBest && (
                    <Badge className="text-[9px] px-1.5 py-0 h-4 bg-primary/15 text-primary border-primary/25">
                      melhor
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {rareCount > 0 && (
                    <span className="flex items-center gap-0.5 text-amber-400 font-medium">
                      <Sparkles className="h-3 w-3" />
                      {rareCount}
                    </span>
                  )}
                  <span className="font-semibold text-primary tabular-nums">
                    {formatNpcDollars(w.npcTotal)}
                  </span>
                </div>
              </div>
              <div className="h-3 w-full rounded-full bg-muted/40 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700",
                    isBest ? "bg-primary" : "bg-primary/50",
                  )}
                  style={{ width: `${barPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RareItemsShowcase
// ---------------------------------------------------------------------------

function RareItemsShowcase({ items }: { items: LootSnapshotItem[] }) {
  if (items.length === 0) return null;

  const totalRares = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.04] overflow-hidden shadow-card">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-amber-500/20">
        <Sparkles className="h-4 w-4 text-amber-400" />
        <span className="text-sm font-semibold text-amber-400/90">
          Vitrine de Raros
        </span>
        <Badge className="text-[9px] px-1.5 py-0 h-4 bg-amber-500/15 text-amber-400 border-amber-500/25 ml-auto font-semibold">
          {totalRares} obtido{totalRares === 1 ? "" : "s"}
        </Badge>
      </div>
      <div className="px-5 py-4">
        <div className="flex flex-wrap gap-3">
          {items.map((item) => (
            <div
              key={item.slug}
              className="flex items-center gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.07] px-3.5 py-3 hover:bg-amber-500/[0.12] transition-colors"
            >
              <ItemSprite slug={item.slug} src={item.spritePath} size="lg" />
              <div className="min-w-0">
                <div className="text-sm font-bold text-amber-200 leading-tight">
                  {item.name}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs font-black text-amber-400">
                    ×{item.quantity}
                  </span>
                  {item.templateName && (
                    <span className="text-[10px] text-muted-foreground/50 truncate max-w-[80px]">
                      {item.templateName}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NpcItemsTable
// ---------------------------------------------------------------------------

function NpcItemsTable({ items }: { items: LootSnapshotItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border border-border overflow-hidden shadow-card gradient-card">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-muted/20">
            <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Item
            </th>
            <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground hidden sm:table-cell">
              Qtd
            </th>
            <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              NPC Total
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.slug}
              className="border-b border-border/50 last:border-0 hover:bg-primary/[0.02]"
            >
              <td className="px-5 py-3">
                <div className="flex items-center gap-2.5">
                  <ItemSprite slug={item.slug} src={item.spritePath} size="sm" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground/90 truncate">
                      {item.name}
                    </div>
                    {item.templateName && (
                      <div className="text-[10px] text-muted-foreground/50">
                        {item.templateName}
                      </div>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-5 py-3 text-right text-sm text-muted-foreground hidden sm:table-cell">
                ×{item.quantity}
              </td>
              <td className="px-5 py-3 text-right">
                <span className="text-sm font-semibold tabular-nums text-foreground/80">
                  {formatNpcDollars(item.npcTotal)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TemplateFilterChips
// ---------------------------------------------------------------------------

function TemplateFilterChips({
  templates,
  selected,
  onSelect,
}: {
  templates: string[];
  selected: string;
  onSelect: (t: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <Filter className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
      {["Todos", ...templates].map((t) => (
        <button
          key={t}
          onClick={() => onSelect(t)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
            selected === t
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border/50 bg-muted/20 text-muted-foreground hover:bg-muted/40",
          )}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// WeeklyBreakdownPanel (para meses históricos)
// ---------------------------------------------------------------------------

function WeeklyBreakdownPanel({
  weeks,
}: {
  weeks: Array<{
    year: number;
    week: number;
    weekLabel: string;
    npcTotal: number;
    rareItemCount: number;
  }>;
}) {
  const [open, setOpen] = useState(false);
  const filtered = weeks.filter((w) => w.npcTotal > 0);
  if (filtered.length === 0) return null;

  const maxNpc = Math.max(...filtered.map((w) => w.npcTotal));

  return (
    <div className="rounded-xl border border-border overflow-hidden shadow-card gradient-card">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground/70" />
          <span className="text-sm font-semibold">Detalhes por Semana</span>
          <Badge variant="outline" className="text-[10px]">
            {filtered.length} semana{filtered.length === 1 ? "" : "s"}
          </Badge>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground/60" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground/60" />
        )}
      </button>

      {open && (
        <div className="border-t border-border px-5 py-4 space-y-3">
          {filtered.map((w) => {
            const barPct = maxNpc > 0 ? Math.round((w.npcTotal / maxNpc) * 100) : 0;
            return (
              <div key={`${w.year}-${w.week}`} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground/80">
                    {w.weekLabel}
                  </span>
                  <div className="flex items-center gap-2">
                    {w.rareItemCount > 0 && (
                      <span className="flex items-center gap-1 text-amber-400 font-medium">
                        <Sparkles className="h-3 w-3" />
                        {w.rareItemCount}
                      </span>
                    )}
                    <span className="font-semibold text-primary tabular-nums">
                      {formatNpcDollars(w.npcTotal)}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted/50 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary/60 transition-all duration-500"
                    style={{ width: `${barPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MonthNavigator
// ---------------------------------------------------------------------------

interface MonthEntry {
  key: string;
  label: string;
  isCurrent: boolean;
}

function MonthNavigator({
  months,
  selectedKey,
  onSelect,
}: {
  months: MonthEntry[];
  selectedKey: string;
  onSelect: (key: string) => void;
}) {
  const idx = months.findIndex((m) => m.key === selectedKey);
  const current = months[idx];

  return (
    <div className="flex items-center gap-1.5">
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 shrink-0"
        disabled={idx >= months.length - 1}
        onClick={() => onSelect(months[idx + 1].key)}
        title="Mês anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-2 min-w-[160px] justify-center px-3 py-1.5 rounded-lg bg-muted/30 border border-border/50">
        <span className="text-sm font-semibold tabular-nums">
          {current?.label ?? "—"}
        </span>
        {current?.isCurrent && (
          <Badge className="text-[9px] px-1.5 py-0 h-4 bg-primary/15 text-primary border-primary/25 font-semibold">
            Atual
          </Badge>
        )}
      </div>

      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 shrink-0"
        disabled={idx <= 0}
        onClick={() => onSelect(months[idx - 1].key)}
        title="Próximo mês"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// HistoryTable
// ---------------------------------------------------------------------------

function HistoryTable({
  history,
  selectedKey,
  onSelect,
}: {
  history: MonthlyHistoryEntry[];
  selectedKey: string;
  onSelect: (key: string) => void;
}) {
  if (history.length === 0) return null;

  return (
    <div className="rounded-xl border border-border overflow-hidden shadow-card gradient-card">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-muted/20">
            <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Mês
            </th>
            <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              NPC Total
            </th>
            <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground hidden sm:table-cell">
              Raros
            </th>
            <th className="px-3 py-3 w-8" />
          </tr>
        </thead>
        <tbody>
          {history.map((h) => {
            const key = `${h.year}:${h.month}`;
            const isSelected = selectedKey === key;

            return (
              <tr
                key={key}
                onClick={() => onSelect(key)}
                className={cn(
                  "border-b border-border/50 last:border-0 cursor-pointer transition-colors",
                  isSelected ? "bg-primary/[0.06]" : "hover:bg-primary/[0.02]",
                )}
              >
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                    <span
                      className={cn(
                        "text-sm font-medium",
                        isSelected && "text-primary",
                      )}
                    >
                      {h.label}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-right">
                  {h.npcTotal > 0 ? (
                    <span className="text-sm font-semibold text-primary tabular-nums">
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
                <td className="px-3 py-3.5">
                  <ChevronRight
                    className={cn(
                      "h-3.5 w-3.5 transition-colors",
                      isSelected ? "text-primary" : "text-muted-foreground/30",
                    )}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface SelectedCycleData {
  label: string;
  isCurrent: boolean;
  npcTotal: number;
  items: LootSnapshotItem[];
  rareItems: LootSnapshotItem[];
  completedLootTasks: number;
  totalTasks: number | null;
  weeklyBreakdown: WeeklyBreakdownEntry[] | null;
  historyWeeks: MonthlyHistoryEntry["weeks"] | null;
}

export default function DropsPage() {
  const { selectedChar } = useChar();
  const { data: chars } = useChars();
  const charId = selectedChar?.id ?? null;

  const { data, isLoading } = useMonthlyCycle(charId);

  const [selectedMonthKey, setSelectedMonthKey] = useState<string>("current");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("Todos");

  const detailRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setSelectedMonthKey("current");
    setSelectedTemplate("Todos");
  }, [charId]);

  useEffect(() => {
    setSelectedTemplate("Todos");
  }, [selectedMonthKey]);

  const allMonths = useMemo((): MonthEntry[] => {
    if (!data) return [{ key: "current", label: "—", isCurrent: true }];
    return [
      { key: "current", label: data.currentCycle.label, isCurrent: true },
      ...(data.history ?? []).map((h) => ({
        key: `${h.year}:${h.month}`,
        label: h.label,
        isCurrent: false,
      })),
    ];
  }, [data]);

  const selectedCycleData = useMemo((): SelectedCycleData | null => {
    if (!data) return null;

    if (selectedMonthKey === "current") {
      return {
        label: data.currentCycle.label,
        isCurrent: true,
        npcTotal: data.currentCycle.npcTotal,
        items: data.currentCycle.items,
        rareItems: data.currentCycle.rareItems,
        completedLootTasks: data.currentCycle.completedLootTasks,
        totalTasks: null,
        weeklyBreakdown: data.currentCycle.weeklyBreakdown,
        historyWeeks: null,
      };
    }

    const h = data.history.find(
      (h) => `${h.year}:${h.month}` === selectedMonthKey,
    );
    if (!h) return null;

    return {
      label: h.label,
      isCurrent: false,
      npcTotal: h.npcTotal,
      items: h.items.filter((i) => !i.isRare),
      rareItems: h.items.filter((i) => i.isRare),
      completedLootTasks: h.completedTasks,
      totalTasks: h.totalTasks,
      weeklyBreakdown: null,
      historyWeeks: h.weeks ?? null,
    };
  }, [data, selectedMonthKey]);

  const availableTemplates = useMemo(() => {
    if (!selectedCycleData) return [];
    const allItems = [...selectedCycleData.items, ...selectedCycleData.rareItems];
    return [
      ...new Set(allItems.map((i) => i.templateName).filter(Boolean)),
    ].sort();
  }, [selectedCycleData]);

  const { visibleItems, visibleRareItems } = useMemo(() => {
    if (!selectedCycleData)
      return { visibleItems: [], visibleRareItems: [] };
    if (selectedTemplate === "Todos")
      return {
        visibleItems: selectedCycleData.items,
        visibleRareItems: selectedCycleData.rareItems,
      };
    return {
      visibleItems: selectedCycleData.items.filter(
        (i) => i.templateName === selectedTemplate,
      ),
      visibleRareItems: selectedCycleData.rareItems.filter(
        (i) => i.templateName === selectedTemplate,
      ),
    };
  }, [selectedCycleData, selectedTemplate]);

  const { allTime, insights, currentCycle } = data ?? {};

  const vsInsight = insights?.find((i) => i.type === "vs_previous");
  const otherInsights = insights?.filter((i) => i.type !== "vs_previous") ?? [];

  function handleSelectMonth(key: string) {
    setSelectedMonthKey(key);
    setTimeout(() => {
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  const hasNoChars = chars && chars.length === 0;
  const hasDrops = visibleItems.length > 0 || visibleRareItems.length > 0;
  const isCurrentMonthSelected = selectedMonthKey === "current";

  // ── Page Header ──────────────────────────────────────────────────────────

  const pageHeader = (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
            <Gem className="h-5 w-5 text-primary" />
          </div>
          Gestão de Drops
        </h1>
        {selectedChar && (
          <p className="text-muted-foreground text-sm mt-1.5 pl-12">
            Ciclo mensal de <strong>{selectedChar.name}</strong>
          </p>
        )}
      </div>
    </div>
  );

  // ── Early returns ─────────────────────────────────────────────────────────

  if (hasNoChars) {
    return (
      <div className="space-y-6">
        {pageHeader}
        <NoCharsEmptyState context="para ver os drops" />
      </div>
    );
  }

  if (!selectedChar) {
    return (
      <div className="space-y-6">
        {pageHeader}
        <EmptyState
          title="Selecione um char"
          description="Escolha um personagem na sidebar para ver os drops."
        />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {pageHeader}

      {/* ── Hero do ciclo ativo ── */}
      {!isLoading && data && isCurrentMonthSelected && (
        <ActiveCycleHero
          cycle={data.currentCycle}
          vsInsight={vsInsight}
          streak={allTime?.streak ?? 0}
        />
      )}

      {/* ── Insights do ciclo ativo ── */}
      {!isLoading && otherInsights.length > 0 && isCurrentMonthSelected && (
        <InsightsPanel insights={otherInsights} />
      )}

      {/* ── Gráfico semanal (ciclo ativo com breakdown) ── */}
      {!isLoading &&
        isCurrentMonthSelected &&
        (data?.currentCycle.weeklyBreakdown?.length ?? 0) > 0 && (
          <WeeklyChart weeks={data!.currentCycle.weeklyBreakdown} />
        )}

      {/* ── Estatísticas globais ── */}
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
            subtitle="soma de todos os meses"
            icon={TrendingUp}
          />
          <StatCard
            title="Melhor Mês"
            value={formatNpcDollars(allTime?.bestMonthNpc ?? 0)}
            subtitle={allTime?.bestMonthLabel ?? "—"}
            icon={Trophy}
            accent={!!(allTime?.bestMonthNpc)}
          />
          <StatCard
            title="Média Mensal"
            value={formatNpcDollars(allTime?.avgNpc ?? 0)}
            subtitle="por ciclo com drops"
            icon={BarChart2}
          />
          <StatCard
            title="Raros Coletados"
            value={allTime?.rareItemsCollected ?? 0}
            subtitle="total acumulado"
            icon={Gem}
          />
        </div>
      )}

      {/* ── Navegador de mês ── */}
      {!isLoading && allMonths.length > 1 && (
        <div className="flex items-center justify-between gap-3 flex-wrap rounded-xl border border-border gradient-card px-5 py-3.5 shadow-card">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Navegar por mês
          </div>
          <MonthNavigator
            months={allMonths}
            selectedKey={selectedMonthKey}
            onSelect={handleSelectMonth}
          />
        </div>
      )}

      {/* ── Filtro por template ── */}
      {!isLoading && availableTemplates.length > 1 && (
        <TemplateFilterChips
          templates={availableTemplates}
          selected={selectedTemplate}
          onSelect={setSelectedTemplate}
        />
      )}

      {/* ── Detalhe do ciclo selecionado ── */}
      <section ref={detailRef} className="space-y-4 scroll-mt-6">
        {/* Header do ciclo */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-display font-bold flex items-center gap-2.5">
            <div className="w-1 h-5 rounded-full gradient-primary" />
            {selectedCycleData?.isCurrent
              ? "Drops do Ciclo Atual"
              : selectedCycleData?.label ?? "Período"}
          </h2>
          {selectedCycleData && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Coins className="h-3.5 w-3.5" />
              <span>
                {selectedCycleData.completedLootTasks} atividade
                {selectedCycleData.completedLootTasks === 1 ? "" : "s"}
                {selectedCycleData.totalTasks
                  ? ` de ${selectedCycleData.totalTasks}`
                  : ""}
              </span>
            </div>
          )}
        </div>

        {isLoading ? (
          <SkeletonCard />
        ) : !hasDrops ? (
          <EmptyState
            title="Nenhum drop registrado"
            description={
              isCurrentMonthSelected
                ? "Complete conteúdos com loot para ver os ganhos aqui."
                : "Este mês não teve drops registrados."
            }
          />
        ) : (
          <div className="space-y-4">
            {/* Vitrine de raros */}
            <RareItemsShowcase items={visibleRareItems} />

            {/* Tabela de itens NPC */}
            {visibleItems.length > 0 && <NpcItemsTable items={visibleItems} />}

            {/* Breakdown semanal (meses históricos) */}
            {selectedCycleData?.historyWeeks &&
              selectedCycleData.historyWeeks.length > 0 && (
                <WeeklyBreakdownPanel weeks={selectedCycleData.historyWeeks} />
              )}
          </div>
        )}
      </section>

      {/* ── Histórico de ciclos fechados ── */}
      {!isLoading && (data?.history?.length ?? 0) > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-display font-bold flex items-center gap-2.5">
            <div className="w-1 h-4 rounded-full bg-muted-foreground/30" />
            Histórico de Ciclos
          </h2>
          <HistoryTable
            history={data!.history}
            selectedKey={selectedMonthKey}
            onSelect={handleSelectMonth}
          />
        </div>
      )}
    </div>
  );
}
