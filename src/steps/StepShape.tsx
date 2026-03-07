import { useMemo, type CSSProperties } from 'react';
import { MenuCard } from '../components/MenuCard';
import { StepHeader } from '../components/StepHeader';
import { useMenuDataContext } from '../context/MenuDataContext';
import { useOrderContext } from '../context/OrderContext';
import { triggerTelegramHaptic } from '../lib/telegram';
import type { MenuItem } from '../types';

const SERVINGS_OPTIONS = [6, 8, 12, 16, 20] as const;

const SERVINGS_LABELS: Record<(typeof SERVINGS_OPTIONS)[number], string> = {
  6: '6 (600г)',
  8: '8 (800г)',
  12: '12 (1.2кг)',
  16: '16 (1.6кг)',
  20: '20 (2кг)',
};

const FALLBACK_SHAPES = [
  { id: 'fallback-round', name: 'Круглая форма', description: 'Классический вариант для любого повода' },
  { id: 'fallback-square', name: 'Квадратная форма', description: 'Больше места для декора и надписей' },
  { id: 'fallback-heart', name: 'Форма сердце', description: 'Романтичная подача для особенного дня' },
] as const;

interface StepShapeProps {
  bakerId: string;
  onBack: () => void;
}

export function StepShape({ bakerId, onBack }: StepShapeProps) {
  const { order, updateOrder } = useOrderContext();
  const { menuData, hasMenuError } = useMenuDataContext();
  const shapeItems = menuData.shape;

  const fallbackShapeItems = useMemo<MenuItem[]>(
    () =>
      FALLBACK_SHAPES.map((shape, index) => ({
        id: shape.id,
        baker_id: bakerId,
        category: 'shape',
        name: shape.name,
        description: shape.description,
        photo_url: null,
        price: 0,
        price_type: 'fixed',
        is_active: true,
        sort_order: index,
        tags: [],
        created_at: '',
      })),
    [bakerId],
  );

  const useFallback = shapeItems.length === 0;

  return (
    <section className="rounded-3xl bg-white/80 p-5 shadow-card backdrop-blur-sm sm:p-6">
      <StepHeader
        title="Выберите форму"
        subtitle="Определитесь с формой и количеством порций"
        onBack={onBack}
      />

      <div className="mt-5">
        <div className="content-fade-in">
          {useFallback || hasMenuError ? (
            <div className="mb-3 rounded-2xl border border-primary-from/25 bg-primary-from/10 px-3 py-2 text-xs text-text-primary">
              {hasMenuError
                ? 'Не удалось загрузить формы из каталога. Показываем базовые варианты.'
                : 'Формы из каталога не найдены. Показываем базовые варианты.'}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            {useFallback
              ? fallbackShapeItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="stagger-item"
                    style={{ '--stagger-delay': `${index * 50}ms` } as CSSProperties}
                  >
                    <MenuCard
                      item={item}
                      selected={order.shape === item.name}
                      onSelect={() => updateOrder({ shape: item.name })}
                      mode="single"
                      servings={order.servings}
                      priceMode="hidden"
                    />
                  </div>
                ))
              : shapeItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="stagger-item"
                    style={{ '--stagger-delay': `${index * 50}ms` } as CSSProperties}
                  >
                    <MenuCard
                      item={item}
                      selected={order.shape === item.name}
                      onSelect={() => updateOrder({ shape: item.name })}
                      mode="single"
                      servings={order.servings}
                      priceMode="hidden"
                    />
                  </div>
                ))}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-secondary/70 p-4">
        <p className="text-sm font-semibold text-text-primary">Размер торта (порции)</p>
        <div className="-mx-1 mt-3 overflow-x-auto px-1 pb-1">
          <div className="flex min-w-max gap-2">
            {SERVINGS_OPTIONS.map((servings) => {
              const isSelected = order.servings === servings;

              return (
                <button
                  key={servings}
                  type="button"
                  onClick={() => {
                    triggerTelegramHaptic('selection');
                    updateOrder({ servings });
                  }}
                  className={[
                    'tap-scale min-h-[44px] min-w-[96px] rounded-full px-4 py-2 text-sm font-semibold transition duration-300 ease-out',
                    isSelected
                      ? '[background-image:var(--gradient-primary)] text-white shadow-card'
                      : 'border border-primary-from/35 bg-white text-text-primary hover:border-primary-to',
                  ].join(' ')}
                  aria-pressed={isSelected}
                >
                  {SERVINGS_LABELS[servings]}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
