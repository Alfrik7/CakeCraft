interface StepHeaderProps {
  title: string;
  subtitle: string;
  onBack?: () => void;
}

export function StepHeader({ title, subtitle, onBack }: StepHeaderProps) {
  return (
    <div className="flex items-start gap-3">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="tap-scale mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-transparent text-text-primary transition duration-200 hover:bg-primary-from/20 active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-from/35"
          aria-label="Назад"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
            <path d="M15 6L9 12L15 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ) : null}
      <div className={onBack ? '' : 'w-full'}>
        <h2 className="text-center font-display text-3xl text-text-primary">{title}</h2>
        <p className="mt-2 text-center text-sm text-text-secondary">{subtitle}</p>
      </div>
    </div>
  );
}
