import { useMemo, type CSSProperties } from 'react';
import { MenuCard } from '../components/MenuCard';
import { StepHeader } from '../components/StepHeader';
import { useMenuDataContext } from '../context/MenuDataContext';
import { useOrderContext } from '../context/OrderContext';
import { calculateTotal, estimateWeightKg } from '../lib/price';
import type { MenuItem } from '../types';

const FALLBACK_SHAPES = [
  { id: 'fallback-round', name: 'Круглая форма', description: 'Классический вариант для любого повода' },
  { id: 'fallback-square', name: 'Квадратная форма', description: 'Больше места для декора и надписей' },
  { id: 'fallback-heart', name: 'Форма сердце', description: 'Романтичная подача для особенного дня' },
] as const;

interface StepShapeProps {
  bakerId: string;
  onBack: () => void;
}

export function StepShape({ bakerId, onBack }: StepShapeProps) {
  const { order, setOrder, updateOrder } = useOrderContext();
  const { menuData, hasMenuError } = useMenuDataContext();
  const shapeItems = menuData.shape;
  const fillingById = useMemo(
    () =>
      menuData.filling.reduce<Record<string, MenuItem>>((acc, item) => {
        acc[item.id] = item;
        return acc;
      }, {}),
    [menuData.filling],
  );
  const decorById = useMemo(
    () =>
      menuData.decor.reduce<Record<string, MenuItem>>((acc, item) => {
        acc[item.id] = item;
        return acc;
      }, {}),
    [menuData.decor],
  );
  const guestsCount = order.servings;
  const estimatedWeightKg = estimateWeightKg(guestsCount ?? 0);
  const weightLabel = String(estimatedWeightKg);

  const handleGuestsChange = (rawValue: string) => {
    if (rawValue === '') {
      setOrder((prev) => ({
        ...prev,
        servings: null,
        total_price: calculateTotal(
          0,
          prev.filling_id ? fillingById[prev.filling_id] : null,
          prev.decor_items.map((id) => decorById[id]).filter((item): item is MenuItem => Boolean(item)),
        ),
      }));
      return;
    }

    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) {
      return;
    }

    const guests = Math.min(50, Math.max(4, Math.round(parsed)));
    setOrder((prev) => ({
      ...prev,
      servings: guests,
      total_price: calculateTotal(
        guests,
        prev.filling_id ? fillingById[prev.filling_id] : null,
        prev.decor_items.map((id) => decorById[id]).filter((item): item is MenuItem => Boolean(item)),
      ),
    }));
  };

  const fallbackShapeItems = useMemo<MenuItem[]>(
    () =>
      FALLBACK_SHAPES.map((shape, index) => ({
        id: shape.id,
        baker_id: bakerId,
        category: 'shape',
        name: shape.name,
        description: shape.description,
        photo_url: null,
        price: 0,
        price_type: 'fixed',
        is_active: true,
        sort_order: index,
        tags: [],
        created_at: '',
      })),
    [bakerId],
  );

  const useFallback = shapeItems.length === 0;

  return (
    <section className="rounded-3xl bg-white/80 p-5 shadow-card backdrop-blur-sm sm:p-6">
      <StepHeader
        title="Выберите форму"
        subtitle="Определитесь с формой и количеством гостей"
        onBack={onBack}
      />

      <div className="mt-5">
        <div className="content-fade-in">
          {useFallback || hasMenuError ? (
            <div className="mb-3 rounded-2xl border border-primary-from/25 bg-primary-from/10 px-3 py-2 text-xs text-text-primary">
              {hasMenuError
                ? 'Не удалось загрузить формы из каталога. Показываем базовые варианты.'
                : 'Формы из каталога не найдены. Показываем базовые варианты.'}
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
                      priceMode="hidden"
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
                      priceMode="hidden"
                    />
                  </div>
                ))}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-secondary/70 p-4">
        <p className="text-sm font-semibold text-text-primary">Количество гостей</p>
        <div className="mt-3 flex items-center gap-3">
          <input
            type="number"
            min={4}
            max={50}
            step={1}
            value={guestsCount ?? ''}
            onChange={(event) => handleGuestsChange(event.target.value)}
            placeholder="4"
            className="min-h-[44px] w-28 rounded-xl border border-primary-from/35 bg-white px-3 py-2 text-sm font-medium text-text-primary outline-none transition focus:ring-2 focus:ring-primary-from/35"
          />
          <p className="text-sm text-text-secondary">≈ {weightLabel} кг</p>
        </div>
      </div>
    </section>
  );
}
