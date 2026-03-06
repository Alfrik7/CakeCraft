import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { MenuCard } from '../components/MenuCard';
import { SkeletonMenuGrid } from '../components/SkeletonMenuGrid';
import { StepHeader } from '../components/StepHeader';
import { useOrderContext } from '../context/OrderContext';
import { getMenuItems } from '../lib/api';
import { getItemPrice } from '../lib/price';
import { triggerTelegramHaptic } from '../lib/telegram';
import type { MenuItem } from '../types';

const SERVINGS_OPTIONS = [6, 8, 12, 16, 20] as const;

const SERVINGS_HINTS: Record<(typeof SERVINGS_OPTIONS)[number], string> = {
  6: '6 порций ≈ на 4-6 человек',
  8: '8 порций ≈ на 6-8 человек',
  12: '12 порций ≈ на 10-12 человек',
  16: '16 порций ≈ на 14-16 человек',
  20: '20 порций ≈ на 18-20 человек',
};

const FALLBACK_SHAPES = [
  { id: 'fallback-round', name: 'Круглая форма', price: 1800, description: 'Классический вариант для любого повода' },
  { id: 'fallback-square', name: 'Квадратная форма', price: 1950, description: 'Больше места для декора и надписей' },
  { id: 'fallback-heart', name: 'Форма сердце', price: 2100, description: 'Романтичная подача для особенного дня' },
] as const;

interface StepShapeProps {
  bakerId: string;
  onBack: () => void;
}

export function StepShape({ bakerId, onBack }: StepShapeProps) {
  const { order, updateOrder, setOrder } = useOrderContext();
  const [shapeItems, setShapeItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const fallbackShapeItems = useMemo<MenuItem[]>(
    () =>
      FALLBACK_SHAPES.map((shape, index) => ({
        id: shape.id,
        baker_id: bakerId,
        category: 'shape',
        name: shape.name,
        description: shape.description,
        photo_url: null,
        price: shape.price,
        price_type: 'fixed',
        is_active: true,
        sort_order: index,
        tags: [],
        created_at: '',
      })),
    [bakerId],
  );

  useEffect(() => {
    let isActive = true;

    async function loadShapes() {
      setLoading(true);
      setLoadError(false);

      try {
        const items = await getMenuItems(bakerId, 'shape');

        if (!isActive) {
          return;
        }

        setShapeItems(items);
      } catch {
        if (isActive) {
          setShapeItems([]);
          setLoadError(true);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    loadShapes();

    return () => {
      isActive = false;
    };
  }, [bakerId]);

  const selectedShapeItem = useMemo(
    () => shapeItems.find((item) => item.name === order.shape) ?? null,
    [shapeItems, order.shape],
  );
  const selectedFallbackShape = useMemo(
    () => FALLBACK_SHAPES.find((item) => item.name === order.shape) ?? null,
    [order.shape],
  );

  useEffect(() => {
    const servings = order.servings;
    let nextTotal = 0;

    if (servings && selectedShapeItem) {
      nextTotal = Math.round(getItemPrice(servings, selectedShapeItem));
    } else if (selectedFallbackShape) {
      nextTotal = selectedFallbackShape.price;
    }

    setOrder((prev) => {
      if (prev.total_price === nextTotal) {
        return prev;
      }

      return { ...prev, total_price: nextTotal };
    });
  }, [order.servings, selectedShapeItem, selectedFallbackShape, setOrder]);

  const servingsHint = order.servings ? SERVINGS_HINTS[order.servings as keyof typeof SERVINGS_HINTS] : null;
  const useFallback = !loading && shapeItems.length === 0;

  return (
    <section className="rounded-3xl bg-white/80 p-5 shadow-card backdrop-blur-sm sm:p-6">
      <StepHeader
        title="Выберите форму"
        subtitle="Определитесь с формой и количеством порций"
        onBack={onBack}
      />

      <div className="mt-5">
        {loading ? (
          <SkeletonMenuGrid />
        ) : (
          <div className="content-fade-in">
            {useFallback || loadError ? (
              <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50/80 px-3 py-2 text-xs text-rose-700">
                {useFallback
                  ? 'Формы из каталога не найдены. Показываем базовые варианты.'
                  : 'Не удалось загрузить формы из каталога.'}
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
                      />
                    </div>
                  ))}
            </div>
          </div>
        )}
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
                    'tap-scale min-h-[44px] min-w-[58px] rounded-full px-4 py-2 text-sm font-semibold transition duration-300 ease-out',
                    isSelected
                      ? 'bg-[var(--gradient-primary)] text-white shadow-card'
                      : 'border border-primary-from/35 bg-white text-text-primary hover:border-primary-to',
                  ].join(' ')}
                  aria-pressed={isSelected}
                >
                  {servings}
                </button>
              );
            })}
          </div>
        </div>
        <p className="mt-3 text-xs text-rose-800">
          <span className="rounded-full bg-rose-200/80 px-2 py-0.5 font-semibold text-rose-900">Подсказка</span>{' '}
          {servingsHint ?? 'Выберите порции, чтобы увидеть ориентир по количеству гостей.'}
        </p>
      </div>
    </section>
  );
}
