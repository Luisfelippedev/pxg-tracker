import { useState, useMemo, useEffect } from "react";
import { useChar } from "@/contexts/CharContext";
import { useTaskInstances, useUpdateTaskStatus, useChars, useTemplateItems } from "@/hooks/useTaskData";
import { SkeletonTable } from "@/components/Skeletons";
import EmptyState from "@/components/EmptyState";
import NoCharsEmptyState from "@/components/NoCharsEmptyState";
import NoTemplatesEmptyState from "@/components/NoTemplatesEmptyState";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CalendarDays } from "lucide-react";
import dayjs from "dayjs";
import { getCurrentIsoWeekRange } from "@/services/periods";
import {
  ALL_NIGHTMARE_LOOT_ITEMS,
  NIGHTMARE_TERROR_ITEMS,
  NIGHTMARE_TERROR_PRESET_KEY,
  nightmareCycleIconsBySlug,
  nightmareLootDisplayName,
  nightmareTerrorItemBySlug,
  type NightmareTerrorItem,
} from "@/data/nightmareTerrorItems";
import { TaskInstanceEnriched, TaskLootLine } from "@/types";
import { cn, formatNpcDollars } from "@/lib/utils";
import { toast } from "sonner";

function isNightmareLootTask(task: TaskInstanceEnriched) {
  return (
    task.templateKind === "loot" && task.presetKey === NIGHTMARE_TERROR_PRESET_KEY
  );
}

/** Aceita só dígitos; inteiro ≥ 0 (campo texto, sem spinners do input number). */
function maskedPositiveIntFromInput(raw: string): number {
  const digits = raw.replace(/\D/g, "");
  if (digits === "") return 0;
  const n = Number.parseInt(digits, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function lootLinesFromQuantities(
  quantities: Record<string, number>,
  npcOverrides: Record<string, number> = {},
  npcBySlug: Record<string, number> = {},
): TaskLootLine[] {
  return Object.entries(quantities)
    .filter(([, q]) => q > 0)
    .map(([slug, quantity]) => {
      const item = nightmareTerrorItemBySlug(slug);
      const npcUnitPriceDollars =
        item?.npcPriceDollars ?? npcBySlug[slug] ?? npcOverrides[slug] ?? 0;
      return { slug, quantity, npcUnitPriceDollars };
    });
}

function lootSummaryLabel(loot: TaskLootLine[] | null): string | null {
  if (!loot?.length) return null;
  const parts = loot.map(
    (l) => `${l.quantity}× ${nightmareLootDisplayName(l.slug)}`,
  );
  const total = loot.reduce(
    (s, l) => s + l.quantity * l.npcUnitPriceDollars,
    0,
  );
  return `${parts.join(", ")} · ${formatNpcDollars(total)}`;
}

const emptyQty = (): Record<string, number> =>
  Object.fromEntries(ALL_NIGHTMARE_LOOT_ITEMS.map((i) => [i.slug, 0]));

function quantitiesFromLoot(loot: TaskLootLine[] | null): Record<string, number> {
  const base = emptyQty();
  if (!loot?.length) return base;
  for (const line of loot) {
    base[line.slug] = line.quantity;
  }
  return base;
}

function CyclingItemIcon({
  item,
  className = "h-7 w-7 object-contain shrink-0 transition-opacity duration-300",
}: {
  item: NightmareTerrorItem;
  className?: string;
}) {
  const paths =
    item.cycleIcons && item.cycleIcons.length > 0
      ? [...item.cycleIcons]
      : [item.icon];
  const n = paths.length;
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    setIdx(0);
  }, [item.slug]);
  useEffect(() => {
    if (n < 2) return;
    const t = window.setInterval(() => {
      setIdx((i) => (i + 1) % n);
    }, 1_000);
    return () => window.clearInterval(t);
  }, [item.slug, n]);
  return <img src={paths[idx]} alt="" className={className} />;
}

function lootRowIconClass(item: NightmareTerrorItem, withTransition: boolean) {
  const sz = item.lootIconSize ?? "md";
  const box =
    sz === "xs" ? "h-4 w-4" : sz === "sm" ? "h-5 w-5" : "h-7 w-7";
  return cn(
    box,
    "object-contain shrink-0",
    withTransition && "transition-opacity duration-300",
  );
}

function LootQtyRow({
  item,
  quantity,
  onChange,
  dense,
}: {
  item: NightmareTerrorItem;
  quantity: number;
  onChange: (n: number) => void;
  dense?: boolean;
}) {
  return (
    <div
      className={
        dense
          ? "flex items-center gap-2 rounded-md border border-border/50 bg-muted/10 px-2 py-1"
          : "flex items-center gap-3 rounded-lg border border-border/70 bg-background/60 px-3 py-2 shadow-sm"
      }
    >
      <div
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-md bg-muted/40 shrink-0",
        )}
      >
        {item.cycleIcons?.length ? (
          <CyclingItemIcon
            item={item}
            className={lootRowIconClass(item, true)}
          />
        ) : (
          <img
            src={item.icon}
            alt=""
            className={lootRowIconClass(item, false)}
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium leading-tight truncate">{item.name}</p>
        {!dense && (
          <p className="text-[10px] mt-0.5">
            {item.tmKind ? (
              <span className="font-semibold tracking-wide text-amber-300">
                RARO
              </span>
            ) : (
              <span className="text-muted-foreground">
                NPC{" "}
                {item.npcPriceDollars > 0
                  ? `${formatNpcDollars(item.npcPriceDollars)}/un.`
                  : "—"}
              </span>
            )}
          </p>
        )}
      </div>
      <Input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="0"
        className="w-[3.25rem] h-8 px-1 bg-background border-border text-center text-xs tabular-nums placeholder:text-muted-foreground/50"
        value={quantity === 0 ? "" : String(quantity)}
        onChange={(e) => onChange(maskedPositiveIntFromInput(e.target.value))}
      />
    </div>
  );
}

export default function WeeklyTasksPage() {
  const { selectedChar } = useChar();
  const { data: chars } = useChars();
  const { data: tasks, isLoading, isFetching } = useTaskInstances({
    frequency: "weekly",
    charId: selectedChar?.id ?? null,
  });
  const updateStatus = useUpdateTaskStatus();
  const hasNoChars = chars && chars.length === 0;

  const [lootDialogTask, setLootDialogTask] = useState<TaskInstanceEnriched | null>(
    null,
  );
  const [quantities, setQuantities] = useState<Record<string, number>>(emptyQty);
  /** Preços NPC vindos do registo guardado (slugs antigos / fora do catálogo). */
  const [lootNpcOverrides, setLootNpcOverrides] = useState<Record<string, number>>(
    {},
  );
  const { data: templateItems } = useTemplateItems(lootDialogTask?.templateId ?? null);

  const nightmareDialogItems = useMemo(() => {
    if (!lootDialogTask || !isNightmareLootTask(lootDialogTask)) return NIGHTMARE_TERROR_ITEMS;
    if (!templateItems?.length) return NIGHTMARE_TERROR_ITEMS;
    return templateItems.map((row) => {
      const base = nightmareTerrorItemBySlug(row.itemSlug);
      return {
        slug: row.itemSlug,
        name: row.itemName,
        icon: row.spritePath,
        cycleIcons: nightmareCycleIconsBySlug(row.itemSlug),
        npcPriceDollars: row.npcPriceDollars ?? 0,
        tmKind: row.isRare ? (base?.tmKind ?? "tank") : undefined,
        lootIconSize: base?.lootIconSize,
      } as NightmareTerrorItem;
    });
  }, [lootDialogTask, templateItems]);

  const nightmareNpcBySlug = useMemo(
    () => Object.fromEntries(nightmareDialogItems.map((i) => [i.slug, i.npcPriceDollars])),
    [nightmareDialogItems],
  );

  const { weekStart, weekEnd, week: currentWeek } = getCurrentIsoWeekRange();

  const weeklyLootNpcTotal = useMemo(() => {
    if (!tasks?.length) return 0;
    return tasks.reduce((sum, t) => {
      if (!t.done || !t.loot?.length) return sum;
      return (
        sum +
        t.loot.reduce((s, l) => s + l.quantity * l.npcUnitPriceDollars, 0)
      );
    }, 0);
  }, [tasks]);

  const openLootDialog = (task: TaskInstanceEnriched) => {
    setQuantities(quantitiesFromLoot(task.loot));
    setLootNpcOverrides(
      Object.fromEntries((task.loot ?? []).map((l) => [l.slug, l.npcUnitPriceDollars])),
    );
    setLootDialogTask(task);
  };

  const closeLootDialog = () => {
    setLootDialogTask(null);
    setLootNpcOverrides({});
  };

  const handleSwitch = (task: TaskInstanceEnriched, checked: boolean) => {
    if (checked) {
      if (isNightmareLootTask(task)) {
        openLootDialog(task);
        return;
      }
      updateStatus.mutate({ id: task.id, done: true });
      return;
    }
    updateStatus.mutate({ id: task.id, done: false });
  };

  const submitLoot = () => {
    if (!lootDialogTask) return;
    const lines = lootLinesFromQuantities(quantities, lootNpcOverrides, nightmareNpcBySlug);
    updateStatus.mutate(
      { id: lootDialogTask.id, done: true, loot: lines },
      {
        onSuccess: () => {
          toast.success("Tarefa e drops registrados.");
          closeLootDialog();
        },
        onError: () => toast.error("Não foi possível salvar."),
      },
    );
  };

  const dialogSubtotal = useMemo(() => {
    return Object.entries(quantities).reduce((s, [slug, q]) => {
      if (q <= 0) return s;
      const item = nightmareTerrorItemBySlug(slug);
      const npc = item?.npcPriceDollars ?? nightmareNpcBySlug[slug] ?? lootNpcOverrides[slug] ?? 0;
      return s + q * npc;
    }, 0);
  }, [quantities, lootNpcOverrides, nightmareNpcBySlug]);

  if (hasNoChars) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-display font-bold tracking-tight flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
            <CalendarDays className="h-5 w-5 text-primary" />
          </div>
          Tarefas Semanais
        </h1>
        <NoCharsEmptyState context="para gerenciar as tarefas semanais" />
      </div>
    );
  }

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
      <Dialog open={!!lootDialogTask} onOpenChange={(o) => !o && closeLootDialog()}>
        <DialogContent className="bg-card border-border max-h-[92vh] flex flex-col gap-0 p-6 sm:max-w-lg">
          <DialogHeader className="space-y-1 shrink-0">
            <DialogTitle className="font-display text-lg">
              Drops — Nightmare World Terrors
            </DialogTitle>
            <p className="text-xs text-muted-foreground leading-snug">
              Todos os itens de Terror em uma única lista. TMs especiais são tratados
              como raros (sem valor NPC) e têm ícones animados.
            </p>
          </DialogHeader>

          <div className="flex-1 min-h-0 max-h-[min(52vh,420px)] overflow-y-auto pr-1 space-y-1.5 pt-2">
            {nightmareDialogItems.map((item) => (
              <LootQtyRow
                key={item.slug}
                item={item}
                quantity={quantities[item.slug] ?? 0}
                onChange={(v) => setQuantities((q) => ({ ...q, [item.slug]: v }))}
              />
            ))}
          </div>

          <p className="text-xs font-medium text-right border-t border-border pt-3 shrink-0">
            Total estimado (NPC):{" "}
            <span className="text-primary">{formatNpcDollars(dialogSubtotal)}</span>
          </p>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeLootDialog}
              className={cn(
                "h-10 min-h-10 w-full px-6 font-medium sm:w-auto",
                "border-2 border-border bg-card shadow-sm",
                "hover:bg-muted/70 hover:text-foreground",
              )}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={submitLoot}
              disabled={updateStatus.isPending}
              className={cn(
                "h-10 min-h-10 w-full px-6 font-semibold sm:w-auto",
                "gradient-primary text-primary-foreground shadow-primary",
                "hover:opacity-90 transition-opacity",
              )}
            >
              Concluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
            <CalendarDays className="h-5 w-5 text-primary" />
          </div>
          Tarefas Semanais
        </h1>
        <p className="text-muted-foreground text-sm mt-1.5 pl-12">
          Semana atual: {weekStart.format("DD/MM")} – {weekEnd.format("DD/MM")} (S
          {currentWeek})
        </p>
      </div>

      {weeklyLootNpcTotal > 0 && (
        <p className="text-sm text-muted-foreground rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          Receita NPC estimada (drops registrados nesta semana):{" "}
          <strong className="text-primary">{formatNpcDollars(weeklyLootNpcTotal)}</strong>
        </p>
      )}

      {isLoading ? (
        <SkeletonTable />
      ) : !tasks || tasks.length === 0 ? (
        <NoTemplatesEmptyState frequency="semanal" />
      ) : (
        <div
          className={`rounded-xl border border-border overflow-hidden shadow-card gradient-card transition-opacity ${isFetching ? "opacity-80" : "opacity-100"}`}
        >
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  Tarefa
                </th>
                <th className="px-5 py-3.5 text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  Concluída
                </th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  Data
                </th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr
                  key={task.id}
                  className={`border-b border-border/50 last:border-0 transition-colors hover:bg-primary/[0.03] ${task.done ? "opacity-60" : ""}`}
                >
                  <td className="px-5 py-3.5 text-sm font-medium">
                    <div className="flex flex-wrap items-center gap-2">
                      <span>{task.templateName}</span>
                      {isNightmareLootTask(task) && (
                        <Badge variant="secondary" className="text-[10px] font-normal">
                          Loot
                        </Badge>
                      )}
                    </div>
                    {isNightmareLootTask(task) && lootSummaryLabel(task.loot) && (
                      <p className="text-xs text-muted-foreground font-normal mt-1">
                        {lootSummaryLabel(task.loot)}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <Switch
                      checked={task.done}
                      onCheckedChange={(checked) => handleSwitch(task, checked)}
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
