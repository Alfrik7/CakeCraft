interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  return (
    <ol className="grid grid-cols-6 gap-2" aria-label="Прогресс оформления заказа">
      {Array.from({ length: totalSteps }, (_, index) => {
        const step = index + 1;
        const isActive = step === currentStep;
        const isCompleted = step < currentStep;

        return (
          <li key={step} className="list-none">
            <div
              className={[
                'h-2 rounded-full transition-colors',
                isActive ? 'bg-rose-500' : '',
                isCompleted ? 'bg-rose-300' : '',
                !isActive && !isCompleted ? 'bg-rose-100' : '',
              ].join(' ')}
              aria-current={isActive ? 'step' : undefined}
            />
          </li>
        );
      })}
    </ol>
  );
}
