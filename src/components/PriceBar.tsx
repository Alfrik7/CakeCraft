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

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 pb-[calc(12px+env(safe-area-inset-bottom))]">
      <div 
        className="mx-auto flex max-w-[480px] items-center justify-between gap-4 rounded-t-3xl border border-blush/30 bg-surface/90 px-5 py-4 backdrop-blur-xl"
        style={{ boxShadow: '0 -8px 24px rgb(var(--color-text-primary-rgb) / 0.08)' }}
      >
        <div className="flex flex-col">
          <p className="text-[12px] font-sans text-truffle">Текущая стоимость</p>
          <p
            className={`font-display text-[28px] leading-none text-chocolate transition-all duration-300 ${isPriceAnimating ? 'scale-[1.02] opacity-90' : 'scale-100 opacity-100'}`}
          >
            {formatPrice(animatedPrice)}
          </p>
        </div>
        <button
          className="tap-scale btn-gradient inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-6 font-semibold"
          onClick={onNext}
          disabled={!canProceed || isSubmitting}
          type="button"
        >
          <span className="text-white text-[15px]">{buttonText}</span>
          {isLastStep && !isSubmitting ? (
            <svg className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="none" aria-hidden="true">
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
