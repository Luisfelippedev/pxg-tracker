import { Char } from "@/types";

interface CharProgressMiniCardProps {
  charId: string;
  charName: string;
  total: number;
  completed: number;
  percentage: number;
  onSelect?: (char: Char) => void;
}

export default function CharProgressMiniCard({
  charId,
  charName,
  total,
  completed,
  percentage,
  onSelect,
}: CharProgressMiniCardProps) {
  const char: Char = { id: charId, name: charName };
  const isClickable = !!onSelect;

  return (
    <button
      type="button"
      onClick={() => onSelect?.(char)}
      disabled={!isClickable}
      className={`w-full text-left rounded-lg border border-border bg-muted/20 p-4 transition-all duration-200 hover:border-primary/20 hover:bg-muted/40 ${
        isClickable ? "cursor-pointer" : "cursor-default"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-foreground truncate pr-2">
          {charName}
        </span>
        <span className="text-xs font-mono text-primary font-semibold shrink-0">
          {percentage}%
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full gradient-primary transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-[11px] text-muted-foreground mt-1.5">
        {completed}/{total} tarefas
      </p>
    </button>
  );
}
