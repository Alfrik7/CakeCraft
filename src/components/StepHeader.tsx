import { triggerTelegramHaptic } from '../lib/telegram';

interface StepHeaderProps {
  title: string;
  subtitle: string;
  onBack?: () => void;
}

export function StepHeader({ title, subtitle, onBack }: StepHeaderProps) {
  return (
    <div className="flex items-start gap-4">
      {onBack ? (
        <button
          type="button"
          onClick={() => {
            triggerTelegramHaptic('selection');
            onBack();
          }}
          className="tap-scale mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-vanilla text-chocolate shadow-soft border border-[#F4E0E4] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose/35"
          aria-label="Назад"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
            <path d="M15 6L9 12L15 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ) : null}
      <div className={onBack ? 'w-full' : 'w-full text-center'}>
        <h2 className="font-display text-[28px] font-bold text-chocolate leading-tight">{title}</h2>
        <p className="mt-1.5 text-[15px] text-truffle">{subtitle}</p>
      </div>
    </div>
  );
}