import type { CSSProperties } from 'react';
import { useOrderContext } from '../context/OrderContext';
import { triggerTelegramHaptic } from '../lib/telegram';

const OCCASION_OPTIONS = [
  {
    value: 'birthday',
    label: 'День рождения',
    icon: '🎂',
    gradient: 'linear-gradient(135deg, #FFE8EC, #FFF0F3)',
    activeGradient: 'linear-gradient(135deg, #FFD1DA, #FFE3E8)',
  },
  {
    value: 'wedding',
    label: 'Свадьба',
    icon: '💒',
    gradient: 'linear-gradient(135deg, #F0E8FF, #F8F0FF)',
    activeGradient: 'linear-gradient(135deg, #E3D1FF, #EFE3FF)',
  },
  {
    value: 'kids_party',
    label: 'Детский праздник',
    icon: '🎈',
    gradient: 'linear-gradient(135deg, #E8FFE8, #F0FFF0)',
    activeGradient: 'linear-gradient(135deg, #D1FFD1, #E3FFE3)',
  },
  {
    value: 'corporate',
    label: 'Корпоратив',
    icon: '🏢',
    gradient: 'linear-gradient(135deg, #E8F0FF, #F0F5FF)',
    activeGradient: 'linear-gradient(135deg, #D1E3FF, #E3EFFF)',
  },
  {
    value: 'other',
    label: 'Без повода',
    icon: '🎁',
    gradient: 'linear-gradient(135deg, #FFF5E8, #FFFAF0)',
    activeGradient: 'linear-gradient(135deg, #FFE8D1, #FFF0E3)',
  },
] as const;

export function StepOccasion() {
  const { order, updateOrder } = useOrderContext();

  return (
    <section className="px-4 py-6 mb-24">
      <h2 className="text-center font-display text-[28px] font-bold text-chocolate">Какой у вас повод?</h2>
      <p className="mt-2 text-center text-[15px] text-truffle">Выберите повод для вашего торта</p>

      <div className="mt-8 grid grid-cols-2 gap-4">
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
                'tap-scale stagger-item group relative aspect-square overflow-hidden rounded-[24px] border border-white text-center transition-all duration-300',
                'flex flex-col items-center justify-center gap-3 px-3 shadow-soft hover:-translate-y-1 hover:shadow-lg',
                isSelected
                  ? 'bounce-scale ring-2 ring-rose shadow-lg'
                  : '',
              ].join(' ')}
              style={
                {
                  '--stagger-delay': `${index * 60}ms`,
                  background: isSelected ? option.activeGradient : option.gradient,
                } as CSSProperties
              }
              aria-pressed={isSelected}
            >
              <span
                className={[
                  'relative text-[48px] leading-none transition-transform duration-300',
                  isSelected ? 'scale-110 drop-shadow-md' : 'group-hover:scale-105',
                ].join(' ')}
                aria-hidden="true"
              >
                {option.icon}
              </span>
              <span className="relative text-[15px] font-bold text-chocolate transition-colors">
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}