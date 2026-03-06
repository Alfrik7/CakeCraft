interface SkeletonMenuGridProps {
  cards?: number;
}

export function SkeletonMenuGrid({ cards = 4 }: SkeletonMenuGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3" aria-hidden="true">
      {Array.from({ length: cards }, (_, index) => (
        <div key={index} className="overflow-hidden rounded-xl border border-rose-100 bg-white">
          <div className="h-28 w-full animate-pulse bg-rose-100" />
          <div className="space-y-2 p-3">
            <div className="h-3 w-3/4 animate-pulse rounded bg-rose-100" />
            <div className="h-3 w-full animate-pulse rounded bg-rose-100" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-rose-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonParagraph() {
  return (
    <div className="space-y-2" aria-hidden="true">
      <div className="h-3 w-full animate-pulse rounded bg-rose-100" />
      <div className="h-3 w-2/3 animate-pulse rounded bg-rose-100" />
    </div>
  );
}
