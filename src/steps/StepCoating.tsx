import { useEffect, useMemo, useState } from 'react';
import { MenuCard } from '../components/MenuCard';
import { SkeletonMenuGrid } from '../components/SkeletonMenuGrid';
import { useOrderContext } from '../context/OrderContext';
import { getMenuItems } from '../lib/api';
import { getItemPrice } from '../lib/price';
import { triggerTelegramHaptic } from '../lib/telegram';
import type { MenuItem } from '../types';

const PRESET_COLORS = [
  { id: 'white', label: 'Белый', value: 'белый', swatchClass: 'bg-white' },
  { id: 'pink', label: 'Розовый', value: 'розовый', swatchClass: 'bg-pink-300' },
  { id: 'sky', label: 'Голубой', value: 'голубой', swatchClass: 'bg-sky-300' },
  { id: 'chocolate', label: 'Шоколадный', value: 'шоколадный', swatchClass: 'bg-amber-800' },
  { id: 'red', label: 'Красный', value: 'красный', swatchClass: 'bg-red-500' },
  { id: 'black', label: 'Чёрный', value: 'чёрный', swatchClass: 'bg-gray-900' },
] as const;

const PRESET_COLOR_VALUES = new Set<string>(PRESET_COLORS.map((color) => color.value));

interface StepCoatingProps {
  bakerId: string;
}

export function StepCoating({ bakerId }: StepCoatingProps) {
  const { order, setOrder, updateOrder } = useOrderContext();
  const [coatingItems, setCoatingItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const isCustomColor = Boolean(order.color && !PRESET_COLOR_VALUES.has(order.color));

  useEffect(() => {
    let isActive = true;

    async function loadCoatings() {
      setLoading(true);
      setLoadError(false);

      try {
        const items = await getMenuItems(bakerId, 'coating');

        if (!isActive) {
          return;
        }

        setCoatingItems(items);
      } catch {
        if (isActive) {
          setCoatingItems([]);
          setLoadError(true);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    loadCoatings();

    return () => {
      isActive = false;
    };
  }, [bakerId]);

  const selectedCoating = useMemo(
    () => coatingItems.find((item) => item.id === order.coating_id) ?? null,
    [coatingItems, order.coating_id],
  );

  const handleSelectCoating = (nextItem: MenuItem) => {
    setOrder((prev) => {
      const servings = prev.servings ?? 0;
      const currentItem = coatingItems.find((item) => item.id === prev.coating_id) ?? null;
      const currentPrice = getItemPrice(servings, currentItem);
      const nextPrice = getItemPrice(servings, nextItem);
      const nextTotalPrice = Math.max(0, Math.round(prev.total_price - currentPrice + nextPrice));

      return {
        ...prev,
        coating_id: nextItem.id,
        total_price: nextTotalPrice,
      };
    });
  };

  const handleSelectPresetColor = (color: (typeof PRESET_COLORS)[number]) => {
    updateOrder({ color: color.value });
  };

  const handleSelectCustomColor = () => {
    if (isCustomColor) {
      return;
    }

    updateOrder({ color: '' });
  };

  return (
    <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-semibold text-gray-900">Шаг 4. Покрытие и цвет</h2>
      <p className="mt-2 text-sm text-gray-600">Выберите покрытие и оттенок торта.</p>

      <div className="mt-5">
        {loading ? <SkeletonMenuGrid /> : null}
        {loadError ? <p className="text-sm text-amber-700">Не удалось загрузить покрытия из каталога.</p> : null}

        {!loading && coatingItems.length === 0 ? (
          <p className="text-sm text-gray-500">У кондитера пока нет доступных покрытий.</p>
        ) : null}

        {!loading && coatingItems.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {coatingItems.map((item) => {
              const isSelected = selectedCoating?.id === item.id;

              return (
                <MenuCard
                  key={item.id}
                  item={item}
                  selected={isSelected}
                  onSelect={() => handleSelectCoating(item)}
                  mode="single"
                  servings={order.servings}
                />
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="mt-6 border-t border-rose-100 pt-4">
        <p className="text-sm font-medium text-gray-800">Цвет</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PRESET_COLORS.map((color) => {
            const isSelected = order.color === color.value;

            return (
              <button
                key={color.id}
                type="button"
                onClick={() => {
                  triggerTelegramHaptic('selection');
                  handleSelectPresetColor(color);
                }}
                className={[
                  'flex min-h-[44px] items-center gap-2 rounded-xl border px-3 py-2 text-sm transition',
                  isSelected
                    ? 'border-rose-400 bg-rose-50 text-rose-900 ring-1 ring-rose-200'
                    : 'border-rose-100 bg-white text-gray-700 hover:border-rose-200',
                ].join(' ')}
                aria-pressed={isSelected}
              >
                <span
                  className={[
                    'h-4 w-4 rounded-full border border-gray-300',
                    color.swatchClass,
                    color.value === 'белый' ? 'shadow-inner' : '',
                  ].join(' ')}
                  aria-hidden="true"
                />
                {color.label}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => {
              triggerTelegramHaptic('selection');
              handleSelectCustomColor();
            }}
            className={[
              'min-h-[44px] rounded-xl border px-3 py-2 text-sm transition',
              isCustomColor
                ? 'border-rose-400 bg-rose-50 text-rose-900 ring-1 ring-rose-200'
                : 'border-rose-100 bg-white text-gray-700 hover:border-rose-200',
            ].join(' ')}
            aria-pressed={isCustomColor}
          >
            Кастомный
          </button>
        </div>

        {isCustomColor || order.color === '' ? (
          <label className="mt-3 block text-sm text-gray-700">
            Укажите желаемый цвет
            <input
              type="text"
              value={order.color ?? ''}
              onChange={(event) => updateOrder({ color: event.target.value })}
              placeholder="Например: лавандовый"
              className="mt-1 min-h-[44px] w-full rounded-xl border border-rose-100 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
            />
          </label>
        ) : null}
      </div>
    </section>
  );
}
