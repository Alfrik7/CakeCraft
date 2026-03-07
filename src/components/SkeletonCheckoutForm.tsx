export function SkeletonCheckoutForm() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <div className="space-y-2">
        <div className="skeleton-shimmer h-3 w-1/4 rounded-full" />
        <div className="skeleton-shimmer h-11 w-full rounded-xl" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_170px]">
        <div className="space-y-2">
          <div className="skeleton-shimmer h-3 w-1/3 rounded-full" />
          <div className="skeleton-shimmer h-11 w-full rounded-xl" />
        </div>
        <div className="space-y-2">
          <div className="skeleton-shimmer h-3 w-1/2 rounded-full" />
          <div className="skeleton-shimmer h-11 w-full rounded-xl" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <div className="skeleton-shimmer h-3 w-1/3 rounded-full" />
          <div className="skeleton-shimmer h-11 w-full rounded-xl" />
        </div>
        <div className="space-y-2">
          <div className="skeleton-shimmer h-3 w-1/3 rounded-full" />
          <div className="skeleton-shimmer h-11 w-full rounded-xl" />
        </div>
      </div>

      <div className="space-y-2 border-t border-primary-from/15 pt-4">
        <div className="skeleton-shimmer h-3 w-1/3 rounded-full" />
        <div className="flex gap-2">
          <div className="skeleton-shimmer h-11 w-28 rounded-full" />
          <div className="skeleton-shimmer h-11 w-44 rounded-full" />
        </div>
      </div>

      <div className="space-y-2 border-t border-primary-from/15 pt-4">
        <div className="skeleton-shimmer h-3 w-1/3 rounded-full" />
        <div className="skeleton-shimmer h-20 w-full rounded-xl" />
      </div>

      <div className="space-y-2 rounded-2xl bg-secondary/95 p-4">
        <div className="skeleton-shimmer h-6 w-1/2 rounded-full" />
        <div className="skeleton-shimmer h-4 w-full rounded-full" />
        <div className="skeleton-shimmer h-4 w-5/6 rounded-full" />
        <div className="skeleton-shimmer h-4 w-2/3 rounded-full" />
      </div>
    </div>
  );
}
