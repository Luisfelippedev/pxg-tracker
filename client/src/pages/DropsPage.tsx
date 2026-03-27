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
  CheckCircle2,
  Coins,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Filter,
  Lock,
  Unlock,
} from "lucide-react";
import { nightmareCycleIconsBySlug } from "@/data/nightmareTerrorItems";
import type {
  LootSnapshotItem,
  MonthlyHistoryEntry,
  MonthlyCycleSummary,
  WeeklyBreakdownEntry,
} from "@/types";

// ---------------------------------------------------------------------------
// Shared helpers
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
}

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
      {frames.length > 0 ? (
        <img src={frames[idx]} alt="" className={cn("object-contain", imgCls)} />
      ) : (
        <PackageOpen className={cn("text-muted-foreground/40", imgCls)} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// NpcItemsTable
// ---------------------------------------------------------------------------

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
              key={`${item.slug}-${item.templateName}`}
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

// ---------------------------------------------------------------------------
// RareItemsShowcase
// ---------------------------------------------------------------------------

function RareItemsShowcase({ items }: { items: LootSnapshotItem[] }) {
  if (items.length === 0) return null;
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);

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
          {totalQty} coletado{totalQty === 1 ? "" : "s"}
        </Badge>
      </div>
      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {items.map((item) => (
          <div
            key={`${item.slug}-${item.templateName}`}
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
              <p className="text-[10px] text-muted-foreground/60 truncate">
                {item.templateName}
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
  if (templates.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground shrink-0">
        <Filter className="h-3 w-3" />
        Filtrar
      </div>
      {["Todos", ...templates].map((t) => (
        <button
          key={t}
          onClick={() => onSelect(t)}
          className={cn(
            "px-3 py-1 rounded-full text-xs font-medium transition-all border whitespace-nowrap",
            t === selected
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-muted/40 text-muted-foreground border-border/60 hover:bg-muted/80",
          )}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// WeeklyBreakdownPanel
// ---------------------------------------------------------------------------

function WeeklyBreakdownPanel({
  weeks,
}: {
  weeks: WeeklyBreakdownEntry[] | Array<{
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
            const rareCount =
              "rareItemCount" in w
                ? (w as { rareItemCount: number }).rareItemCount
                : (w as WeeklyBreakdownEntry).rareItems.reduce(
                    (s, i) => s + i.quantity,
                    0,
                  );

            return (
              <div key={`${w.year}-${w.week}`} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground/80">
                    {w.weekLabel}
                  </span>
                  <div className="flex items-center gap-2">
                    {rareCount > 0 && (
                      <span className="flex items-center gap-1 text-amber-400 font-medium">
                        <Sparkles className="h-3 w-3" />
                        {rareCount}
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
            <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground hidden sm:table-cell">
              Semanas
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
                  isSelected
                    ? "bg-primary/[0.06]"
                    : "hover:bg-primary/[0.02]",
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
                  {h.weeks.length > 0 ? (
                    <span className="text-xs text-muted-foreground">
                      {h.weeks.length}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-3 py-3.5">
                  <ChevronRight
                    className={cn(
                      "h-3.5 w-3.5 transition-colors",
                      isSelected
                        ? "text-primary"
                        : "text-muted-foreground/30",
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

export default function DropsPage() {
  const { selectedChar } = useChar();
  const { data: chars } = useChars();
  const charId = selectedChar?.id ?? null;

  const { data, isLoading } = useMonthlyCycle(charId);

  const [selectedMonthKey, setSelectedMonthKey] = useState<string>("current");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("Todos");

  const detailRef = useRef<HTMLElement>(null);

  // Reset selections when char changes
  useEffect(() => {
    setSelectedMonthKey("current");
    setSelectedTemplate("Todos");
  }, [charId]);

  // Reset template filter when month changes
  useEffect(() => {
    setSelectedTemplate("Todos");
  }, [selectedMonthKey]);

  // All selectable months (current + history)
  const allMonths = useMemo((): MonthEntry[] => {
    if (!data) return [{ key: "current", label: "—", isCurrent: true }];
    return [
      {
        key: "current",
        label: data.currentCycle.label,
        isCurrent: true,
      },
      ...(data.history ?? []).map((h) => ({
        key: `${h.year}:${h.month}`,
        label: h.label,
        isCurrent: false,
      })),
    ];
  }, [data]);

  // Resolve which cycle's data to show
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
      weeklyBreakdown: h.weeks.length > 0 ? null : null, // use h.weeks below
      // pass weeks separately via historyWeeks
    };
  }, [data, selectedMonthKey]);

  // Weeks for the selected historical month (from MonthlyHistoryEntry)
  const historyWeeks = useMemo(() => {
    if (!data || selectedMonthKey === "current") return null;
    const h = data.history.find(
      (h) => `${h.year}:${h.month}` === selectedMonthKey,
    );
    return h?.weeks ?? null;
  }, [data, selectedMonthKey]);

  // Available templates for filter
  const availableTemplates = useMemo(() => {
    if (!selectedCycleData) return [];
    const allItems = [...selectedCycleData.items, ...selectedCycleData.rareItems];
    return [
      ...new Set(allItems.map((i) => i.templateName).filter(Boolean)),
    ].sort();
  }, [selectedCycleData]);

  // Apply template filter
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

  const { allTime } = data ?? {};
  const hasDrops = visibleItems.length > 0 || visibleRareItems.length > 0;

  const performance = useMemo(() => {
    const avg = allTime?.avgNpc ?? 0;
    const curr = data?.currentCycle.npcTotal ?? 0;
    if (avg === 0 || curr === 0) return null;
    const pct = Math.round(((curr - avg) / avg) * 100);
    return { pct, positive: pct >= 0 };
  }, [allTime?.avgNpc, data?.currentCycle.npcTotal]);

  function handleSelectMonth(key: string) {
    setSelectedMonthKey(key);
    setTimeout(() => {
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  const hasNoChars = chars && chars.length === 0;

  // ── Early returns ──────────────────────────────────────────────────────────

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
      {!isLoading && data && (
        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-4 py-2">
          <Unlock className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-sm font-semibold text-foreground/80">
            {data.currentCycle.label}
          </span>
          <Badge className="text-[9px] px-1.5 py-0 h-4 bg-emerald-500/15 text-emerald-400 border-emerald-500/25">
            Ativo
          </Badge>
        </div>
      )}
    </div>
  );

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

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      {pageHeader}

      {/* ── All-time stats ── */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
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

      {/* ── Gamification badges ── */}
      {!isLoading &&
        ((allTime?.streak ?? 0) > 1 || performance !== null) && (
          <div className="flex flex-wrap gap-2">
            {(allTime?.streak ?? 0) > 1 && (
              <div className="flex items-center gap-1.5 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1.5">
                <Flame className="h-3.5 w-3.5 text-orange-400" />
                <span className="text-xs font-semibold text-orange-400">
                  {allTime!.streak} meses seguidos com drops
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
                    performance.positive ? "text-emerald-400" : "text-amber-400",
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

      {/* ── Month Navigator (only when there's history) ── */}
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

      {/* ── Template filter ── */}
      {!isLoading && availableTemplates.length > 1 && (
        <TemplateFilterChips
          templates={availableTemplates}
          selected={selectedTemplate}
          onSelect={setSelectedTemplate}
        />
      )}

      {/* ── Cycle detail ── */}
      <section ref={detailRef} className="space-y-4 scroll-mt-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-display font-bold flex items-center gap-2.5">
            <div className="w-1 h-5 rounded-full gradient-primary" />
            {selectedCycleData?.isCurrent
              ? "Ciclo Atual"
              : selectedCycleData?.label ?? "Período"}
            {selectedCycleData?.isCurrent && (
              <span className="text-muted-foreground font-normal text-sm">
                {selectedCycleData.label}
              </span>
            )}
          </h2>

          <div className="flex items-center gap-2 flex-wrap">
            {selectedCycleData?.isCurrent ? (
              <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1">
                <Unlock className="h-3 w-3 text-emerald-400" />
                <span className="text-[11px] font-semibold text-emerald-400">
                  Ciclo Ativo
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 px-2.5 py-1">
                <Lock className="h-3 w-3 text-muted-foreground/60" />
                <span className="text-[11px] font-semibold text-muted-foreground/70">
                  Ciclo Encerrado
                </span>
              </div>
            )}

            {(selectedCycleData?.completedLootTasks ?? 0) > 0 && (
              <Badge variant="secondary" className="gap-1.5 text-xs">
                <CheckCircle2 className="h-3 w-3" />
                {selectedCycleData!.completedLootTasks}
                {selectedCycleData?.totalTasks != null
                  ? `/${selectedCycleData.totalTasks}`
                  : ""}{" "}
                {selectedCycleData!.completedLootTasks === 1
                  ? "tarefa"
                  : "tarefas"}
              </Badge>
            )}

            {selectedTemplate !== "Todos" && visibleItems.length > 0 && (
              <Badge
                variant="outline"
                className="gap-1 text-xs text-primary border-primary/20"
              >
                <Coins className="h-3 w-3" />
                {formatNpcDollars(
                  visibleItems.reduce((s, i) => s + i.npcTotal, 0),
                )}
              </Badge>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : hasDrops ? (
          <div className="space-y-4">
            <NpcItemsTable items={visibleItems} />
            <RareItemsShowcase items={visibleRareItems} />
          </div>
        ) : (
          <div className="rounded-xl border border-border gradient-card p-10 text-center shadow-card">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/40 border border-border mx-auto mb-4">
              <PackageOpen className="h-7 w-7 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground">
              {selectedTemplate !== "Todos"
                ? `Nenhum drop de "${selectedTemplate}" neste período`
                : selectedCycleData?.isCurrent
                  ? "Nenhum drop registrado neste ciclo"
                  : `Nenhum drop registrado em ${selectedCycleData?.label}`}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1.5 max-w-xs mx-auto">
              {selectedTemplate !== "Todos"
                ? "Tente selecionar outro conteúdo ou remover o filtro."
                : selectedCycleData?.isCurrent
                  ? "Complete tarefas de loot e registre seus drops para ver o balancete aqui."
                  : "Este ciclo foi encerrado sem drops registrados."}
            </p>
          </div>
        )}
      </section>

      {/* ── Weekly breakdown (collapsible) ── */}
      {!isLoading && (() => {
        const weeks =
          selectedMonthKey === "current"
            ? (data?.currentCycle.weeklyBreakdown ?? [])
            : (historyWeeks ?? []);
        if (weeks.length === 0) return null;
        return <WeeklyBreakdownPanel weeks={weeks} />;
      })()}

      {/* ── History ── */}
      {!isLoading && (data?.history?.length ?? 0) > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-display font-bold flex items-center gap-2.5">
            <div className="w-1 h-5 rounded-full bg-muted-foreground/30" />
            Histórico
            <span className="text-muted-foreground font-normal text-sm">
              {data!.history.length}{" "}
              {data!.history.length === 1 ? "mês anterior" : "meses anteriores"}
            </span>
          </h2>
          <HistoryTable
            history={data!.history}
            selectedKey={selectedMonthKey}
            onSelect={handleSelectMonth}
          />
        </section>
      )}
    </div>
  );
}
