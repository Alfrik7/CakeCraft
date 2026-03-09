interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

const STEP_LABELS = ['Повод', 'Форма', 'Начинка', 'Декор', 'Заказ'];

export function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  const safeCurrentStep = Math.min(Math.max(currentStep, 1), totalSteps);
  const progressRatio = totalSteps > 1 ? (safeCurrentStep - 1) / (totalSteps - 1) : 0;

  return (
    <div className="backdrop-blur-lg bg-cream/80 py-3 px-4 shadow-sm relative z-30">
      <div className="relative max-w-[480px] mx-auto">
        <div className="absolute left-[10%] right-[10%] top-3 h-[2px] -translate-y-1/2 bg-blush/35" aria-hidden="true" />
        <div
          className="absolute left-[10%] top-3 h-[2px] -translate-y-1/2 transition-all duration-300 ease-out bg-gradient-to-r from-blush to-rose"
          style={{
            width: `calc(80% * ${progressRatio})`,
          }}
          aria-hidden="true"
        />

        <ol
          className="relative flex justify-between"
          aria-label="Прогресс оформления заказа"
        >
          {Array.from({ length: totalSteps }, (_, index) => {
            const step = index + 1;
            const label = STEP_LABELS[index] ?? `Шаг ${step}`;
            const isActive = step === safeCurrentStep;
            const isCompleted = step < safeCurrentStep;

            return (
              <li key={step} className="flex flex-col items-center gap-1.5 z-10 w-12">
                <div
                  className={[
                    'flex h-6 w-6 items-center justify-center rounded-full transition-all duration-300 ease-out bg-cream',
                    isActive ? 'border-2 border-rose progress-active' : '',
                    isCompleted ? 'bg-blush border-2 border-blush' : '',
                    !isActive && !isCompleted ? 'border-2 border-blush/35' : '',
                  ].join(' ')}
                  aria-current={isActive ? 'step' : undefined}
                >
                  {isActive ? (
                    <div className="h-2 w-2 aspect-square rounded-full bg-gradient-to-br from-blush to-rose" aria-hidden="true" />
                  ) : null}
                  {isCompleted ? (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  ) : null}
                </div>
                <span
                  className={[
                    'text-[10px] sm:text-[11px] leading-tight text-center',
                    isActive ? 'font-bold text-rose' : 'font-medium text-truffle',
                  ].join(' ')}
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
