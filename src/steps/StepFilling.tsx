import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { MenuCard } from '../components/MenuCard';
import { SkeletonMenuGrid } from '../components/SkeletonMenuGrid';
import { StepHeader } from '../components/StepHeader';
import { useOrderContext } from '../context/OrderContext';
import { getMenuItems } from '../lib/api';
import { getItemPrice } from '../lib/price';
import type { MenuItem } from '../types';

interface StepFillingProps {
  bakerId: string;
  onBack: () => void;
}

export function StepFilling({ bakerId, onBack }: StepFillingProps) {
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
      <StepHeader title="Выберите начинку" subtitle="Цена пересчитывается автоматически" onBack={onBack} />

      <div className="mt-5">
        {loading ? <SkeletonMenuGrid /> : null}
        {!loading ? (
          <div className="content-fade-in">
            {loadError ? (
              <p className="mb-3 rounded-2xl border border-primary-from/25 bg-primary-from/10 px-3 py-2 text-xs text-text-primary">
                Не удалось загрузить начинки из каталога.
              </p>
            ) : null}

            {fillingItems.length === 0 ? (
              <p className="text-center text-sm text-text-secondary">У кондитера пока нет доступных начинок.</p>
            ) : null}

            {fillingItems.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {fillingItems.map((item, index) => {
                  const isSelected = selectedFilling?.id === item.id;

                  return (
                    <div
                      key={item.id}
                      className="stagger-item"
                      style={{ '--stagger-delay': `${index * 50}ms` } as CSSProperties}
                    >
                      <MenuCard
                        item={item}
                        selected={isSelected}
                        onSelect={() => handleSelectFilling(item)}
                        mode="single"
                        servings={order.servings}
                        priceMode="per_kg_only"
                        descriptionMode="toggle"
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
