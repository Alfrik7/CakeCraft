import { useEffect, useRef, useState } from 'react';
import { getItemPrice } from '../lib/price';
import { triggerTelegramHaptic } from '../lib/telegram';
import type { MenuItem } from '../types';

interface MenuCardProps {
  item: MenuItem;
  selected: boolean;
  onSelect: () => void;
  mode: 'single' | 'multi';
  servings?: number | null;
  priceMode?: 'default' | 'per_kg_only';
  descriptionMode?: 'static' | 'toggle';
}

const SUPPORTED_TAGS = new Set(['Хит', 'Новинка', 'Сезонное']);

function formatPrice(value: number): string {
  return `${new Intl.NumberFormat('ru-RU').format(Math.round(value))} ₽`;
}

function formatItemPrice(item: MenuItem, servings: number | null, priceMode: 'default' | 'per_kg_only'): string {
  if (priceMode === 'per_kg_only') {
    return `${formatPrice(item.price)}/кг`;
  }

  if (item.price_type === 'per_kg') {
    if (!servings) {
      return `${formatPrice(item.price)}/кг`;
    }

    return `${formatPrice(getItemPrice(servings, item))} (${formatPrice(item.price)}/кг)`;
  }

  return formatPrice(item.price);
}

export function MenuCard({
  item,
  selected,
  onSelect,
  mode,
  servings = null,
  priceMode = 'default',
  descriptionMode = 'static',
}: MenuCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [descriptionHeight, setDescriptionHeight] = useState(0);
  const descriptionRef = useRef<HTMLParagraphElement | null>(null);
  const visibleTags = item.tags.filter((tag) => SUPPORTED_TAGS.has(tag));
  const actionLabel = mode === 'multi' ? (selected ? 'убрать из списка' : 'добавить в список') : 'выбрать';
  const isDescriptionToggleEnabled = descriptionMode === 'toggle';

  useEffect(() => {
    if (!descriptionRef.current) {
      return;
    }

    setDescriptionHeight(descriptionRef.current.scrollHeight);
  }, [item.description, isDescriptionExpanded]);

  const handleClick = () => {
    triggerTelegramHaptic('selection');
    if (isDescriptionToggleEnabled) {
      setIsDescriptionExpanded((prev) => !prev);
      if (!selected) {
        onSelect();
      }
      return;
    }

    onSelect();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={selected}
      aria-label={`${actionLabel}: ${item.name}`}
      className={[
        'tap-scale group relative overflow-hidden rounded-2xl bg-white p-0 text-left shadow-card transition-all duration-300 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2',
        selected
          ? 'menu-card-selected-spring scale-[1.02] ring-2 ring-[#E8677C] shadow-card-hover'
          : 'hover:-translate-y-0.5 hover:shadow-card-hover',
      ].join(' ')}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-rose-50">
        {!item.photo_url ? (
          <div className="grid h-full w-full place-items-center text-xs font-semibold text-text-secondary">Фото недоступно</div>
        ) : (
          <>
            {!imageLoaded ? <div className="skeleton-shimmer absolute inset-0" aria-hidden="true" /> : null}
            <img
              src={item.photo_url}
              alt={item.name}
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageLoaded(true)}
              className={[
                'h-full w-full object-cover transition duration-300',
                imageLoaded ? 'opacity-100' : 'opacity-0',
                selected ? 'scale-[1.03]' : 'scale-100 group-hover:scale-[1.03]',
              ].join(' ')}
            />
          </>
        )}

        {visibleTags.length > 0 ? (
          <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
            {visibleTags.map((tag) => (
              <span
                key={`${item.id}-${tag}`}
                className="rounded-full bg-[linear-gradient(135deg,#F8A4B8_0%,#E8677C_100%)] px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex min-h-[92px] flex-col p-3">
        <p className="text-sm font-bold text-text-primary">{item.name}</p>

        {item.description ? (
          <div
            className="mt-1 overflow-hidden transition-[max-height] duration-300 ease-out"
            style={{ maxHeight: isDescriptionToggleEnabled && isDescriptionExpanded ? `${Math.max(descriptionHeight, 32)}px` : '32px' }}
          >
            <p
              ref={descriptionRef}
              className="text-xs leading-4 text-text-secondary"
              style={
                isDescriptionToggleEnabled && isDescriptionExpanded
                  ? undefined
                  : {
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }
              }
            >
              {item.description}
            </p>
          </div>
        ) : null}

        <p className="mt-auto pt-3 text-right font-display text-xl text-[#E8677C]">{formatItemPrice(item, servings, priceMode)}</p>
      </div>
    </button>
  );
}
