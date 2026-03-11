import { useState, type CSSProperties } from 'react';
import { useMenuDataContext } from '../context/MenuDataContext';
import { useOrderContext } from '../context/OrderContext';
import { getOptimizedSupabaseImageUrl } from '../lib/images';
import { triggerTelegramHaptic } from '../lib/telegram';
import type { MenuItem } from '../types';

/** Hardcoded fallback occasions shown when the baker has not configured any */
const FALLBACK_OCCASIONS: Array<{
  value: string;
  label: string;
  icon: string;
  gradient: string;
  activeGradient: string;
}> = [
  {
    value: 'birthday',
    label: 'День рождения',
    icon: '🎂',
    gradient: 'linear-gradient(135deg, #FFE8EC, #FFF0F3)',
    activeGradient: 'linear-gradient(135deg, #FFD1DA, #FFE3E8)',
  },
  {
    value: 'wedding',
    label: 'Свадьба',
    icon: '💒',
    gradient: 'linear-gradient(135deg, #F0E8FF, #F8F0FF)',
    activeGradient: 'linear-gradient(135deg, #E3D1FF, #EFE3FF)',
  },
  {
    value: 'kids_party',
    label: 'Детский праздник',
    icon: '🎈',
    gradient: 'linear-gradient(135deg, #E8FFE8, #F0FFF0)',
    activeGradient: 'linear-gradient(135deg, #D1FFD1, #E3FFE3)',
  },
  {
    value: 'corporate',
    label: 'Корпоратив',
    icon: '🏢',
    gradient: 'linear-gradient(135deg, #E8F0FF, #F0F5FF)',
    activeGradient: 'linear-gradient(135deg, #D1E3FF, #E3EFFF)',
  },
  {
    value: 'other',
    label: 'Без повода',
    icon: '🎁',
    gradient: 'linear-gradient(135deg, #FFF5E8, #FFFAF0)',
    activeGradient: 'linear-gradient(135deg, #FFE8D1, #FFF0E3)',
  },
];

function FallbackOccasionGrid() {
  const { order, updateOrder } = useOrderContext();

  return (
    <div className="mt-8 grid grid-cols-2 gap-4">
      {FALLBACK_OCCASIONS.map((option, index) => {
        const isSelected = order.occasion === option.label;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              triggerTelegramHaptic('selection');
              updateOrder({ occasion: option.label });
            }}
            className={[
              'tap-scale stagger-item group relative aspect-square overflow-hidden rounded-[24px] border border-white text-center transition-all duration-300',
              'flex flex-col items-center justify-center gap-3 px-3 shadow-soft hover:-translate-y-1 hover:shadow-lg',
              isSelected
                ? 'bounce-scale ring-2 ring-rose shadow-lg'
                : '',
            ].join(' ')}
            style={
              {
                '--stagger-delay': `${index * 60}ms`,
                background: isSelected ? option.activeGradient : option.gradient,
              } as CSSProperties
            }
            aria-pressed={isSelected}
          >
            <span
              className={[
                'relative text-[48px] leading-none transition-transform duration-300',
                isSelected ? 'scale-110 drop-shadow-md' : 'group-hover:scale-105',
              ].join(' ')}
              aria-hidden="true"
            >
              {option.icon}
            </span>
            <span className="relative text-[15px] font-bold text-chocolate transition-colors">
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function OccasionCard({ item, index }: { item: MenuItem; index: number }) {
  const { order, updateOrder } = useOrderContext();
  const [imageLoaded, setImageLoaded] = useState(false);
  const isSelected = order.occasion === item.name;
  const optimizedPhotoUrl = item.photo_url
    ? getOptimizedSupabaseImageUrl(item.photo_url, { width: 400, quality: 75 })
    : null;

  return (
    <button
      type="button"
      onClick={() => {
        triggerTelegramHaptic('selection');
        updateOrder({ occasion: item.name });
      }}
      className={[
        'tap-scale stagger-item group relative aspect-square overflow-hidden rounded-[24px] border text-center transition-all duration-300',
        'flex flex-col items-center justify-center gap-2 shadow-soft hover:-translate-y-1 hover:shadow-lg',
        isSelected
          ? 'bounce-scale ring-2 ring-rose shadow-lg border-rose/40'
          : 'border-blush/35',
      ].join(' ')}
      style={
        {
          '--stagger-delay': `${index * 60}ms`,
          background: isSelected
            ? 'linear-gradient(135deg, #FFD1DA, #FFE3E8)'
            : 'linear-gradient(135deg, #FFF5F0, #FFFAFA)',
        } as CSSProperties
      }
      aria-pressed={isSelected}
    >
      {optimizedPhotoUrl ? (
        <div className="relative h-16 w-16 overflow-hidden rounded-2xl">
          {!imageLoaded ? (
            <div
              className="skeleton-shimmer"
              style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
              aria-hidden="true"
            />
          ) : null}
          <img
            src={optimizedPhotoUrl}
            alt={item.name}
            loading="lazy"
            decoding="async"
            width={64}
            height={64}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageLoaded(true)}
            className={[
              'h-full w-full rounded-2xl object-cover transition-transform duration-300',
              isSelected ? 'scale-110' : 'group-hover:scale-105',
            ].join(' ')}
          />
        </div>
      ) : (
        <span
          className={[
            'relative text-[48px] leading-none transition-transform duration-300',
            isSelected ? 'scale-110 drop-shadow-md' : 'group-hover:scale-105',
          ].join(' ')}
          aria-hidden="true"
        >
          🎂
        </span>
      )}
      <span className="relative px-2 text-[15px] font-bold text-chocolate transition-colors leading-tight">
        {item.name}
      </span>
    </button>
  );
}

export function StepOccasion() {
  const { menuData } = useMenuDataContext();
  const occasionItems = menuData.occasion;
  const useFallback = occasionItems.length === 0;

  return (
    <section className="px-4 py-6 mb-24">
      <h2 className="text-center font-display text-[28px] font-bold text-chocolate">Какой у вас повод?</h2>
      <p className="mt-2 text-center text-[15px] text-truffle">Выберите повод для вашего торта</p>

      {useFallback ? (
        <FallbackOccasionGrid />
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4">
          {occasionItems.map((item, index) => (
            <OccasionCard key={item.id} item={item} index={index} />
          ))}
        </div>
      )}
    </section>
  );
}
