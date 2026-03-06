import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { Baker } from '../types';
import { useOrderContext } from '../context/OrderContext';
import { PriceBar } from './PriceBar';
import { ProgressBar } from './ProgressBar';
import { StepOccasion } from '../steps/StepOccasion';
import { StepShape } from '../steps/StepShape';
import { StepFilling } from '../steps/StepFilling';
import { StepCoating } from '../steps/StepCoating';
import { StepDecor } from '../steps/StepDecor';
import { StepCheckout } from '../steps/StepCheckout';
import { applyTelegramTheme, getTelegramWebApp, initTelegramWebApp, triggerTelegramHaptic } from '../lib/telegram';

const TOTAL_STEPS = 6;

interface ConstructorLayoutProps {
  baker: Baker;
}

export function ConstructorLayout({ baker }: ConstructorLayoutProps) {
  const [step, setStep] = useState(1);
  const [stepDirection, setStepDirection] = useState<'forward' | 'backward'>('forward');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [checkoutCanSubmit, setCheckoutCanSubmit] = useState(false);
  const [checkoutSubmitHandler, setCheckoutSubmitHandler] = useState<(() => Promise<boolean>) | null>(null);
  const { order, resetOrder } = useOrderContext();
  const handleBackStep = useCallback(() => {
    setStep((prev) => {
      if (prev <= 1) {
        return prev;
      }

      setStepDirection('backward');
      triggerTelegramHaptic('selection');
      return prev - 1;
    });
  }, []);

  const registerCheckoutSubmitHandler = (handler: (() => Promise<boolean>) | null) => {
    setCheckoutSubmitHandler(() => handler);
  };

  const isLastStep = step === TOTAL_STEPS;
  const bakerInitial = baker.name.trim().charAt(0).toUpperCase() || 'C';
  const canProceed = useMemo(() => {
    if (isSubmitting || isSubmitted) {
      return false;
    }

    if (step === 1) {
      return Boolean(order.occasion);
    }

    if (step === 2) {
      return Boolean(order.shape) && Boolean(order.servings);
    }

    if (step === 3) {
      return Boolean(order.filling_id);
    }

    if (step === 4) {
      return Boolean(order.coating_id) && Boolean(order.color?.trim());
    }

    if (step === 6) {
      return checkoutCanSubmit;
    }

    return true;
  }, [
    checkoutCanSubmit,
    isSubmitted,
    isSubmitting,
    order.coating_id,
    order.color,
    order.filling_id,
    order.occasion,
    order.servings,
    order.shape,
    step,
  ]);

  const handleNext = async () => {
    triggerTelegramHaptic('selection');

    if (!isLastStep) {
      setStepDirection('forward');
      setStep((prev) => prev + 1);
      return;
    }

    if (!checkoutSubmitHandler) {
      return;
    }

    setIsSubmitting(true);
    const success = await checkoutSubmitHandler();
    setIsSubmitting(false);

    if (success) {
      triggerTelegramHaptic('success');
      setIsSubmitted(true);
    }
  };

  const handleRestart = useCallback(() => {
    triggerTelegramHaptic('selection');
    resetOrder();
    setIsSubmitted(false);
    setStepDirection('backward');
    setStep(1);
    setCheckoutCanSubmit(false);
    setCheckoutSubmitHandler(null);
  }, [resetOrder]);

  useEffect(() => {
    const app = initTelegramWebApp();

    if (!app) {
      return;
    }

    applyTelegramTheme(app);
  }, []);

  useEffect(() => {
    const app = getTelegramWebApp();

    if (!app) {
      return;
    }

    if (step > 1 && !isSubmitted) {
      app.BackButton.show();
      app.BackButton.onClick(handleBackStep);

      return () => {
        app.BackButton.offClick(handleBackStep);
        app.BackButton.hide();
      };
    }

    app.BackButton.offClick(handleBackStep);
    app.BackButton.hide();

    return undefined;
  }, [handleBackStep, isSubmitted, step]);

  return (
    <main className="relative min-h-screen overflow-x-clip bg-[var(--gradient-primary-soft)] pb-[calc(132px+env(safe-area-inset-bottom))]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <span className="absolute -left-16 top-10 h-48 w-48 rounded-full bg-primary-from/10 blur-3xl" />
        <span className="absolute -right-12 top-56 h-56 w-56 rounded-full bg-primary-to/10 blur-3xl" />
        <span className="absolute bottom-20 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-[480px] flex-col gap-4 px-3 pb-2 pt-3 sm:px-4 sm:pt-4">
        <div className="sticky top-0 z-30 -mx-3 border-b border-primary-from/20 bg-surface/55 px-3 pb-3 pt-[max(env(safe-area-inset-top),0.5rem)] backdrop-blur-xl sm:-mx-4 sm:px-4 sm:pt-4">
          <ProgressBar currentStep={step} totalSteps={TOTAL_STEPS} />
        </div>

        <header className="rounded-[2rem] bg-surface/90 p-4 shadow-card backdrop-blur-sm">
          <div className="flex items-center gap-3">
            {baker.logo_url ? (
              <img
                src={baker.logo_url}
                alt={`Логотип ${baker.name}`}
                className="h-14 w-14 rounded-full object-cover shadow-card"
                loading="lazy"
              />
            ) : (
              <div
                className="grid h-14 w-14 place-items-center rounded-full font-display text-xl text-white shadow-card"
                style={{ backgroundImage: 'var(--gradient-primary)' }}
              >
                {bakerInitial}
              </div>
            )}
            <div>
              <p className="font-display text-2xl leading-tight text-text-primary">{baker.name}</p>
              <p className="text-sm text-text-secondary">Кондитерская студия</p>
            </div>
          </div>
          <h1 className="mt-3 text-base font-medium text-text-primary">{baker.welcome_message}</h1>
        </header>

        <div
          key={step}
          className={stepDirection === 'forward' ? 'step-transition-forward' : 'step-transition-backward'}
        >
          {step === 1 ? <StepOccasion /> : null}
          {step === 2 ? <StepShape bakerId={baker.id} /> : null}
          {step === 3 ? <StepFilling bakerId={baker.id} /> : null}
          {step === 4 ? <StepCoating bakerId={baker.id} /> : null}
          {step === 5 ? <StepDecor bakerId={baker.id} /> : null}
          {step === 6 && !isSubmitted ? (
            <StepCheckout
              baker={baker}
              registerSubmitHandler={registerCheckoutSubmitHandler}
              onCanSubmitChange={setCheckoutCanSubmit}
            />
          ) : null}
          {step === 6 && isSubmitted ? (
            <section className="relative overflow-hidden rounded-[2rem] bg-surface p-5 text-center shadow-card sm:p-6">
              <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                {Array.from({ length: 18 }).map((_, index) => (
                  <span
                    key={`confetti-${index}`}
                    className="confetti-piece"
                    style={
                      {
                        '--confetti-left': `${4 + ((index * 11) % 92)}%`,
                        '--confetti-delay': `${(index % 7) * 120}ms`,
                        '--confetti-duration': `${3000 + (index % 5) * 320}ms`,
                        '--confetti-rotate': `${index % 2 === 0 ? 1 : -1}turn`,
                        '--confetti-color': index % 3 === 0 ? '#F8A4B8' : index % 3 === 1 ? '#FF6B81' : '#FCD5CE',
                      } as CSSProperties
                    }
                  />
                ))}
              </div>

              <div className="relative z-10">
                <p className="success-cake-emoji mx-auto mt-3 grid h-24 w-24 place-items-center rounded-full bg-primary-from/12 text-6xl shadow-card">
                  🎂
                </p>
                <h2 className="mt-5 font-display text-4xl text-text-primary">Заказ отправлен!</h2>
                <p className="mt-3 text-base text-text-secondary">{baker.name} свяжется с вами в ближайшее время</p>
                <button
                  type="button"
                  onClick={handleRestart}
                  className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-full border border-primary-from/40 bg-white/70 px-6 py-2.5 text-sm font-semibold text-text-primary shadow-sm transition duration-200 hover:border-primary-from/60 hover:bg-white active:scale-[0.98]"
                >
                  Собрать ещё один торт
                </button>
              </div>
            </section>
          ) : null}
        </div>
      </div>

      {!isSubmitted ? (
        <PriceBar
          totalPrice={order.total_price}
          isLastStep={isLastStep}
          canProceed={canProceed}
          isSubmitting={isSubmitting}
          onNext={handleNext}
        />
      ) : null}
    </main>
  );
}
