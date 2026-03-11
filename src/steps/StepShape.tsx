import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { MenuCard } from '../components/MenuCard';
import { StepHeader } from '../components/StepHeader';
import { useMenuDataContext } from '../context/MenuDataContext';
import { useOrderContext } from '../context/OrderContext';
import { calculateTotal, estimateWeightKg } from '../lib/price';
import { triggerTelegramHaptic } from '../lib/telegram';
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
  const committedGuestsCount = order.servings ?? 4;
  const [guestsInputValue, setGuestsInputValue] = useState(() => String(committedGuestsCount));
  const parsedGuestsInput = Number(guestsInputValue);
  const previewGuestsCount =
    guestsInputValue.trim() === ''
      ? 4
      : Number.isFinite(parsedGuestsInput)
        ? parsedGuestsInput
        : committedGuestsCount;
  const estimatedWeightKg = estimateWeightKg(previewGuestsCount);
  const weightLabel = String(estimatedWeightKg);

  useEffect(() => {
    setGuestsInputValue(String(committedGuestsCount));
  }, [committedGuestsCount]);

  // Set default servings to 4 on mount so the "Next" button is active
  useEffect(() => {
    if (order.servings == null) {
      handleGuestsChange(4);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGuestsChange = (value: number) => {
    triggerTelegramHaptic('selection');
    const guests = Math.min(300, Math.max(4, Math.round(value)));
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

  const handleGuestsBlur = () => {
    const normalizedValue = guestsInputValue.trim();
    const parsed = Number(normalizedValue);
    const nextGuests = Number.isFinite(parsed) ? parsed : 4;
    const clampedGuests = Math.min(300, Math.max(4, Math.round(nextGuests)));

    setGuestsInputValue(String(clampedGuests));
    handleGuestsChange(clampedGuests);
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
    <section className="px-4 py-6 mb-24">
      <StepHeader
        title="Выберите форму"
        subtitle="Определитесь с формой и количеством гостей"
        onBack={onBack}
      />

      <div className="mt-8">
        <div className="content-fade-in">
          {useFallback || hasMenuError ? (
            <div className="mb-4 rounded-2xl border border-blush/35 bg-cream p-4 text-[13px] text-truffle shadow-soft">
              {hasMenuError
                ? 'Не удалось загрузить формы из каталога. Показываем базовые варианты.'
                : 'Формы из каталога не найдены. Показываем базовые варианты.'}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            {(useFallback ? fallbackShapeItems : shapeItems).map((item, index) => (
              <div
                key={item.id}
                className="stagger-item h-full"
                style={{ '--stagger-delay': `${index * 60}ms` } as CSSProperties}
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

      <div className="mt-8 rounded-[24px] bg-vanilla border border-blush/35 p-5 shadow-soft">
        <p className="text-[15px] font-bold text-chocolate">Количество гостей</p>
        <p className="text-[13px] text-truffle mt-1">От 4 до 300 человек</p>
        <div className="mt-4 flex items-center justify-between gap-4">
          <input
            type="number"
            min={4}
            max={300}
            step={1}
            value={guestsInputValue}
            placeholder="4"
            onFocus={(event) => event.currentTarget.select()}
            onChange={(event) => setGuestsInputValue(event.target.value)}
            onBlur={handleGuestsBlur}
            className="min-h-[48px] w-28 rounded-xl border border-blush/35 bg-cream px-3 text-center font-sans text-[18px] font-bold text-chocolate outline-none shadow-inner"
            aria-label="Количество гостей"
          />
          <div className="text-right transition-all duration-300">
            <p className="font-display text-[24px] text-rose leading-none font-bold">≈ {weightLabel} кг</p>
          </div>
        </div>
      </div>
    </section>
  );
}
