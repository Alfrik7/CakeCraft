interface SkeletonMenuGridProps {
  cards?: number;
}

export function SkeletonMenuGrid({ cards = 4 }: SkeletonMenuGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3" aria-hidden="true">
      {Array.from({ length: cards }, (_, index) => (
        <div key={index} className="overflow-hidden rounded-2xl bg-white shadow-card">
          <div className="skeleton-shimmer h-28 w-full" />
          <div className="space-y-2 p-3">
            <div className="skeleton-shimmer h-3 w-3/4 rounded-full" />
            <div className="skeleton-shimmer h-3 w-full rounded-full" />
            <div className="skeleton-shimmer h-3 w-1/2 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonParagraph() {
  return (
    <div className="space-y-2" aria-hidden="true">
      <div className="skeleton-shimmer h-3 w-full rounded-full" />
      <div className="skeleton-shimmer h-3 w-2/3 rounded-full" />
    </div>
  );
}
