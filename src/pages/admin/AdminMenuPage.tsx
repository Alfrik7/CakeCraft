import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthContext } from '../../context/AuthContext';
import {
  createMenuItem,
  deleteMenuItem,
  getAdminMenuItems,
  reorderMenuItems,
  setMenuItemActive,
  updateMenuItem,
  uploadMenuPhoto,
} from '../../lib/api';
import type { MenuCategory, MenuItem, MenuTag, PriceType } from '../../types';

const CATEGORY_TABS: Array<{ value: MenuCategory; label: string }> = [
  { value: 'shape', label: 'Формы' },
  { value: 'filling', label: 'Начинки' },
  { value: 'decor', label: 'Декор' },
];

const TAG_OPTIONS: MenuTag[] = ['Хит', 'Новинка', 'Сезонное'];

interface MenuItemModalState {
  mode: 'create' | 'edit';
  item?: MenuItem;
}

interface MenuItemFormValues {
  name: string;
  description: string;
  price: string;
  priceType: PriceType;
  tags: MenuTag[];
  photoFile: File | null;
}

interface MenuItemSubmitPayload {
  name: string;
  description: string | null;
  price: number;
  price_type: PriceType;
  tags: MenuTag[];
  photoFile: File | null;
}

function formatPrice(value: number, priceType: PriceType): string {
  const formatted = `${new Intl.NumberFormat('ru-RU').format(Math.round(value))} ₽`;
  return priceType === 'per_kg' ? `${formatted}/кг` : formatted;
}

function getInitialFormValues(item?: MenuItem): MenuItemFormValues {
  return {
    name: item?.name ?? '',
    description: item?.description ?? '',
    price: item ? String(item.price) : '',
    priceType: item?.price_type ?? 'fixed',
    tags: (item?.tags.filter((tag): tag is MenuTag => TAG_OPTIONS.includes(tag as MenuTag)) ?? []) as MenuTag[],
    photoFile: null,
  };
}

function reorderByDrop(items: MenuItem[], draggedId: string, targetId: string): MenuItem[] {
  const sourceIndex = items.findIndex((item) => item.id === draggedId);
  const targetIndex = items.findIndex((item) => item.id === targetId);

  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
    return items;
  }

  const next = [...items];
  const [moved] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, moved);
  return next;
}

interface MenuItemModalProps {
  category: MenuCategory;
  state: MenuItemModalState | null;
  nextSortOrder: number;
  bakerId: string;
  onClose: () => void;
  onSaved: (item: MenuItem, mode: 'create' | 'edit') => void;
}

function MenuItemModal({ category, state, nextSortOrder, bakerId, onClose, onSaved }: MenuItemModalProps) {
  const [values, setValues] = useState<MenuItemFormValues>(() => getInitialFormValues(state?.item));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isShapeCategory = category === 'shape';

  useEffect(() => {
    setValues(getInitialFormValues(state?.item));
    setError(null);
  }, [state]);

  if (!state) {
    return null;
  }

  const isEdit = state.mode === 'edit';

  const handleTagToggle = (tag: MenuTag) => {
    setValues((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter((current) => current !== tag) : [...prev.tags, tag],
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const trimmedName = values.name.trim();
    const parsedPrice = isShapeCategory ? 0 : Number(values.price.replace(',', '.'));

    if (!trimmedName) {
      setError('Введите название позиции.');
      return;
    }

    if (!isShapeCategory && (!Number.isFinite(parsedPrice) || parsedPrice < 0)) {
      setError('Укажите корректную цену.');
      return;
    }

    if (values.photoFile && !['image/jpeg', 'image/png', 'image/webp'].includes(values.photoFile.type)) {
      setError('Допустимы только JPG, PNG или WEBP.');
      return;
    }

    if (values.photoFile && values.photoFile.size > 5 * 1024 * 1024) {
      setError('Размер файла должен быть не больше 5MB.');
      return;
    }

    const payload: MenuItemSubmitPayload = {
      name: trimmedName,
      description: values.description.trim() ? values.description.trim() : null,
      price: parsedPrice,
      price_type: isShapeCategory ? 'fixed' : values.priceType,
      tags: values.tags,
      photoFile: values.photoFile,
    };

    try {
      setIsSaving(true);

      let photoUrl: string | undefined;
      if (payload.photoFile) {
        photoUrl = await uploadMenuPhoto(bakerId, payload.photoFile);
      }

      if (state.mode === 'create') {
        const created = await createMenuItem({
          baker_id: bakerId,
          category,
          name: payload.name,
          description: payload.description,
          photo_url: photoUrl ?? null,
          price: payload.price,
          price_type: payload.price_type,
          tags: payload.tags,
          sort_order: nextSortOrder,
          is_active: true,
        });
        onSaved(created, 'create');
      } else {
        const updated = await updateMenuItem(state.item!.id, bakerId, {
          name: payload.name,
          description: payload.description,
          price: payload.price,
          price_type: payload.price_type,
          tags: payload.tags,
          ...(photoUrl ? { photo_url: photoUrl } : {}),
        });
        onSaved(updated, 'edit');
      }
    } catch {
      setError('Не удалось сохранить позицию. Попробуйте ещё раз.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-gray-900/40 p-3 sm:items-center sm:justify-center">
      <div className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-xl sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{isEdit ? 'Редактирование позиции' : 'Новая позиция'}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
          >
            Закрыть
          </button>
        </div>

        <form className="space-y-3" onSubmit={handleSubmit}>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Фото</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  photoFile: event.target.files?.[0] ?? null,
                }))
              }
              className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-rose-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-rose-700"
            />
            {state.item?.photo_url && !values.photoFile ? (
              <span className="mt-1 block text-xs text-gray-500">Текущее фото сохранится, если не выбрать новое.</span>
            ) : null}
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Название</span>
            <input
              type="text"
              required
              value={values.name}
              onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Описание</span>
            <textarea
              rows={3}
              value={values.description}
              onChange={(event) => setValues((prev) => ({ ...prev, description: event.target.value }))}
              className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </label>

          {!isShapeCategory ? (
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700">Цена</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={values.price}
                  onChange={(event) => setValues((prev) => ({ ...prev, price: event.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700">Тип цены</span>
                <select
                  value={values.priceType}
                  onChange={(event) =>
                    setValues((prev) => ({
                      ...prev,
                      priceType: event.target.value as PriceType,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                >
                  <option value="fixed">Фиксированная</option>
                  <option value="per_kg">За кг</option>
                </select>
              </label>
            </div>
          ) : null}

          <fieldset>
            <legend className="mb-1 text-sm font-medium text-gray-700">Теги</legend>
            <div className="flex flex-wrap gap-2">
              {TAG_OPTIONS.map((tag) => {
                const isSelected = values.tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagToggle(tag)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                      isSelected
                        ? 'border-rose-300 bg-rose-100 text-rose-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-rose-700 disabled:opacity-50"
            >
              {isSaving ? 'Сохраняем...' : isEdit ? 'Сохранить' : 'Добавить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MenuItemPhoto({ src, alt }: { src: string; alt: string }) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl bg-rose-50">
      {!isLoaded ? <div className="skeleton-shimmer absolute inset-0" aria-hidden="true" /> : null}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        onError={() => setIsLoaded(true)}
        className={`h-full w-full object-cover transition-[filter,transform] duration-500 ${
          isLoaded ? 'scale-100 blur-0' : 'scale-110 blur-md'
        }`}
      />
    </div>
  );
}

export function AdminMenuPage() {
  const { session } = useAuthContext();
  const [activeCategory, setActiveCategory] = useState<MenuCategory>('shape');
  const [items, setItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<MenuItemModalState | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);

  const bakerId = session?.bakerId;

  const fetchCategoryItems = useCallback(async () => {
    if (!bakerId) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await getAdminMenuItems(bakerId, activeCategory);
      setItems(data);
    } catch {
      setError('Не удалось загрузить позиции меню.');
    } finally {
      setIsLoading(false);
    }
  }, [activeCategory, bakerId]);

  useEffect(() => {
    void fetchCategoryItems();
  }, [fetchCategoryItems]);

  const nextSortOrder = useMemo(
    () => (items.length > 0 ? Math.max(...items.map((item) => item.sort_order)) + 1 : 0),
    [items],
  );

  const handleSaved = (item: MenuItem, mode: 'create' | 'edit') => {
    setModalState(null);
    setError(null);

    if (mode === 'create') {
      setItems((prev) => [...prev, item].sort((a, b) => a.sort_order - b.sort_order));
      return;
    }

    setItems((prev) => prev.map((current) => (current.id === item.id ? item : current)));
  };

  const handleDelete = async (item: MenuItem) => {
    if (!bakerId) {
      return;
    }

    const confirmed = window.confirm(`Удалить позицию «${item.name}»?`);
    if (!confirmed) {
      return;
    }

    try {
      setBusyItemId(item.id);
      await deleteMenuItem(item.id, bakerId);
      setItems((prev) => prev.filter((current) => current.id !== item.id));
    } catch {
      setError('Не удалось удалить позицию.');
    } finally {
      setBusyItemId(null);
    }
  };

  const handleToggleActive = async (item: MenuItem) => {
    if (!bakerId) {
      return;
    }

    try {
      setBusyItemId(item.id);
      const updated = await setMenuItemActive(item.id, bakerId, !item.is_active);
      setItems((prev) => prev.map((current) => (current.id === item.id ? updated : current)));
    } catch {
      setError('Не удалось изменить статус позиции.');
    } finally {
      setBusyItemId(null);
    }
  };

  const handleDrop = async (targetId: string) => {
    if (!bakerId || !draggingId) {
      return;
    }

    const reordered = reorderByDrop(items, draggingId, targetId);
    if (reordered === items) {
      setDraggingId(null);
      return;
    }

    const normalized = reordered.map((item, index) => ({ ...item, sort_order: index }));
    setItems(normalized);
    setDraggingId(null);

    try {
      await reorderMenuItems(
        bakerId,
        activeCategory,
        normalized.map((item) => item.id),
      );
    } catch {
      setError('Не удалось сохранить сортировку. Обновите страницу.');
      void fetchCategoryItems();
    }
  };

  if (!session) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Моё меню</h1>
          <p className="mt-1 text-sm text-gray-600">Добавляйте и редактируйте позиции. Перетаскивайте карточки для сортировки.</p>
        </div>
        <button
          type="button"
          onClick={() => setModalState({ mode: 'create' })}
          className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700"
        >
          Добавить позицию
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {CATEGORY_TABS.map((tab) => {
          const isActive = tab.value === activeCategory;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveCategory(tab.value)}
              className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                isActive
                  ? 'border-rose-300 bg-rose-100 text-rose-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      {isLoading ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-4 text-sm text-gray-500">Загрузка позиций...</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
          В этой категории пока нет позиций.
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const isBusy = busyItemId === item.id;
            return (
              <li
                key={item.id}
                draggable
                onDragStart={() => setDraggingId(item.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => void handleDrop(item.id)}
                className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm transition hover:border-rose-200"
              >
                <div className="flex items-start gap-3">
                  <div className="h-16 w-16 overflow-hidden rounded-xl bg-rose-50">
                    {item.photo_url ? (
                      <MenuItemPhoto src={item.photo_url} alt={item.name} />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-[11px] text-rose-400">Нет фото</div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="truncate text-sm font-semibold text-gray-900">{item.name}</p>
                        {activeCategory !== 'shape' ? (
                          <p className="mt-0.5 text-sm text-gray-600">{formatPrice(item.price, item.price_type)}</p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleToggleActive(item)}
                        disabled={isBusy}
                        className={`relative inline-flex min-h-11 w-14 items-center rounded-full border px-1 transition ${
                          item.is_active ? 'border-rose-300 bg-rose-100' : 'border-gray-300 bg-gray-100'
                        }`}
                        aria-label={item.is_active ? 'Выключить позицию' : 'Включить позицию'}
                      >
                        <span
                          className={`h-5 w-5 rounded-full bg-white shadow transition ${item.is_active ? 'translate-x-7' : 'translate-x-0'}`}
                        />
                      </button>
                    </div>

                    {item.tags.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {item.tags.map((tag) => (
                          <span
                            key={`${item.id}-${tag}`}
                            className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setModalState({ mode: 'edit', item })}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                      >
                        Редактировать
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(item)}
                        disabled={isBusy}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                      >
                        Удалить
                      </button>
                      <span className="ml-auto text-xs text-gray-400">Перетащите для сортировки</span>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <MenuItemModal
        category={activeCategory}
        state={modalState}
        nextSortOrder={nextSortOrder}
        bakerId={session.bakerId}
        onClose={() => setModalState(null)}
        onSaved={handleSaved}
      />
    </section>
  );
}
