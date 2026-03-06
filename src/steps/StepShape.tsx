import { useEffect, useMemo, useState } from 'react';
import { MenuCard } from '../components/MenuCard';
import { SkeletonMenuGrid } from '../components/SkeletonMenuGrid';
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
  { id: 'fallback-round', name: 'Круглая форма', price: 1800 },
  { id: 'fallback-square', name: 'Квадратная форма', price: 1950 },
  { id: 'fallback-heart', name: 'Форма сердце', price: 2100 },
] as const;

function formatPrice(value: number): string {
  return `${new Intl.NumberFormat('ru-RU').format(Math.round(value))} ₽`;
}

interface StepShapeProps {
  bakerId: string;
}

export function StepShape({ bakerId }: StepShapeProps) {
  const { order, updateOrder, setOrder } = useOrderContext();
  const [shapeItems, setShapeItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

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
    <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-semibold text-gray-900">Шаг 2. Форма и размер</h2>
      <p className="mt-2 text-sm text-gray-600">Выберите форму торта и количество порций.</p>

      <div className="mt-5">
        {loading ? (
          <SkeletonMenuGrid />
        ) : (
          <>
            {useFallback ? (
              <p className="mb-3 text-sm text-amber-700">Формы не найдены. Показываем базовые варианты.</p>
            ) : null}
            {loadError ? <p className="mb-3 text-sm text-amber-700">Не удалось загрузить формы из каталога.</p> : null}

            <div className="grid grid-cols-2 gap-3">
              {useFallback
                ? FALLBACK_SHAPES.map((item) => {
                    const isSelected = order.shape === item.name;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          triggerTelegramHaptic('selection');
                          updateOrder({ shape: item.name });
                        }}
                        className={[
                          'overflow-hidden rounded-xl border bg-white text-left transition',
                          isSelected
                            ? 'border-rose-400 bg-rose-50 ring-1 ring-rose-200'
                            : 'border-rose-100 hover:border-rose-200',
                        ].join(' ')}
                        aria-pressed={isSelected}
                      >
                        <div className="grid h-20 w-full place-items-center bg-rose-50 text-sm text-rose-400">Фото формы</div>
                        <div className="p-3">
                          <p className="text-sm font-medium text-gray-900">{item.name}</p>
                          <p className="mt-1 text-sm text-gray-500">от {formatPrice(item.price)}</p>
                        </div>
                      </button>
                    );
                  })
                : shapeItems.map((item) => (
                    <MenuCard
                      key={item.id}
                      item={item}
                      selected={order.shape === item.name}
                      onSelect={() => updateOrder({ shape: item.name })}
                      mode="single"
                      servings={order.servings}
                    />
                  ))}
            </div>
          </>
        )}
      </div>

      <div className="mt-6 border-t border-rose-100 pt-4">
        <p className="text-sm font-medium text-gray-800">Количество порций</p>
        <div className="mt-3 flex flex-wrap gap-2">
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
                  'min-h-[44px] min-w-[56px] rounded-xl border px-4 py-2 text-sm font-medium transition',
                  isSelected
                    ? 'border-rose-400 bg-rose-50 text-rose-900 ring-1 ring-rose-200'
                    : 'border-rose-100 bg-white text-gray-700 hover:border-rose-200',
                ].join(' ')}
                aria-pressed={isSelected}
              >
                {servings}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-sm text-gray-600">
          {servingsHint ?? 'Выберите количество порций, чтобы увидеть ориентир по количеству гостей.'}
        </p>
      </div>
    </section>
  );
}
