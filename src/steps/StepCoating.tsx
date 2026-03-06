import { useEffect, useMemo, useState, type CSSProperties } from 'react';
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
    <section className="rounded-3xl bg-white/80 p-5 shadow-card backdrop-blur-sm sm:p-6">
      <h2 className="text-center font-display text-3xl text-text-primary">Выберите покрытие</h2>
      <p className="mt-2 text-center text-sm text-text-secondary">И определитесь с цветом торта</p>

      <div className="mt-5">
        {loading ? <SkeletonMenuGrid /> : null}
        {!loading ? (
          <div className="content-fade-in">
            {loadError ? (
              <p className="mb-3 rounded-2xl border border-rose-200 bg-rose-50/80 px-3 py-2 text-xs text-rose-700">
                Не удалось загрузить покрытия из каталога.
              </p>
            ) : null}

            {coatingItems.length === 0 ? (
              <p className="text-center text-sm text-text-secondary">У кондитера пока нет доступных покрытий.</p>
            ) : null}

            {coatingItems.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {coatingItems.map((item, index) => {
                  const isSelected = selectedCoating?.id === item.id;

                  return (
                    <div
                      key={item.id}
                      className="stagger-item"
                      style={{ '--stagger-delay': `${index * 50}ms` } as CSSProperties}
                    >
                      <MenuCard
                        item={item}
                        selected={isSelected}
                        onSelect={() => handleSelectCoating(item)}
                        mode="single"
                        servings={order.servings}
                      />
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-6 rounded-2xl bg-secondary/80 p-4 shadow-card">
        <p className="font-display text-xl text-text-primary">Выберите цвет</p>
        <p className="mt-1 text-xs text-text-secondary">Можно выбрать из палитры или указать свой оттенок</p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
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
                className="tap-scale tap-target group flex flex-col items-center gap-1 text-xs font-medium text-text-secondary transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2"
                aria-pressed={isSelected}
                aria-label={`Выбрать цвет: ${color.label}`}
              >
                <span
                  className={[
                    'h-10 w-10 rounded-full border border-white/80 shadow-card transition duration-300 ease-out',
                    color.swatchClass,
                    color.value === 'белый' ? 'shadow-inner shadow-rose-200' : '',
                    isSelected ? 'scale-110 ring-2 ring-primary-to ring-offset-2 ring-offset-secondary' : 'group-hover:scale-105',
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
              'tap-scale flex min-h-[44px] items-center gap-2 rounded-full border bg-white px-4 py-2 text-sm font-semibold transition duration-300',
              isCustomColor
                ? 'scale-105 border-primary-to text-primary-to ring-2 ring-primary-to/30'
                : 'border-rose-200 text-text-secondary hover:border-primary-from hover:text-text-primary',
            ].join(' ')}
            aria-pressed={isCustomColor}
          >
            <span
              className={[
                'grid h-5 w-5 place-items-center rounded-full text-sm leading-none transition',
                isCustomColor ? 'bg-[var(--gradient-primary)] text-white' : 'bg-rose-100 text-rose-600',
              ].join(' ')}
              aria-hidden="true"
            >
              +
            </span>
            Свой цвет
          </button>
        </div>

        <div
          className={[
            'transition-all duration-300 ease-out',
            isCustomColor || order.color === '' ? 'mt-3 max-h-28 opacity-100' : 'max-h-0 overflow-hidden opacity-0',
          ].join(' ')}
        >
          <label className="block text-sm text-text-secondary">
            Укажите желаемый цвет
            <input
              type="text"
              value={order.color ?? ''}
              onChange={(event) => updateOrder({ color: event.target.value })}
              placeholder="Например: лавандовый"
              className="mt-1 min-h-[44px] w-full rounded-xl border border-transparent bg-surface px-3 py-2 text-sm text-text-primary outline-none transition duration-300 focus:ring-2 focus:ring-primary-from/40"
            />
          </label>
        </div>
      </div>
    </section>
  );
}
