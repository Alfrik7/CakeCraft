import { useEffect, useMemo, useState } from 'react';
import { MenuCard } from '../components/MenuCard';
import { useOrderContext } from '../context/OrderContext';
import { getMenuItems } from '../lib/api';
import { getItemPrice } from '../lib/price';
import type { MenuItem } from '../types';

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
          <div className="grid grid-cols-2 gap-3">
            {fillingItems.map((item) => {
              const isSelected = selectedFilling?.id === item.id;

              return (
                <MenuCard
                  key={item.id}
                  item={item}
                  selected={isSelected}
                  onSelect={() => handleSelectFilling(item)}
                  mode="single"
                  servings={order.servings}
                />
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}
