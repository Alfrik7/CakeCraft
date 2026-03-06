import { useOrderContext } from '../context/OrderContext';
import { triggerTelegramHaptic } from '../lib/telegram';

const OCCASION_OPTIONS = [
  { value: 'birthday', label: 'День рождения', icon: '🎂' },
  { value: 'wedding', label: 'Свадьба', icon: '💒' },
  { value: 'kids_party', label: 'Детский праздник', icon: '🎈' },
  { value: 'corporate', label: 'Корпоратив', icon: '🏢' },
  { value: 'other', label: 'Без повода / Другое', icon: '🎁' },
] as const;

export function StepOccasion() {
  const { order, updateOrder } = useOrderContext();

  return (
    <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-semibold text-gray-900">Шаг 1. Повод</h2>
      <p className="mt-2 text-sm text-gray-600">Выберите повод для торта.</p>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {OCCASION_OPTIONS.map((option) => {
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
                'flex min-h-[52px] items-center gap-3 rounded-xl border px-4 py-3 text-left transition',
                isSelected
                  ? 'border-rose-400 bg-rose-50 text-rose-900 ring-1 ring-rose-200'
                  : 'border-rose-100 bg-white text-gray-700 hover:border-rose-200 hover:bg-rose-50/40',
              ].join(' ')}
              aria-pressed={isSelected}
            >
              <span className="text-xl leading-none" aria-hidden="true">
                {option.icon}
              </span>
              <span className="text-sm font-medium">{option.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
