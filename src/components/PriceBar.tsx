interface PriceBarProps {
  totalPrice: number;
  isLastStep: boolean;
  canProceed: boolean;
  isSubmitting?: boolean;
  onNext: () => void;
}

function formatPrice(value: number): string {
  return `${new Intl.NumberFormat('ru-RU').format(Math.round(value))} ₽`;
}

export function PriceBar({ totalPrice, isLastStep, canProceed, isSubmitting = false, onNext }: PriceBarProps) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-20 bg-white/80 px-3 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl sm:px-4"
      style={{ backgroundColor: 'var(--tg-secondary-bg-color, rgba(255,255,255,0.95))' }}
    >
      <div className="mx-auto flex max-w-[480px] items-center justify-between gap-4 rounded-t-3xl bg-surface/90 px-4 py-3 shadow-float">
        <div>
          <p className="text-xs text-gray-500">Текущая стоимость</p>
          <p className="text-lg font-semibold text-gray-900">{formatPrice(totalPrice)}</p>
        </div>
        <button
          className="min-h-[44px] rounded-xl bg-rose-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-rose-200"
          style={{
            backgroundColor: canProceed ? 'var(--tg-button-color, #f43f5e)' : undefined,
            color: 'var(--tg-button-text-color, #ffffff)',
          }}
          onClick={onNext}
          disabled={!canProceed}
          type="button"
        >
          {isLastStep ? (isSubmitting ? 'Отправка...' : 'Отправить заказ') : 'Далее'}
        </button>
      </div>
    </div>
  );
}
