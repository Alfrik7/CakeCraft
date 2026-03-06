import { useEffect, useRef, useState } from 'react';

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
  const [animatedPrice, setAnimatedPrice] = useState(totalPrice);
  const [isPriceAnimating, setIsPriceAnimating] = useState(false);
  const prevPriceRef = useRef(totalPrice);

  useEffect(() => {
    const previous = prevPriceRef.current;
    if (previous === totalPrice) {
      return;
    }

    const duration = 300;
    const startTime = performance.now();
    setIsPriceAnimating(true);

    const tick = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      const nextPrice = previous + (totalPrice - previous) * eased;
      setAnimatedPrice(nextPrice);

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        setAnimatedPrice(totalPrice);
        setIsPriceAnimating(false);
        prevPriceRef.current = totalPrice;
      }
    };

    requestAnimationFrame(tick);
  }, [totalPrice]);

  const buttonText = isLastStep ? (isSubmitting ? 'Отправка...' : 'Отправить заказ') : 'Далее';
  const buttonClass = canProceed
    ? '[background-image:var(--gradient-primary)] text-white hover:scale-105 hover:shadow-card-hover'
    : 'cursor-not-allowed border border-primary-from/35 bg-white text-text-secondary';

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-20 px-3 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 sm:px-4"
      style={{ backgroundColor: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(20px)' }}
    >
      <div className="mx-auto flex max-w-[480px] items-center justify-between gap-4 rounded-t-3xl border border-white/65 bg-white/85 px-4 py-3 shadow-[0_-8px_30px_rgba(61,44,44,0.08)]">
        <div>
          <p className="text-xs text-text-secondary">Текущая стоимость</p>
          <p
            className={`font-display text-[1.65rem] leading-tight text-text-primary transition-all duration-300 ${isPriceAnimating ? 'scale-[1.03] opacity-90' : 'scale-100 opacity-100'}`}
          >
            {formatPrice(animatedPrice)}
          </p>
        </div>
        <button
          className={`tap-scale inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold shadow-card transition duration-200 ${isLastStep ? 'py-3.5 text-base' : 'py-3'} ${buttonClass}`}
          onClick={onNext}
          disabled={!canProceed}
          type="button"
        >
          <span>{buttonText}</span>
          {isLastStep ? (
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M3.75 10H16.25M16.25 10L11 4.75M16.25 10L11 15.25"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : null}
        </button>
      </div>
    </div>
  );
}
