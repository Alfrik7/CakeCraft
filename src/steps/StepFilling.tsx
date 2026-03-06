import { useEffect, useMemo, useState } from 'react';
import { useOrderContext } from '../context/OrderContext';
import { getMenuItems } from '../lib/api';
import { getItemPrice } from '../lib/price';
import type { MenuItem } from '../types';

function formatPrice(value: number): string {
  return `${new Intl.NumberFormat('ru-RU').format(Math.round(value))} ₽`;
}

function formatItemPrice(item: MenuItem, servings: number | null): string {
  if (item.price_type === 'per_kg') {
    if (!servings) {
      return `${formatPrice(item.price)}/кг`;
    }

    const total = getItemPrice(servings, item);
    return `${formatPrice(total)} (${formatPrice(item.price)}/кг)`;
  }

  return formatPrice(item.price);
}

interface StepFillingProps {
  bakerId: string;
}

export function StepFilling({ bakerId }: StepFillingProps) {
  const { order, setOrder } = useOrderContext();
  const [fillingItems, setFillingItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadFillings() {
      setLoading(true);
      setLoadError(false);

      try {
        const items = await getMenuItems(bakerId, 'filling');

        if (!isActive) {
          return;
        }

        setFillingItems(items);
      } catch {
        if (isActive) {
          setFillingItems([]);
          setLoadError(true);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    loadFillings();

    return () => {
      isActive = false;
    };
  }, [bakerId]);

  const selectedFilling = useMemo(
    () => fillingItems.find((item) => item.id === order.filling_id) ?? null,
    [fillingItems, order.filling_id],
  );

  const handleSelectFilling = (nextItem: MenuItem) => {
    setOrder((prev) => {
      const servings = prev.servings ?? 0;
      const currentItem = fillingItems.find((item) => item.id === prev.filling_id) ?? null;
      const currentPrice = getItemPrice(servings, currentItem);
      const nextPrice = getItemPrice(servings, nextItem);
      const nextTotalPrice = Math.max(0, Math.round(prev.total_price - currentPrice + nextPrice));

      return {
        ...prev,
        filling_id: nextItem.id,
        total_price: nextTotalPrice,
      };
    });
  };

  return (
    <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-semibold text-gray-900">Шаг 3. Начинка</h2>
      <p className="mt-2 text-sm text-gray-600">Выберите начинку. Цена пересчитывается автоматически.</p>

      <div className="mt-5">
        {loading ? (
          <p className="text-sm text-gray-500">Загружаем начинки...</p>
        ) : null}
        {loadError ? <p className="text-sm text-amber-700">Не удалось загрузить начинки из каталога.</p> : null}

        {!loading && fillingItems.length === 0 ? (
          <p className="text-sm text-gray-500">У кондитера пока нет доступных начинок.</p>
        ) : null}

        {!loading && fillingItems.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {fillingItems.map((item) => {
              const isSelected = selectedFilling?.id === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectFilling(item)}
                  className={[
                    'overflow-hidden rounded-xl border text-left transition',
                    isSelected
                      ? 'border-rose-400 bg-rose-50 ring-1 ring-rose-200'
                      : 'border-rose-100 bg-white hover:border-rose-200',
                  ].join(' ')}
                  aria-pressed={isSelected}
                >
                  {item.photo_url ? (
                    <img src={item.photo_url} alt={item.name} className="h-28 w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="grid h-20 w-full place-items-center bg-rose-50 text-sm text-rose-400">
                      Фото начинки
                    </div>
                  )}
                  <div className="p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{item.name}</p>
                      {item.tags.map((tag) => (
                        <span key={`${item.id}-${tag}`} className="rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700">
                          {tag}
                        </span>
                      ))}
                    </div>
                    {item.description ? <p className="mt-1 text-sm text-gray-600">{item.description}</p> : null}
                    <p className="mt-2 text-sm font-medium text-gray-700">{formatItemPrice(item, order.servings)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}
