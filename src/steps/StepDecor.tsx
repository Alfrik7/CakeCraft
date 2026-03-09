import { type CSSProperties, type ChangeEvent, useEffect, useMemo, useState } from 'react';
import imageCompression from 'browser-image-compression';
import { MenuCard } from '../components/MenuCard';
import { StepHeader } from '../components/StepHeader';
import { useMenuDataContext } from '../context/MenuDataContext';
import { getOptimizedSupabaseImageUrl } from '../lib/images';
import { useOrderContext } from '../context/OrderContext';
import { calculateTotal } from '../lib/price';
import { supabase } from '../lib/supabase';
import { triggerTelegramHaptic } from '../lib/telegram';
import type { MenuItem } from '../types';

const MAX_REFERENCE_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_REFERENCE_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function buildReferencePhotoPath(bakerId: string, fileName: string): string {
  const safeFileName = fileName
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_');

  return `references/${bakerId}/${Date.now()}-${crypto.randomUUID()}-${safeFileName}`;
}

interface StepDecorProps {
  onBack: () => void;
}

export function StepDecor({ onBack }: StepDecorProps) {
  const { order, setOrder, updateOrder } = useOrderContext();
  const { menuData, hasMenuError } = useMenuDataContext();
  const decorItems = menuData.decor;
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
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isReferencePhotoLoaded, setIsReferencePhotoLoaded] = useState(false);
  const optimizedReferencePhotoUrl = getOptimizedSupabaseImageUrl(order.reference_photo_url, { width: 400, quality: 75 });

  useEffect(() => {
    setIsReferencePhotoLoaded(false);
  }, [order.reference_photo_url]);

  const selectedDecorItems = useMemo(
    () => decorItems.filter((item) => order.decor_items.includes(item.id)),
    [decorItems, order.decor_items],
  );

  const toggleDecorItem = (nextItem: MenuItem) => {
    setOrder((prev) => {
      const isSelected = prev.decor_items.includes(nextItem.id);
      const nextDecorIds = isSelected
        ? prev.decor_items.filter((decorId) => decorId !== nextItem.id)
        : [...prev.decor_items, nextItem.id];
      const guests = prev.servings ?? 0;
      const selectedDecorItems = nextDecorIds
        .map((id) => decorById[id])
        .filter((item): item is MenuItem => Boolean(item));
      const nextTotalPrice = calculateTotal(
        guests,
        prev.filling_id ? fillingById[prev.filling_id] : null,
        selectedDecorItems,
      );

      return {
        ...prev,
        decor_items: nextDecorIds,
        total_price: nextTotalPrice,
      };
    });
  };

  const removeDecorItem = (itemId: string) => {
    const item = decorItems.find((entry) => entry.id === itemId);

    if (!item) {
      return;
    }

    toggleDecorItem(item);
  };

  const handleUploadReferencePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setUploadError(null);

    if (!ALLOWED_REFERENCE_PHOTO_TYPES.has(file.type)) {
      setUploadError('Допустимы только JPG, PNG или WEBP.');
      event.target.value = '';
      return;
    }

    if (file.size > MAX_REFERENCE_PHOTO_SIZE_BYTES) {
      setUploadError('Размер файла не должен превышать 5MB.');
      event.target.value = '';
      return;
    }

    setUploadingPhoto(true);

    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.3,
        maxWidthOrHeight: 800,
        useWebWorker: true,
      });
      const path = buildReferencePhotoPath(order.baker_id, file.name);
      const { error } = await supabase.storage.from('photos').upload(path, compressed, {
        cacheControl: '3600',
        upsert: false,
        contentType: compressed.type,
      });

      if (error) {
        throw error;
      }

      const { data } = supabase.storage.from('photos').getPublicUrl(path);
      updateOrder({ reference_photo_url: data.publicUrl });
    } catch {
      setUploadError('Не удалось загрузить фото. Попробуйте ещё раз.');
    } finally {
      setUploadingPhoto(false);
      event.target.value = '';
    }
  };

  const removeReferencePhoto = () => {
    updateOrder({ reference_photo_url: null });
    setUploadError(null);
  };

  return (
    <section className="px-4 py-6 mb-24">
      <StepHeader
        title="Финальный декор"
        subtitle="Выберите детали оформления и добавьте референс"
        onBack={onBack}
      />

      <div className="mt-8">
        <div className="content-fade-in">
          {hasMenuError ? (
            <p className="mb-4 rounded-2xl border border-blush/35 bg-cream p-4 text-[13px] text-truffle shadow-soft">
              Не удалось загрузить декор из каталога.
            </p>
          ) : null}

          {decorItems.length === 0 ? (
            <p className="text-center text-[15px] text-truffle py-8">У кондитера пока нет доступных элементов декора.</p>
          ) : null}

          {decorItems.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {decorItems.map((item, index) => {
                const isSelected = order.decor_items.includes(item.id);

                return (
                  <div
                    key={item.id}
                    className="stagger-item"
                    style={{ '--stagger-delay': `${index * 60}ms` } as CSSProperties}
                  >
                    <MenuCard
                      item={item}
                      selected={isSelected}
                      onSelect={() => toggleDecorItem(item)}
                      mode="multi"
                      servings={order.servings}
                      priceMode="single"
                      priceSize="compact"
                    />
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      {selectedDecorItems.length > 0 ? (
        <div className="mt-8 rounded-2xl bg-vanilla border border-blush/35 p-5 shadow-soft">
          <p className="font-display text-[22px] font-bold text-chocolate">Выбрано</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {selectedDecorItems.map((item) => (
              <span
                key={item.id}
                className="inline-flex min-h-[40px] animate-[step-enter_220ms_ease-out] items-center gap-2 rounded-full btn-gradient px-4 py-2 text-[13px] font-semibold text-white shadow-md"
              >
                {item.name}
                <button
                  type="button"
                  onClick={() => {
                    triggerTelegramHaptic('selection');
                    removeDecorItem(item.id);
                  }}
                  className="tap-scale tap-target grid place-items-center rounded-full bg-white/20 hover:bg-white/40 text-[11px] leading-none text-white transition-colors focus-visible:outline-none w-6 h-6 -mr-1"
                  aria-label={`Удалить ${item.name}`}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-8">
        <p className="text-[13px] font-bold uppercase tracking-wider text-truffle">Референс-фото</p>
        <label
          className={[
            'mt-2 flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blush/35 bg-vanilla px-4 py-6 text-center transition-all duration-300',
            uploadingPhoto ? 'cursor-wait opacity-80' : 'hover:border-rose hover:bg-blush/15 shadow-soft',
          ].join(' ')}
        >
          <span className="sr-only">Загрузить фото</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleUploadReferencePhoto}
            disabled={uploadingPhoto}
            className="sr-only"
          />
          <span
            className="grid h-12 w-12 place-items-center rounded-full bg-cream text-2xl shadow-sm"
            aria-hidden="true"
          >
            📷
          </span>
          <span className="mt-4 text-[15px] font-bold text-chocolate">Загрузите фото-референс</span>
          <span className="mt-1 text-[13px] text-truffle">JPG, PNG или WEBP до 5 MB</span>
        </label>
        {uploadingPhoto ? <p className="mt-2 text-[13px] text-truffle">Загружаем фото...</p> : null}
        {uploadError ? <p className="mt-2 text-[13px] text-rose">{uploadError}</p> : null}

        {order.reference_photo_url ? (
          <div className="mt-4 overflow-hidden rounded-2xl bg-vanilla shadow-soft border border-blush/35">
            <div className="relative">
              {!isReferencePhotoLoaded ? <div className="skeleton-shimmer absolute inset-0" aria-hidden="true" /> : null}
              <img
                src={optimizedReferencePhotoUrl}
                alt="Загруженный референс"
                className="aspect-video w-full object-cover"
                loading="lazy"
                decoding="async"
                width={1280}
                height={720}
                onLoad={() => setIsReferencePhotoLoaded(true)}
                onError={() => setIsReferencePhotoLoaded(true)}
              />
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-3 bg-cream">
              <a
                href={order.reference_photo_url}
                target="_blank"
                rel="noreferrer"
                className="text-[13px] font-bold text-rose underline-offset-4 hover:underline"
              >
                Открыть фото
              </a>
              <button
                type="button"
                onClick={() => {
                  triggerTelegramHaptic('selection');
                  removeReferencePhoto();
                }}
                className="tap-scale rounded-full bg-white border border-blush/35 px-4 py-2 text-[13px] font-bold text-truffle transition hover:text-rose hover:border-rose focus-visible:outline-none"
              >
                Удалить
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <label className="mt-8 block text-[13px] font-bold uppercase tracking-wider text-truffle">
        Комментарий по декору
        <textarea
          value={order.comment ?? ''}
          onChange={(event) => updateOrder({ comment: event.target.value })}
          placeholder="Например: минималистичный стиль, без блёсток"
          rows={3}
          className="mt-2 w-full rounded-xl border border-transparent bg-vanilla shadow-soft px-4 py-3 text-[15px] text-chocolate outline-none transition duration-300 focus:ring-2 focus:ring-rose/40"
        />
      </label>
    </section>
  );
}
