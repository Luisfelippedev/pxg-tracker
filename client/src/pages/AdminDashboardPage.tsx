import { useAdminDashboard } from "@/hooks/useAdminData";
import { SkeletonTable } from "@/components/Skeletons";
import EmptyState from "@/components/EmptyState";
import CharProgressMiniCard from "@/components/CharProgressMiniCard";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Users, ShieldCheck } from "lucide-react";

export default function AdminDashboardPage() {
  const { data, isLoading } = useAdminDashboard();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
              <Users className="h-5 w-5 text-primary" />
            </span>
            Usuários
          </h1>
          <p className="text-muted-foreground text-sm mt-1.5 pl-12">
            Listando usuários e progresso por char.
          </p>
        </div>
        <SkeletonTable rows={5} />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </span>
            Usuários
          </h1>
          <p className="text-muted-foreground text-sm mt-1.5 pl-12">
            Nenhum usuário encontrado.
          </p>
        </div>
        <EmptyState
          title="Sem dados"
          description="A aplicação ainda não possui usuários cadastrados."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </span>
          Usuários
        </h1>
        <p className="text-muted-foreground text-sm mt-1.5 pl-12">
          Listando usuários e, ao expandir, os chars e o progresso atual.
        </p>
      </div>

      <div className="rounded-xl border border-border gradient-card overflow-hidden shadow-card">
        <Accordion type="multiple" collapsible className="divide-y divide-border">
          {data.map((entry) => (
            <AccordionItem key={entry.user.id} value={entry.user.id}>
              <AccordionTrigger>
                <div className="flex items-center justify-between w-full gap-6 pr-1">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{entry.user.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {entry.dashboard.completedTasks}/{entry.dashboard.totalTasks} tarefas
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant="secondary" className="text-[11px]">
                      {entry.user.role}
                    </Badge>
                    <span className="text-[11px] font-mono text-primary font-semibold">
                      {entry.dashboard.completionPercentage}%
                    </span>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                {entry.dashboard.charProgress.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {entry.dashboard.charProgress.map((cp) => (
                      <CharProgressMiniCard
                        key={cp.charId}
                        charId={cp.charId}
                        charName={cp.charName}
                        total={cp.total}
                        completed={cp.completed}
                        percentage={cp.percentage}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground py-2">
                    Este usuário ainda não possui chars cadastrados.
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}

