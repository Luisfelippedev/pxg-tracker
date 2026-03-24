import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  accent?: boolean;
}

export default function StatCard({ title, value, subtitle, icon: Icon, accent }: StatCardProps) {
  return (
    <div
      className={`group relative overflow-hidden rounded-xl border p-5 transition-all duration-300 ${
        accent
          ? "border-primary/30 gradient-primary text-primary-foreground shadow-primary glow-primary"
          : "border-border gradient-card hover:border-primary/20 shadow-card hover:shadow-primary/10"
      }`}
    >
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle_at_50%_50%,hsl(0_0%_100%)_1px,transparent_1px)] bg-[length:16px_16px]" />

      <div className="relative flex items-start justify-between">
        <div className="space-y-1">
          <p className={`text-[11px] font-semibold uppercase tracking-[0.1em] ${accent ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
            {title}
          </p>
          <p className="text-3xl font-display font-bold tracking-tight">{value}</p>
          {subtitle && (
            <p className={`text-xs ${accent ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
              {subtitle}
            </p>
          )}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
          accent ? "bg-primary-foreground/10" : "bg-primary/8 group-hover:bg-primary/15"
        }`}>
          <Icon className={`h-5 w-5 ${accent ? "text-primary-foreground/80" : "text-primary"}`} />
        </div>
      </div>
    </div>
  );
}
