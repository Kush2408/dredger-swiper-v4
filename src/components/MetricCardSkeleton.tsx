export default function MetricCardSkeleton() {
  return (
    <div className="rounded-lg p-4 flex items-center bg-[var(--skeleton-bg-2)]">
      <div className="h-12 w-12 rounded-full animate-shimmer flex items-center justify-center mr-3
                      bg-gradient-to-r from-[var(--skeleton-bg-1)] via-[var(--skeleton-bg-2)] to-[var(--skeleton-bg-1)]">
        <div className="w-6 h-6 rounded animate-shimmer
                        bg-gradient-to-r from-[var(--skeleton-bg-2)] via-[var(--skeleton-bg-1)] to-[var(--skeleton-bg-2)]"></div>
      </div>
      <div className="flex-1">
        <div className="h-4 w-20 mb-3 rounded animate-shimmer
                        bg-gradient-to-r from-[var(--skeleton-bg-1)] via-[var(--skeleton-bg-2)] to-[var(--skeleton-bg-1)]"></div>
        <div className="h-6 w-16 rounded animate-shimmer
                        bg-gradient-to-r from-[var(--skeleton-bg-2)] via-[var(--skeleton-bg-1)] to-[var(--skeleton-bg-2)]"></div>
      </div>
    </div>
  );
}
