import { type CSSProperties, type ChangeEvent, useEffect, useMemo, useState } from 'react';
import { MenuCard } from '../components/MenuCard';
import { StepHeader } from '../components/StepHeader';
import { useMenuDataContext } from '../context/MenuDataContext';
import { useOrderContext } from '../context/OrderContext';
import { calculateTotal } from '../lib/price';
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
      <StepHeader
        title="Финальный декор"
        subtitle="Выберите детали оформления и добавьте референс"
        onBack={onBack}
      />

      <div className="mt-5">
        <div className="content-fade-in">
          {hasMenuError ? (
            <p className="mb-3 rounded-2xl border border-primary-from/25 bg-primary-from/10 px-3 py-2 text-xs text-text-primary">
              Не удалось загрузить декор из каталога.
            </p>
          ) : null}

          {decorItems.length === 0 ? (
            <p className="text-center text-sm text-text-secondary">У кондитера пока нет доступных элементов декора.</p>
          ) : null}

          {decorItems.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {decorItems.map((item, index) => {
                const isSelected = order.decor_items.includes(item.id);

                return (
                  <div
                    key={item.id}
                    className="stagger-item"
                    style={{ '--stagger-delay': `${index * 50}ms` } as CSSProperties}
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
        <div className="mt-6 rounded-2xl bg-secondary/80 p-4 shadow-card">
          <p className="font-display text-xl text-text-primary">Выбрано</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedDecorItems.map((item) => (
              <span
                key={item.id}
                className="inline-flex min-h-[44px] animate-[step-enter_220ms_ease-out] items-center gap-2 rounded-full [background-image:var(--gradient-primary)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm"
              >
                {item.name}
                <button
                  type="button"
                  onClick={() => {
                    triggerTelegramHaptic('selection');
                    removeDecorItem(item.id);
                  }}
                  className="tap-scale tap-target grid place-items-center rounded-full bg-white/85 text-[11px] leading-none text-primary-to transition duration-200 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
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
            'mt-2 flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary-from/40 bg-primary-from/10 px-4 py-6 text-center transition duration-300',
            uploadingPhoto ? 'cursor-wait opacity-80' : 'hover:border-primary-to hover:bg-primary-from/15',
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
            className="grid h-11 w-11 place-items-center rounded-full bg-white text-xl text-primary-to shadow-card"
            aria-hidden="true"
          >
            📷
          </span>
          <span className="mt-3 text-sm font-semibold text-text-primary">Загрузите фото-референс</span>
          <span className="mt-1 text-xs text-text-secondary">JPG, PNG или WEBP до 5 MB</span>
        </label>
        {uploadingPhoto ? <p className="mt-2 text-sm text-text-secondary">Загружаем фото...</p> : null}
        {uploadError ? <p className="mt-2 text-sm text-[var(--color-danger)]">{uploadError}</p> : null}

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
                className="text-xs font-medium text-primary-to underline-offset-2 hover:underline"
              >
                Открыть в новой вкладке
              </a>
              <button
                type="button"
                onClick={() => {
                  triggerTelegramHaptic('selection');
                  removeReferencePhoto();
                }}
                className="tap-scale min-h-[44px] rounded-full bg-primary-from/20 px-3 text-xs font-semibold text-primary-to transition hover:bg-primary-from/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-from/35"
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
