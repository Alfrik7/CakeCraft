import { useMemo, useState } from 'react';
import type { Baker } from '../types';
import { useOrderContext } from '../context/OrderContext';
import { PriceBar } from './PriceBar';
import { ProgressBar } from './ProgressBar';
import { StepPlaceholder } from '../steps/StepPlaceholder';
import { StepOccasion } from '../steps/StepOccasion';
import { StepShape } from '../steps/StepShape';

const TOTAL_STEPS = 6;

interface ConstructorLayoutProps {
  baker: Baker;
}

export function ConstructorLayout({ baker }: ConstructorLayoutProps) {
  const [step, setStep] = useState(1);
  const { order } = useOrderContext();

  const steps = useMemo(
    () => [
      {
        title: 'Шаг 1. Повод',
        description: 'Выберите повод для торта.',
      },
      {
        title: 'Шаг 2. Форма и размер',
        description: 'Определите форму и количество порций.',
      },
      {
        title: 'Шаг 3. Начинка',
        description: 'Выберите вкус и текстуру начинки.',
      },
      {
        title: 'Шаг 4. Покрытие и цвет',
        description: 'Выберите покрытие и цветовую палитру.',
      },
      {
        title: 'Шаг 5. Декор',
        description: 'Добавьте элементы декора и пожелания.',
      },
      {
        title: 'Шаг 6. Оформление заказа',
        description: 'Заполните контактные данные и подтвердите заказ.',
      },
    ],
    [],
  );

  const currentStep = steps[step - 1];
  const isLastStep = step === TOTAL_STEPS;
  const canProceed = useMemo(() => {
    if (step === 1) {
      return Boolean(order.occasion);
    }

    if (step === 2) {
      return Boolean(order.shape) && Boolean(order.servings);
    }

    return true;
  }, [order.occasion, order.servings, order.shape, step]);

  const handleNext = () => {
    if (!isLastStep) {
      setStep((prev) => prev + 1);
    }
  };

  return (
    <main className="min-h-screen bg-rose-50/50 pb-24">
      <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 pt-6">
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
          {step > 2 ? <StepPlaceholder title={currentStep.title} description={currentStep.description} /> : null}
        </div>
      </div>

      <PriceBar totalPrice={order.total_price} isLastStep={isLastStep} canProceed={canProceed} onNext={handleNext} />
    </main>
  );
}
