import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { Baker } from '../types';
import { useOrderContext } from '../context/OrderContext';
import { PriceBar } from './PriceBar';
import { ProgressBar } from './ProgressBar';
import { StepOccasion } from '../steps/StepOccasion';
import { StepShape } from '../steps/StepShape';
import { StepFilling } from '../steps/StepFilling';
import { StepDecor } from '../steps/StepDecor';
import { StepCheckout } from '../steps/StepCheckout';
import { applyTelegramTheme, getTelegramWebApp, initTelegramWebApp, triggerTelegramHaptic } from '../lib/telegram';
import { applyBakerTheme } from '../lib/theme';

const TOTAL_STEPS = 5;

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
      return (
        Boolean(order.shape) &&
        typeof order.servings === 'number' &&
        order.servings >= 4 &&
        order.servings <= 50
      );
    }

    if (step === 3) {
      return Boolean(order.filling_id);
    }

    if (step === 5) {
      return checkoutCanSubmit;
    }

    return true;
  }, [
    checkoutCanSubmit,
    isSubmitted,
    isSubmitting,
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
    applyBakerTheme(baker.theme);

    return () => {
      applyBakerTheme('pink');
    };
  }, [baker.theme]);

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
    <main className="relative min-h-screen overflow-x-clip pb-[calc(132px+env(safe-area-inset-bottom))]">
      <div className="relative mx-auto flex w-full max-w-[480px] flex-col px-3 sm:px-4">
        <div className="sticky top-0 z-50 -mx-3 border-b border-[#F4E0E4]/60 bg-cream/80 px-3 pt-[max(env(safe-area-inset-top),0.5rem)] backdrop-blur-xl sm:-mx-4 sm:px-4 sm:pt-4">
          <ProgressBar currentStep={step} totalSteps={TOTAL_STEPS} />
        </div>

        <header className="flex flex-col gap-4 mt-6 mb-2">
          <div className="flex items-center gap-4 px-2">
            {baker.logo_url ? (
              <img
                src={baker.logo_url}
                alt={`Логотип ${baker.name}`}
                className="h-14 w-14 rounded-full object-cover shadow-soft ring-2 ring-blush"
                loading="lazy"
              />
            ) : (
              <div className="grid h-14 w-14 place-items-center rounded-full font-display text-[22px] text-white shadow-soft ring-2 ring-blush btn-gradient">
                {bakerInitial}
              </div>
            )}
            <div>
              <p className="font-display text-[20px] font-bold leading-tight text-chocolate">{baker.name}</p>
              <p className="text-[13px] font-medium text-truffle">Кондитерская студия</p>
            </div>
          </div>
          {baker.welcome_message ? (
            <div className="rounded-2xl bg-vanilla p-4 shadow-soft border border-[#F4E0E4]">
              <h1 className="text-[14px] text-chocolate leading-relaxed">{baker.welcome_message}</h1>
            </div>
          ) : null}
        </header>

        <div
          key={step}
          className={stepDirection === 'forward' ? 'step-transition-forward' : 'step-transition-backward'}
        >
          {step === 1 ? <StepOccasion /> : null}
          {step === 2 ? <StepShape bakerId={baker.id} onBack={handleBackStep} /> : null}
          {step === 3 ? <StepFilling onBack={handleBackStep} /> : null}
          {step === 4 ? <StepDecor onBack={handleBackStep} /> : null}
          {step === 5 && !isSubmitted ? (
            <StepCheckout
              baker={baker}
              onBack={handleBackStep}
              registerSubmitHandler={registerCheckoutSubmitHandler}
              onCanSubmitChange={setCheckoutCanSubmit}
            />
          ) : null}
          {step === 5 && isSubmitted ? (
            <section className="relative overflow-hidden rounded-[24px] bg-vanilla px-6 py-10 text-center shadow-soft border border-[#F4E0E4] mt-8 mb-24">
              <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                {Array.from({ length: 24 }).map((_, index) => (
                  <span
                    key={`confetti-${index}`}
                    className="confetti-piece"
                    style={
                      {
                        '--confetti-left': `${4 + ((index * 11) % 92)}%`,
                        '--confetti-delay': `${(index % 7) * 120}ms`,
                        '--confetti-duration': `${3000 + (index % 5) * 320}ms`,
                        '--confetti-rotate': `${index % 2 === 0 ? 1 : -1}turn`,
                        '--confetti-color':
                          index % 3 === 0
                            ? '#F4A0B0'
                            : index % 3 === 1
                              ? '#C8956C'
                              : '#D4596C',
                      } as CSSProperties
                    }
                  />
                ))}
              </div>

              <div className="relative z-10">
                <p className="success-cake-emoji mx-auto grid h-24 w-24 place-items-center rounded-full bg-cream text-[56px] shadow-soft border border-[#F4E0E4]">
                  🎂
                </p>
                <h2 className="mt-6 font-display text-[32px] font-bold bg-gradient-to-br from-blush to-rose bg-clip-text text-transparent leading-tight pb-1">Заказ отправлен!</h2>
                <p className="mt-2 text-[15px] font-medium text-truffle">{baker.name} свяжется с вами в ближайшее время</p>
                <button
                  type="button"
                  onClick={handleRestart}
                  className="tap-scale mt-8 inline-flex min-h-[44px] items-center justify-center rounded-full border-2 border-[#F4E0E4] bg-white px-6 py-2 text-[14px] font-bold text-chocolate shadow-sm transition-all duration-300 hover:border-rose hover:text-rose active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose/40"
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