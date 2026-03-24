export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border gradient-card p-5 animate-pulse shadow-card">
      <div className="h-2.5 w-20 rounded bg-muted mb-4" />
      <div className="h-7 w-24 rounded bg-muted mb-2" />
      <div className="h-2 w-14 rounded bg-muted" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-border gradient-card overflow-hidden shadow-card">
      <div className="border-b border-border bg-muted/20 px-5 py-3.5 flex gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-2.5 rounded bg-muted flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="border-b border-border/50 px-5 py-4 flex gap-4 animate-pulse">
          {[1, 2, 3, 4, 5].map((j) => (
            <div key={j} className="h-2.5 rounded bg-muted/50 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
