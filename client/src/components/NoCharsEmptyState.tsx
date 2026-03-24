import { Link } from "react-router-dom";
import { UserPlus } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";

interface NoCharsEmptyStateProps {
  /** Contexto específico da página (ex: "para ver o progresso") */
  context?: string;
}

export default function NoCharsEmptyState({ context }: NoCharsEmptyStateProps) {
  const description = context
    ? `Adicione seu primeiro personagem ${context}.`
    : "Adicione seu primeiro personagem para começar a rastrear tarefas semanais e mensais.";

  return (
    <EmptyState
      title="Nenhum char ainda"
      description={description}
      icon={<UserPlus className="h-7 w-7 text-primary/60" />}
      action={
        <Button
          asChild
          className="gradient-primary text-primary-foreground font-semibold shadow-primary hover:opacity-90 transition-opacity"
        >
          <Link to="/chars">
            <UserPlus className="h-4 w-4 mr-2" />
            Criar primeiro char
          </Link>
        </Button>
      }
    />
  );
}
