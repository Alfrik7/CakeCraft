import { type ChangeEvent, useEffect, useMemo, useState } from 'react';
import { MenuCard } from '../components/MenuCard';
import { useOrderContext } from '../context/OrderContext';
import { getMenuItems } from '../lib/api';
import { getItemPrice } from '../lib/price';
import { supabase } from '../lib/supabase';
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

  return (
    <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-semibold text-gray-900">Шаг 5. Декор</h2>
      <p className="mt-2 text-sm text-gray-600">Добавьте элементы декора, пожелания и референс.</p>

      <div className="mt-5">
        {loading ? <p className="text-sm text-gray-500">Загружаем декор...</p> : null}
        {loadError ? <p className="text-sm text-amber-700">Не удалось загрузить декор из каталога.</p> : null}

        {!loading && decorItems.length === 0 ? (
          <p className="text-sm text-gray-500">У кондитера пока нет доступных элементов декора.</p>
        ) : null}

        {!loading && decorItems.length > 0 ? (
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

      {selectedDecorItems.length > 0 ? (
        <div className="mt-6 border-t border-rose-100 pt-4">
          <p className="text-sm font-medium text-gray-800">Выбрано</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedDecorItems.map((item) => (
              <span
                key={item.id}
                className="inline-flex min-h-[36px] items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs text-rose-900"
              >
                {item.name}
                <button
                  type="button"
                  onClick={() => removeDecorItem(item.id)}
                  className="rounded-full border border-rose-300 px-2 py-0.5 text-[11px] leading-none text-rose-700 transition hover:bg-rose-100"
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
        <label className="mt-6 block border-t border-rose-100 pt-4 text-sm text-gray-700">
          Текст для топпера
          <input
            type="text"
            value={order.topper_text ?? ''}
            onChange={(event) => updateOrder({ topper_text: event.target.value })}
            placeholder="Например: С днём рождения, Маша!"
            className="mt-1 min-h-[44px] w-full rounded-xl border border-rose-100 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
          />
        </label>
      ) : null}

      <div className="mt-6 border-t border-rose-100 pt-4">
        <p className="text-sm font-medium text-gray-800">Референс-фото</p>
        <label className="mt-2 block text-sm text-gray-700">
          <span className="sr-only">Загрузить фото</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleUploadReferencePhoto}
            disabled={uploadingPhoto}
            className="block min-h-[44px] w-full rounded-xl border border-rose-100 px-3 py-2 text-sm text-gray-900 file:mr-3 file:rounded-lg file:border-0 file:bg-rose-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-rose-900 disabled:cursor-not-allowed disabled:bg-gray-50"
          />
        </label>
        {uploadingPhoto ? <p className="mt-2 text-sm text-gray-500">Загружаем фото...</p> : null}
        {uploadError ? <p className="mt-2 text-sm text-amber-700">{uploadError}</p> : null}
        {order.reference_photo_url ? (
          <a
            href={order.reference_photo_url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex text-sm text-rose-700 underline-offset-2 hover:underline"
          >
            Открыть загруженное фото
          </a>
        ) : null}
      </div>

      <label className="mt-6 block border-t border-rose-100 pt-4 text-sm text-gray-700">
        Комментарий по декору
        <textarea
          value={order.comment ?? ''}
          onChange={(event) => updateOrder({ comment: event.target.value })}
          placeholder="Например: минималистичный стиль, без блёсток"
          rows={3}
          className="mt-1 w-full rounded-xl border border-rose-100 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
        />
      </label>
    </section>
  );
}
