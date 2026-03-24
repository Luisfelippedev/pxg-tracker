import { useState } from "react";
import { useChar } from "@/contexts/CharContext";
import { useChars } from "@/hooks/useTaskData";
import { usePeriodHistory } from "@/hooks/useTaskData";
import { SkeletonTable } from "@/components/Skeletons";
import EmptyState from "@/components/EmptyState";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { History, CalendarDays, CalendarRange } from "lucide-react";
import { getIsoWeekRange } from "@/services/periods";

const monthNames = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

function formatPeriodLabel(snap: { frequency: string; year: number; period: number }) {
  if (snap.frequency === "weekly") {
    const { weekStart: start, weekEnd: end } = getIsoWeekRange(snap.year, snap.period);
    return `S${snap.period} (${start.format("DD/MM")} - ${end.format("DD/MM")})`;
  }
  return `${monthNames[snap.period - 1]}/${snap.year}`;
}

export default function HistoryPage() {
  const { selectedChar, setSelectedChar } = useChar();
  const { data: chars } = useChars();
  const [freqTab, setFreqTab] = useState<"weekly" | "monthly">("weekly");

  const { data: history, isLoading } = usePeriodHistory(
    selectedChar?.id ?? null,
    freqTab
  );

  const effectiveChar = selectedChar ?? chars?.[0] ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
              <History className="h-5 w-5 text-primary" />
            </div>
            Histórico
          </h1>
          <p className="text-muted-foreground text-sm mt-1.5 pl-12">
            Logs de semanas e meses anteriores por char
          </p>
        </div>
        <Select
          value={effectiveChar?.id ?? ""}
          onValueChange={(id) => {
            const c = chars?.find((x) => x.id === id);
            if (c) setSelectedChar(c);
          }}
        >
          <SelectTrigger className="w-52 bg-card border-border">
            <SelectValue placeholder="Selecione um char" />
          </SelectTrigger>
          <SelectContent>
            {chars?.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!effectiveChar ? (
        <EmptyState
          title="Selecione um char"
          description="Escolha um personagem para ver o histórico."
        />
      ) : (
        <Tabs value={freqTab} onValueChange={(v) => setFreqTab(v as "weekly" | "monthly")}>
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
            {isLoading ? (
              <SkeletonTable rows={6} />
            ) : !history || history.length === 0 ? (
              <EmptyState
                title="Sem histórico de semanais"
                description="Ainda não há registros de semanas anteriores para este char."
              />
            ) : (
              <div className="rounded-xl border border-border overflow-hidden shadow-card gradient-card">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Período</th>
                      <th className="px-5 py-3.5 text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Concluídas</th>
                      <th className="px-5 py-3.5 text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Total</th>
                      <th className="px-5 py-3.5 text-right text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((snap) => (
                      <tr key={snap.id} className="border-b border-border/50 last:border-0 hover:bg-primary/[0.03]">
                        <td className="px-5 py-3.5 text-sm font-medium">{formatPeriodLabel(snap)}</td>
                        <td className="px-5 py-3.5 text-center">{snap.completedTasks}</td>
                        <td className="px-5 py-3.5 text-center">{snap.totalTasks}</td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-mono">
                            {snap.totalTasks > 0
                              ? Math.round((snap.completedTasks / snap.totalTasks) * 100)
                              : 0}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
          <TabsContent value="monthly" className="mt-6">
            {isLoading ? (
              <SkeletonTable rows={6} />
            ) : !history || history.length === 0 ? (
              <EmptyState
                title="Sem histórico de mensais"
                description="Ainda não há registros de meses anteriores para este char."
              />
            ) : (
              <div className="rounded-xl border border-border overflow-hidden shadow-card gradient-card">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Período</th>
                      <th className="px-5 py-3.5 text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Concluídas</th>
                      <th className="px-5 py-3.5 text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Total</th>
                      <th className="px-5 py-3.5 text-right text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((snap) => (
                      <tr key={snap.id} className="border-b border-border/50 last:border-0 hover:bg-primary/[0.03]">
                        <td className="px-5 py-3.5 text-sm font-medium">{formatPeriodLabel(snap)}</td>
                        <td className="px-5 py-3.5 text-center">{snap.completedTasks}</td>
                        <td className="px-5 py-3.5 text-center">{snap.totalTasks}</td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-mono">
                            {snap.totalTasks > 0
                              ? Math.round((snap.completedTasks / snap.totalTasks) * 100)
                              : 0}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
