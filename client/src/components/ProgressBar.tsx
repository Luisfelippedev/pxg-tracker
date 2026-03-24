interface ProgressBarProps {
  value: number;
  label: string;
  sublabel?: string;
}

export default function ProgressBar({ value, label, sublabel }: ProgressBarProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="pokeball-dot" />
          <span className="text-sm font-medium text-foreground">{label}</span>
        </div>
        <span className="text-sm font-mono text-primary font-semibold">{value}%</span>
      </div>
      {sublabel && <p className="text-xs text-muted-foreground pl-5">{sublabel}</p>}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full gradient-primary transition-all duration-700 ease-out"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
