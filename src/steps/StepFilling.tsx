import { useEffect, useMemo, useState } from 'react';
import { MenuCard } from '../components/MenuCard';
import { SkeletonMenuGrid } from '../components/SkeletonMenuGrid';
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
    <section className="rounded-3xl bg-white/80 p-5 shadow-card backdrop-blur-sm sm:p-6">
      <h2 className="text-center font-display text-3xl text-text-primary">Выберите начинку</h2>
      <p className="mt-2 text-center text-sm text-text-secondary">Цена пересчитывается автоматически</p>

      <div className="mt-5">
        {loading ? <SkeletonMenuGrid /> : null}
        {loadError ? (
          <p className="mb-3 rounded-2xl border border-rose-200 bg-rose-50/80 px-3 py-2 text-xs text-rose-700">
            Не удалось загрузить начинки из каталога.
          </p>
        ) : null}

        {!loading && fillingItems.length === 0 ? (
          <p className="text-center text-sm text-text-secondary">У кондитера пока нет доступных начинок.</p>
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
