export function Skeleton({ className = '' }) {
  return (
    <div className={`bg-elevated rounded animate-pulse ${className}`} />
  );
}

export function FileRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5 border-b border-border">
      <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton className="h-3.5 w-48" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-3 w-16 hidden sm:block" />
      <Skeleton className="h-3 w-20 hidden md:block" />
      <div className="flex gap-2">
        <Skeleton className="w-7 h-7 rounded-md" />
        <Skeleton className="w-7 h-7 rounded-md" />
        <Skeleton className="w-7 h-7 rounded-md" />
      </div>
    </div>
  );
}
