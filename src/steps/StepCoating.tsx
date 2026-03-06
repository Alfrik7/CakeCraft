import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { MenuCard } from '../components/MenuCard';
import { SkeletonMenuGrid } from '../components/SkeletonMenuGrid';
import { StepHeader } from '../components/StepHeader';
import { useOrderContext } from '../context/OrderContext';
import { getMenuItems } from '../lib/api';
import { getItemPrice } from '../lib/price';
import type { MenuItem } from '../types';

interface StepCoatingProps {
  bakerId: string;
  onBack: () => void;
}

export function StepCoating({ bakerId, onBack }: StepCoatingProps) {
  const { order, setOrder } = useOrderContext();
  const [coatingItems, setCoatingItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

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

  return (
    <section className="rounded-3xl bg-white/80 p-5 shadow-card backdrop-blur-sm sm:p-6">
      <StepHeader title="Выберите покрытие" subtitle="Выберите вариант оформления поверхности торта" onBack={onBack} />

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
    </section>
  );
}
