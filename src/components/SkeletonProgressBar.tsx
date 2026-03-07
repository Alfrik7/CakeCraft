export function SkeletonProgressBar() {
  const totalSteps = 5;

  return (
    <div className="rounded-3xl bg-surface/80 px-3 pb-2 pt-3 shadow-card backdrop-blur-md" aria-hidden="true">
      <div className="relative">
        <div className="skeleton-shimmer absolute left-3 right-3 top-3 h-1 rounded-full" />
        <ol className="relative grid gap-1" style={{ gridTemplateColumns: `repeat(${totalSteps}, minmax(0, 1fr))` }}>
          {Array.from({ length: totalSteps }, (_, index) => (
            <li key={index} className="list-none">
              <div className="flex flex-col items-center gap-2 text-center">
                <span className="skeleton-shimmer mt-[2px] inline-flex h-6 w-6 rounded-full" />
                <span className="skeleton-shimmer h-2 w-10 rounded-full" />
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
