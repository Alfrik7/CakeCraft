import { useCallback, useEffect, useMemo, useState } from 'react';
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [checkoutCanSubmit, setCheckoutCanSubmit] = useState(false);
  const [checkoutSubmitHandler, setCheckoutSubmitHandler] = useState<(() => Promise<boolean>) | null>(null);
  const { order } = useOrderContext();
  const handleBackStep = useCallback(() => {
    setStep((prev) => {
      if (prev <= 1) {
        return prev;
      }

      triggerTelegramHaptic('selection');
      return prev - 1;
    });
  }, []);

  const registerCheckoutSubmitHandler = (handler: (() => Promise<boolean>) | null) => {
    setCheckoutSubmitHandler(() => handler);
  };

  const isLastStep = step === TOTAL_STEPS;
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
    <main className="min-h-screen bg-rose-50/50 pb-[calc(116px+env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-xl flex-col gap-4 px-3 pt-4 sm:px-4 sm:pt-6">
        <header className="rounded-2xl border border-rose-100 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">{baker.name}</p>
          <h1 className="mt-1 text-lg font-semibold text-gray-900">{baker.welcome_message}</h1>
          <div className="mt-4">
            <ProgressBar currentStep={step} totalSteps={TOTAL_STEPS} />
          </div>
        </header>

        <div key={step} className="step-enter">
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
            <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
              <h2 className="text-2xl font-semibold text-gray-900">Спасибо!</h2>
              <p className="mt-2 text-sm text-gray-600">{baker.name} свяжется с вами в ближайшее время ✨</p>
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
