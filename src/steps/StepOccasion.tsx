import type { CSSProperties } from 'react';
import { useOrderContext } from '../context/OrderContext';
import { triggerTelegramHaptic } from '../lib/telegram';

const OCCASION_OPTIONS = [
  {
    value: 'birthday',
    label: 'День рождения',
    icon: '🎂',
    gradientClass: 'from-rose-200 via-pink-100 to-orange-100',
  },
  {
    value: 'wedding',
    label: 'Свадьба',
    icon: '💒',
    gradientClass: 'from-fuchsia-200 via-rose-100 to-pink-100',
  },
  {
    value: 'kids_party',
    label: 'Детский праздник',
    icon: '🎈',
    gradientClass: 'from-sky-200 via-cyan-100 to-blue-100',
  },
  {
    value: 'corporate',
    label: 'Корпоратив',
    icon: '🏢',
    gradientClass: 'from-amber-200 via-orange-100 to-rose-100',
  },
  {
    value: 'other',
    label: 'Без повода',
    icon: '🎁',
    gradientClass: 'from-violet-200 via-purple-100 to-pink-100',
  },
] as const;

export function StepOccasion() {
  const { order, updateOrder } = useOrderContext();

  return (
    <section className="rounded-3xl bg-white/80 p-5 shadow-card backdrop-blur-sm sm:p-6">
      <h2 className="text-center font-display text-3xl text-text-primary">Какой у вас повод?</h2>
      <p className="mt-2 text-center text-sm text-text-secondary">Выберите повод для вашего торта</p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {OCCASION_OPTIONS.map((option, index) => {
          const isSelected = order.occasion === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                triggerTelegramHaptic('selection');
                updateOrder({ occasion: option.value });
              }}
              className={[
                'tap-scale stagger-item group relative aspect-square overflow-hidden rounded-2xl border border-white/70 bg-white text-center shadow-card transition duration-300',
                'flex flex-col items-center justify-center gap-2 px-3',
                isSelected
                  ? 'occasion-selected ring-2 ring-primary-from shadow-card-hover'
                  : 'hover:-translate-y-0.5 hover:shadow-card-hover',
              ].join(' ')}
              style={
                {
                  '--stagger-delay': `${index * 50}ms`,
                } as CSSProperties
              }
              aria-pressed={isSelected}
            >
              <span
                className={[
                  'absolute inset-0 bg-gradient-to-br opacity-85 transition-opacity duration-300',
                  option.gradientClass,
                  isSelected ? 'opacity-100' : 'group-hover:opacity-95',
                ].join(' ')}
                aria-hidden="true"
              />
              <span
                className={[
                  'relative text-4xl leading-none transition-transform duration-300',
                  isSelected ? 'scale-110' : 'group-hover:scale-105',
                ].join(' ')}
                aria-hidden="true"
              >
                {option.icon}
              </span>
              <span className="relative text-sm font-semibold text-text-primary">{option.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
