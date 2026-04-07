export default function JobCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3 animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="skeleton-shimmer h-5 w-3/4 rounded" />
          <div className="skeleton-shimmer h-4 w-1/2 rounded" />
        </div>
        <div className="skeleton-shimmer w-8 h-8 rounded-lg shrink-0" />
      </div>
      <div className="flex gap-2">
        <div className="skeleton-shimmer h-5 w-20 rounded-full" />
        <div className="skeleton-shimmer h-5 w-16 rounded-full" />
      </div>
      <div className="space-y-2">
        <div className="skeleton-shimmer h-4 w-full rounded" />
        <div className="skeleton-shimmer h-4 w-5/6 rounded" />
        <div className="skeleton-shimmer h-4 w-4/6 rounded" />
      </div>
    </div>
  );
}
