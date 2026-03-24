import { Link } from "react-router-dom";
import { Settings2 } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";

interface NoTemplatesEmptyStateProps {
  /** "semanal" ou "mensal" para contextualizar */
  frequency: "semanal" | "mensal";
}

export default function NoTemplatesEmptyState({ frequency }: NoTemplatesEmptyStateProps) {
  const label = frequency === "semanal" ? "semanais" : "mensais";

  return (
    <EmptyState
      title={`Sem tarefas ${label}`}
      description={`Nenhuma tarefa ${frequency} configurada para este char. Crie templates e ative para este personagem.`}
      icon={<Settings2 className="h-7 w-7 text-primary/60" />}
      action={
        <Button
          asChild
          className="gradient-primary text-primary-foreground font-semibold shadow-primary hover:opacity-90 transition-opacity"
        >
          <Link to="/templates">
            <Settings2 className="h-4 w-4 mr-2" />
            Configurar templates
          </Link>
        </Button>
      }
    />
  );
}
