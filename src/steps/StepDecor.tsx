import { type ChangeEvent, useEffect, useMemo, useState } from 'react';
import { MenuCard } from '../components/MenuCard';
import { SkeletonMenuGrid } from '../components/SkeletonMenuGrid';
import { useOrderContext } from '../context/OrderContext';
import { getMenuItems } from '../lib/api';
import { getItemPrice } from '../lib/price';
import { supabase } from '../lib/supabase';
import { triggerTelegramHaptic } from '../lib/telegram';
import type { MenuItem } from '../types';

const MAX_REFERENCE_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_REFERENCE_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function isTopperDecorItem(item: Pick<MenuItem, 'name'>): boolean {
  return item.name.toLowerCase().includes('топпер');
}

function buildReferencePhotoPath(bakerId: string, fileName: string): string {
  const safeFileName = fileName
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_');

  return `references/${bakerId}/${Date.now()}-${crypto.randomUUID()}-${safeFileName}`;
}

interface StepDecorProps {
  bakerId: string;
}

export function StepDecor({ bakerId }: StepDecorProps) {
  const { order, setOrder, updateOrder } = useOrderContext();
  const [decorItems, setDecorItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadDecorItems() {
      setLoading(true);
      setLoadError(false);

      try {
        const items = await getMenuItems(bakerId, 'decor');

        if (!isActive) {
          return;
        }

        setDecorItems(items);
      } catch {
        if (isActive) {
          setDecorItems([]);
          setLoadError(true);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    loadDecorItems();

    return () => {
      isActive = false;
    };
  }, [bakerId]);

  const selectedDecorItems = useMemo(
    () => decorItems.filter((item) => order.decor_items.includes(item.id)),
    [decorItems, order.decor_items],
  );

  const hasTopperSelected = useMemo(
    () => selectedDecorItems.some((item) => isTopperDecorItem(item)),
    [selectedDecorItems],
  );

  useEffect(() => {
    if (!hasTopperSelected && order.topper_text) {
      updateOrder({ topper_text: null });
    }
  }, [hasTopperSelected, order.topper_text, updateOrder]);

  const toggleDecorItem = (nextItem: MenuItem) => {
    setOrder((prev) => {
      const servings = prev.servings ?? 0;
      const itemPrice = getItemPrice(servings, nextItem);
      const isSelected = prev.decor_items.includes(nextItem.id);
      const nextDecorIds = isSelected
        ? prev.decor_items.filter((decorId) => decorId !== nextItem.id)
        : [...prev.decor_items, nextItem.id];
      const nextTotalPrice = Math.max(0, Math.round(prev.total_price + (isSelected ? -itemPrice : itemPrice)));

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
      const path = buildReferencePhotoPath(order.baker_id, file.name);
      const { error } = await supabase.storage.from('photos').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
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
    <section className="rounded-3xl bg-white/80 p-5 shadow-card backdrop-blur-sm sm:p-6">
      <h2 className="text-center font-display text-3xl text-text-primary">Финальный декор</h2>
      <p className="mt-2 text-center text-sm text-text-secondary">Выберите детали оформления и добавьте референс</p>

      <div className="mt-5">
        {loading ? <SkeletonMenuGrid /> : null}
        {!loading ? (
          <div className="content-fade-in">
            {loadError ? (
              <p className="mb-3 rounded-2xl border border-rose-200 bg-rose-50/80 px-3 py-2 text-xs text-rose-700">
                Не удалось загрузить декор из каталога.
              </p>
            ) : null}

            {decorItems.length === 0 ? (
              <p className="text-center text-sm text-text-secondary">У кондитера пока нет доступных элементов декора.</p>
            ) : null}

            {decorItems.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {decorItems.map((item) => {
                  const isSelected = order.decor_items.includes(item.id);

                  return (
                    <MenuCard
                      key={item.id}
                      item={item}
                      selected={isSelected}
                      onSelect={() => toggleDecorItem(item)}
                      mode="multi"
                      servings={order.servings}
                    />
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {selectedDecorItems.length > 0 ? (
        <div className="mt-6 rounded-2xl bg-secondary/80 p-4 shadow-card">
          <p className="font-display text-xl text-text-primary">Выбрано</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedDecorItems.map((item) => (
              <span
                key={item.id}
                className="inline-flex min-h-[38px] animate-[step-enter_220ms_ease-out] items-center gap-2 rounded-full bg-[var(--gradient-primary)] px-3 py-1 text-xs font-semibold text-white shadow-sm"
              >
                {item.name}
                <button
                  type="button"
                  onClick={() => {
                    triggerTelegramHaptic('selection');
                    removeDecorItem(item.id);
                  }}
                  className="grid h-5 w-5 place-items-center rounded-full bg-white/85 text-[11px] leading-none text-rose-700 transition duration-200 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                  aria-label={`Удалить ${item.name}`}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {hasTopperSelected ? (
        <label className="mt-6 block text-sm text-text-secondary">
          Текст для топпера
          <input
            type="text"
            value={order.topper_text ?? ''}
            onChange={(event) => updateOrder({ topper_text: event.target.value })}
            placeholder="Например: С днём рождения, Маша!"
            className="mt-1 min-h-[44px] w-full rounded-xl border border-transparent bg-surface px-3 py-2 text-sm text-text-primary outline-none transition duration-300 focus:ring-2 focus:ring-primary-from/40"
          />
        </label>
      ) : null}

      <div className="mt-6">
        <p className="text-sm font-medium text-text-primary">Референс-фото</p>
        <label
          className={[
            'mt-2 flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-rose-300 bg-rose-50/50 px-4 py-6 text-center transition duration-300',
            uploadingPhoto ? 'cursor-wait opacity-80' : 'hover:border-primary-to hover:bg-rose-50',
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
            className="grid h-11 w-11 place-items-center rounded-full bg-white text-xl text-rose-500 shadow-card"
            aria-hidden="true"
          >
            📷
          </span>
          <span className="mt-3 text-sm font-semibold text-text-primary">Загрузите фото-референс</span>
          <span className="mt-1 text-xs text-text-secondary">JPG, PNG или WEBP до 5 MB</span>
        </label>
        {uploadingPhoto ? <p className="mt-2 text-sm text-text-secondary">Загружаем фото...</p> : null}
        {uploadError ? <p className="mt-2 text-sm text-rose-700">{uploadError}</p> : null}

        {order.reference_photo_url ? (
          <div className="mt-3 overflow-hidden rounded-2xl bg-white shadow-card">
            <img
              src={order.reference_photo_url}
              alt="Загруженный референс"
              className="aspect-video w-full object-cover"
              loading="lazy"
            />
            <div className="flex items-center justify-between gap-2 px-3 py-2">
              <a
                href={order.reference_photo_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-rose-700 underline-offset-2 hover:underline"
              >
                Открыть в новой вкладке
              </a>
              <button
                type="button"
                onClick={() => {
                  triggerTelegramHaptic('selection');
                  removeReferencePhoto();
                }}
                className="min-h-[32px] rounded-full bg-rose-100 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
              >
                Удалить фото
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <label className="mt-6 block text-sm text-text-secondary">
        Комментарий по декору
        <textarea
          value={order.comment ?? ''}
          onChange={(event) => updateOrder({ comment: event.target.value })}
          placeholder="Например: минималистичный стиль, без блёсток"
          rows={3}
          className="mt-1 w-full rounded-xl border border-transparent bg-surface px-3 py-2 text-sm text-text-primary outline-none transition duration-300 focus:ring-2 focus:ring-primary-from/40"
        />
      </label>
    </section>
  );
}
