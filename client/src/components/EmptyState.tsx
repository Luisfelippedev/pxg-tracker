import { ReactNode } from "react";
import { PackageOpen } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  /** Elemento de ação opcional (ex: botão/link para criar char) */
  action?: ReactNode;
  /** Ícone customizado em vez do padrão PackageOpen */
  icon?: ReactNode;
}

export default function EmptyState({
  title,
  description,
  action,
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/8 border border-primary/15 mb-5">
        {icon ?? <PackageOpen className="h-7 w-7 text-primary/60" />}
      </div>
      <h3 className="text-lg font-display font-bold text-foreground">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground leading-relaxed">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
