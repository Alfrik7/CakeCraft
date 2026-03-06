import { useState } from 'react';
import { getItemPrice } from '../lib/price';
import { triggerTelegramHaptic } from '../lib/telegram';
import type { MenuItem } from '../types';

interface MenuCardProps {
  item: MenuItem;
  selected: boolean;
  onSelect: () => void;
  mode: 'single' | 'multi';
  servings?: number | null;
}

const SUPPORTED_TAGS = new Set(['Хит', 'Новинка', 'Сезонное']);

function formatPrice(value: number): string {
  return `${new Intl.NumberFormat('ru-RU').format(Math.round(value))} ₽`;
}

function formatItemPrice(item: MenuItem, servings: number | null): string {
  if (item.price_type === 'per_kg') {
    if (!servings) {
      return `${formatPrice(item.price)}/кг`;
    }

    return `${formatPrice(getItemPrice(servings, item))} (${formatPrice(item.price)}/кг)`;
  }

  return formatPrice(item.price);
}

export function MenuCard({ item, selected, onSelect, mode, servings = null }: MenuCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const visibleTags = item.tags.filter((tag) => SUPPORTED_TAGS.has(tag));
  const handleClick = () => {
    triggerTelegramHaptic('selection');
    onSelect();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={selected}
      className={[
        'group relative overflow-hidden rounded-xl border bg-white text-left transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2',
        selected
          ? 'border-rose-400 bg-rose-50 shadow-sm ring-1 ring-rose-200'
          : 'border-rose-100 hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-sm',
      ].join(' ')}
    >
      <div className="relative h-28 w-full overflow-hidden bg-rose-50">
        {!item.photo_url ? (
          <div className="grid h-full w-full place-items-center text-sm text-rose-400">Фото недоступно</div>
        ) : (
          <>
            {!imageLoaded ? <div className="absolute inset-0 animate-pulse bg-rose-100" aria-hidden="true" /> : null}
            <img
              src={item.photo_url}
              alt={item.name}
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageLoaded(true)}
              className={[
                'h-full w-full object-cover transition duration-300',
                imageLoaded ? 'opacity-100' : 'opacity-0',
                selected ? 'scale-[1.02]' : 'scale-100 group-hover:scale-[1.03]',
              ].join(' ')}
            />
          </>
        )}
      </div>

      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-gray-900">{item.name}</p>
          <span
            className={[
              'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition',
              selected ? 'bg-rose-200 text-rose-900' : 'bg-gray-100 text-gray-500',
            ].join(' ')}
          >
            {mode === 'multi' ? (selected ? 'В списке' : 'Добавить') : selected ? 'Выбрано' : 'Выбрать'}
          </span>
        </div>

        {item.description ? (
          <p
            className="mt-1 text-sm text-gray-600"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {item.description}
          </p>
        ) : null}

        {visibleTags.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {visibleTags.map((tag) => (
              <span key={`${item.id}-${tag}`} className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] text-rose-700">
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <p className="mt-2 text-sm font-medium text-gray-700">{formatItemPrice(item, servings)}</p>
      </div>
    </button>
  );
}
