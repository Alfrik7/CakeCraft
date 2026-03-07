export function SkeletonPriceBar() {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-20 px-3 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 sm:px-4"
      style={{ backgroundColor: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(20px)' }}
      aria-hidden="true"
    >
      <div className="mx-auto flex max-w-[480px] items-center justify-between gap-4 rounded-t-3xl border border-white/65 bg-white/85 px-4 py-3 shadow-[0_-8px_30px_rgba(61,44,44,0.08)]">
        <div className="w-full max-w-[180px] space-y-2">
          <div className="skeleton-shimmer h-3 w-2/3 rounded-full" />
          <div className="skeleton-shimmer h-8 w-full rounded-xl" />
        </div>
        <div className="skeleton-shimmer h-12 w-32 rounded-full" />
      </div>
    </div>
  );
}
