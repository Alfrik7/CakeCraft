interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

const STEP_LABELS = ['Повод', 'Форма', 'Начинка', 'Покрытие', 'Декор', 'Заказ'];

export function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  const safeCurrentStep = Math.min(Math.max(currentStep, 1), totalSteps);
  const progressRatio = totalSteps > 1 ? (safeCurrentStep - 1) / (totalSteps - 1) : 0;

  return (
    <div className="rounded-3xl bg-surface/80 px-3 pb-2 pt-3 shadow-card backdrop-blur-md">
      <div className="relative">
        <div className="absolute left-3 right-3 top-3 h-1 rounded-full bg-primary-from/20" aria-hidden="true" />
        <div
          className="absolute left-3 top-3 h-1 rounded-full transition-all duration-300 ease-out"
          style={{
            width: `calc((100% - 1.5rem) * ${progressRatio})`,
            backgroundImage: 'var(--gradient-primary)',
          }}
          aria-hidden="true"
        />

        <ol className="relative grid grid-cols-6 gap-1" aria-label="Прогресс оформления заказа">
          {Array.from({ length: totalSteps }, (_, index) => {
            const step = index + 1;
            const label = STEP_LABELS[index] ?? `Шаг ${step}`;
            const isActive = step === safeCurrentStep;
            const isCompleted = step < safeCurrentStep;

            return (
              <li key={step} className="list-none">
                <div className="flex flex-col items-center gap-2 text-center">
                  <span
                    className={[
                      'mt-[2px] inline-flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all duration-300 ease-out',
                      isActive ? 'progress-step-active border-transparent shadow-card-hover' : '',
                      isCompleted ? 'scale-90 border-primary-to bg-primary-to' : '',
                      !isActive && !isCompleted ? 'border-primary-from/60 bg-surface/90' : '',
                    ].join(' ')}
                    style={isActive ? { backgroundImage: 'var(--gradient-primary)' } : undefined}
                    aria-current={isActive ? 'step' : undefined}
                  />
                  <span
                    className={[
                      'text-[11px] leading-tight',
                      isActive || isCompleted ? 'font-semibold text-text-primary' : 'text-text-secondary',
                    ].join(' ')}
                  >
                    {label}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
