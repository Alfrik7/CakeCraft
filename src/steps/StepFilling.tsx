import { useMemo, type CSSProperties } from 'react';
import { MenuCard } from '../components/MenuCard';
import { StepHeader } from '../components/StepHeader';
import { useMenuDataContext } from '../context/MenuDataContext';
import { useOrderContext } from '../context/OrderContext';
import { calculateTotal } from '../lib/price';
import type { MenuItem } from '../types';

interface StepFillingProps {
  onBack: () => void;
}

export function StepFilling({ onBack }: StepFillingProps) {
  const { order, setOrder } = useOrderContext();
  const { menuData, hasMenuError } = useMenuDataContext();
  const fillingItems = menuData.filling;
  const decorItemsById = useMemo(
    () =>
      menuData.decor.reduce<Record<string, MenuItem>>((acc, item) => {
        acc[item.id] = item;
        return acc;
      }, {}),
    [menuData.decor],
  );

  const selectedFilling = useMemo(
    () => fillingItems.find((item) => item.id === order.filling_id) ?? null,
    [fillingItems, order.filling_id],
  );

  const handleSelectFilling = (nextItem: MenuItem) => {
    setOrder((prev) => {
      const guests = prev.servings ?? 0;
      const selectedDecorItems = prev.decor_items
        .map((id) => decorItemsById[id])
        .filter((item): item is MenuItem => Boolean(item));
      const nextTotalPrice = calculateTotal(guests, nextItem, selectedDecorItems);

      return {
        ...prev,
        filling_id: nextItem.id,
        total_price: nextTotalPrice,
      };
    });
  };

  return (
    <section className="px-4 py-6 mb-24">
      <StepHeader title="Выберите начинку" subtitle="Цена пересчитывается автоматически" onBack={onBack} />

      <div className="mt-8">
        <div className="content-fade-in">
          {hasMenuError ? (
            <p className="mb-4 rounded-2xl border border-blush/35 bg-cream p-4 text-[13px] text-truffle shadow-soft">
              Не удалось загрузить начинки из каталога.
            </p>
          ) : null}

          {fillingItems.length === 0 ? (
            <p className="text-center text-[15px] text-truffle py-8">У кондитера пока нет доступных начинок.</p>
          ) : null}

          {fillingItems.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {fillingItems.map((item, index) => {
                const isSelected = selectedFilling?.id === item.id;

                return (
                  <div
                    key={item.id}
                    className="stagger-item"
                    style={{ '--stagger-delay': `${index * 60}ms` } as CSSProperties}
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
      </div>
    </section>
  );
}