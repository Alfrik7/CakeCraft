import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthContext } from '../../context/AuthContext';
import {
  getAdminMenuItems,
  getAdminOrders,
  getMenuItemsByIds,
  setOrderStatus,
  updateOrderDetails,
} from '../../lib/api';
import { getOptimizedSupabaseImageUrl } from '../../lib/images';
import type { MenuItem, Order, OrderStatus } from '../../types';

type OrdersTab = OrderStatus | 'reminders';

const STATUS_TABS: Array<{ value: OrdersTab; label: string }> = [
  { value: 'new', label: 'Новые' },
  { value: 'confirmed', label: 'Подтверждённые' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'done', label: 'Выполненные' },
  { value: 'cancelled', label: 'Отменённые' },
  { value: 'reminders', label: 'Напоминания' },
];
const ACTIVE_CONTROL_CLASS =
  'border-0 bg-gradient-to-r from-[#F4A0B0] to-[#D4596C] text-white shadow-sm';
const INACTIVE_CONTROL_CLASS = 'border border-gray-300 bg-white text-gray-800 hover:bg-gray-50';

interface EditOrderFormState {
  occasion: string;
  shape: string;
  filling_id: string;
  servings: string;
  decor_items: string[];
  delivery_type: 'pickup' | 'delivery';
  address: string;
  order_date: string;
  order_time: string;
  comment: string;
  total_price: string;
}

function formatPrice(value: number): string {
  return `${new Intl.NumberFormat('ru-RU').format(Math.round(value))} ₽`;
}

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
}

function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split('-').map((part) => Number(part));
  return new Date(Date.UTC(year, month - 1, day));
}

function toIsoDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function ReferencePreviewImage({ src }: { src: string }) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className="relative h-40 w-40 overflow-hidden rounded-xl border border-gray-200">
      {!isLoaded ? <div className="skeleton-shimmer absolute inset-0" aria-hidden="true" /> : null}
      <img
        src={getOptimizedSupabaseImageUrl(src, { width: 400, quality: 75 })}
        alt="Референс клиента"
        className="h-40 w-40 object-cover"
        loading="lazy"
        decoding="async"
        width={160}
        height={160}
        onLoad={() => setIsLoaded(true)}
        onError={() => setIsLoaded(true)}
      />
    </div>
  );
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function getReminderDays(orderDate: string, today: Date): number {
  const oneDayMs = 24 * 60 * 60 * 1000;
  const diffMs = today.getTime() - parseIsoDate(orderDate).getTime();
  const daysSinceOrder = Math.round(diffMs / oneDayMs);
  return Math.max(0, 365 - daysSinceOrder);
}

function getStatusBadgeClass(status: OrderStatus): string {
  if (status === 'new') {
    return 'bg-amber-100 text-amber-700';
  }

  if (status === 'confirmed') {
    return 'bg-sky-100 text-sky-700';
  }

  if (status === 'in_progress') {
    return 'bg-violet-100 text-violet-700';
  }

  if (status === 'done') {
    return 'bg-emerald-100 text-emerald-700';
  }

  return 'bg-gray-200 text-gray-700';
}

function normalizeTelegramHandle(value: string): string {
  return value.trim().replace(/^@/, '');
}

function normalizePhone(value: string): string {
  return value.replace(/[^\d]/g, '');
}

function getClientLink(order: Order): { href: string; label: string } | null {
  if (!order.client_contact.trim()) {
    return null;
  }

  if (order.client_contact_type === 'telegram') {
    const handle = normalizeTelegramHandle(order.client_contact);
    return handle ? { href: `https://t.me/${handle}`, label: 'Написать в Telegram' } : null;
  }

  if (order.client_contact_type === 'whatsapp') {
    const phone = normalizePhone(order.client_contact);
    return phone ? { href: `https://wa.me/${phone}`, label: 'Написать в WhatsApp' } : null;
  }

  const phone = normalizePhone(order.client_contact);
  return phone ? { href: `tel:${phone}`, label: 'Позвонить клиенту' } : null;
}

function getTransitionAction(status: OrderStatus): { next: OrderStatus; label: string } | null {
  if (status === 'new') {
    return { next: 'confirmed', label: 'Подтвердить' };
  }

  if (status === 'confirmed') {
    return { next: 'in_progress', label: 'В работу' };
  }

  if (status === 'in_progress') {
    return { next: 'done', label: 'Готово' };
  }

  return null;
}

function toNullableText(value: string): string | null {
  const nextValue = value.trim();
  return nextValue.length > 0 ? nextValue : null;
}

const OCCASION_LABELS: Record<string, string> = {
  birthday: 'День рождения',
  wedding: 'Свадьба',
  kids_party: 'Детский праздник',
  kids: 'Детский праздник',
  corporate: 'Корпоратив',
  other: 'Без повода',
};

const OCCASION_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'birthday', label: 'День рождения' },
  { value: 'wedding', label: 'Свадьба' },
  { value: 'kids_party', label: 'Детский праздник' },
  { value: 'corporate', label: 'Корпоратив' },
  { value: 'other', label: 'Без повода' },
];

function formatOccasion(occasion: string | null): string {
  if (!occasion) {
    return 'Не указан';
  }

  return OCCASION_LABELS[occasion] ?? occasion;
}

export function AdminOrdersPage() {
  const { session } = useAuthContext();
  const [activeStatus, setActiveStatus] = useState<OrdersTab>('new');
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItemById, setMenuItemById] = useState<Record<string, MenuItem>>({});
  const [fillingOptions, setFillingOptions] = useState<MenuItem[]>([]);
  const [decorOptions, setDecorOptions] = useState<MenuItem[]>([]);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStatusSaving, setIsStatusSaving] = useState<Record<string, boolean>>({});
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditOrderFormState | null>(null);
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bakerId = session?.bakerId;

  const loadOrders = useCallback(async () => {
    if (!bakerId) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const loadedOrders = await getAdminOrders(bakerId, {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setOrders(loadedOrders);

      const itemIds = loadedOrders.flatMap((order) => [
        ...(order.filling_id ? [order.filling_id] : []),
        ...order.decor_items,
      ]);

      const [items, fillings, decor] = await Promise.all([
        getMenuItemsByIds(bakerId, itemIds),
        getAdminMenuItems(bakerId, 'filling'),
        getAdminMenuItems(bakerId, 'decor'),
      ]);

      setMenuItemById(
        items.reduce<Record<string, MenuItem>>((acc, item) => {
          acc[item.id] = item;
          return acc;
        }, {}),
      );
      setFillingOptions(fillings);
      setDecorOptions(decor);
    } catch {
      setError('Не удалось загрузить заказы. Попробуйте обновить страницу.');
    } finally {
      setIsLoading(false);
    }
  }, [bakerId, dateFrom, dateTo]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const reminderMetaById = useMemo(() => {
    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const from = toIsoDate(addUtcDays(today, -375));
    const to = toIsoDate(addUtcDays(today, -355));

    return orders.reduce<Record<string, number>>((acc, order) => {
      if (order.status !== 'done') {
        return acc;
      }

      if (order.order_date < from || order.order_date > to) {
        return acc;
      }

      acc[order.id] = getReminderDays(order.order_date, today);
      return acc;
    }, {});
  }, [orders]);

  const reminderOrders = useMemo(
    () =>
      orders
        .filter((order) => reminderMetaById[order.id] !== undefined)
        .sort((a, b) => reminderMetaById[a.id] - reminderMetaById[b.id]),
    [orders, reminderMetaById],
  );

  const countsByStatus = useMemo(
    () => ({
      new: orders.filter((order) => order.status === 'new').length,
      confirmed: orders.filter((order) => order.status === 'confirmed').length,
      in_progress: orders.filter((order) => order.status === 'in_progress').length,
      done: orders.filter((order) => order.status === 'done').length,
      cancelled: orders.filter((order) => order.status === 'cancelled').length,
      reminders: reminderOrders.length,
    }),
    [orders, reminderOrders.length],
  );

  const visibleOrders = useMemo(() => {
    if (activeStatus === 'reminders') {
      return reminderOrders;
    }

    return orders.filter((order) => order.status === activeStatus);
  }, [activeStatus, orders, reminderOrders]);

  const handleExpandToggle = (orderId: string) => {
    setExpandedIds((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  const handleStatusChange = async (order: Order, nextStatus: OrderStatus) => {
    if (!bakerId) {
      return;
    }

    setIsStatusSaving((prev) => ({ ...prev, [order.id]: true }));
    setError(null);

    try {
      const updated = await setOrderStatus(order.id, bakerId, nextStatus);
      setOrders((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch {
      setError('Не удалось обновить статус заказа.');
    } finally {
      setIsStatusSaving((prev) => ({ ...prev, [order.id]: false }));
    }
  };

  const clearFilter = () => {
    setDateFrom('');
    setDateTo('');
  };

  const openEditModal = (order: Order) => {
    setEditingOrderId(order.id);
    setEditForm({
      occasion: order.occasion ?? '',
      shape: order.shape ?? '',
      filling_id: order.filling_id ?? '',
      servings: order.servings ? String(order.servings) : '',
      decor_items: order.decor_items,
      delivery_type: order.delivery_type,
      address: order.address ?? '',
      order_date: order.order_date,
      order_time: order.order_time ?? '',
      comment: order.comment ?? '',
      total_price: String(order.total_price),
    });
    setError(null);
  };

  const closeEditModal = () => {
    if (isEditSaving) {
      return;
    }

    setEditingOrderId(null);
    setEditForm(null);
  };

  const handleDecorToggle = (itemId: string) => {
    setEditForm((prev) => {
      if (!prev) {
        return prev;
      }

      if (prev.decor_items.includes(itemId)) {
        return { ...prev, decor_items: prev.decor_items.filter((id) => id !== itemId) };
      }

      return { ...prev, decor_items: [...prev.decor_items, itemId] };
    });
  };

  const handleEditSave = async () => {
    if (!bakerId || !editingOrderId || !editForm) {
      return;
    }

    const parsedServings = editForm.servings.trim() ? Number(editForm.servings) : null;
    const parsedTotalPrice = Number(editForm.total_price);

    if (!editForm.order_date) {
      setError('Укажите дату заказа в форме редактирования.');
      return;
    }

    if (parsedServings !== null && (!Number.isFinite(parsedServings) || parsedServings < 1)) {
      setError('Порции/вес должны быть числом больше 0.');
      return;
    }

    if (!Number.isFinite(parsedTotalPrice) || parsedTotalPrice < 0) {
      setError('Итоговая цена должна быть числом не меньше 0.');
      return;
    }

    setIsEditSaving(true);
    setError(null);

    try {
      const updated = await updateOrderDetails(editingOrderId, bakerId, {
        occasion: toNullableText(editForm.occasion),
        shape: toNullableText(editForm.shape),
        filling_id: editForm.filling_id || null,
        servings: parsedServings === null ? null : Math.round(parsedServings),
        decor_items: editForm.decor_items,
        delivery_type: editForm.delivery_type,
        address: editForm.delivery_type === 'delivery' ? toNullableText(editForm.address) : null,
        order_date: editForm.order_date,
        order_time: toNullableText(editForm.order_time),
        comment: toNullableText(editForm.comment),
        total_price: Math.round(parsedTotalPrice),
      });

      setOrders((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setEditingOrderId(null);
      setEditForm(null);
    } catch {
      setError('Не удалось сохранить изменения заказа.');
    } finally {
      setIsEditSaving(false);
    }
  };

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Заказы</h1>
        <button
          type="button"
          onClick={loadOrders}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          Обновить
        </button>
      </div>

      <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-3 sm:p-4">
        <p className="text-sm font-medium text-gray-800">Фильтр по дате</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <label className="text-sm">
            <span className="mb-1 block text-gray-600">С</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-gray-600">По</span>
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            />
          </label>
          <button
            type="button"
            onClick={clearFilter}
            className="self-end rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Сбросить
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => {
          const isActive = tab.value === activeStatus;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveStatus(tab.value)}
              className={`min-h-10 rounded-xl px-3 py-2 text-sm font-medium transition ${
                isActive ? ACTIVE_CONTROL_CLASS : INACTIVE_CONTROL_CLASS
              }`}
            >
              {tab.label} ({countsByStatus[tab.value]})
            </button>
          );
        })}
      </div>

      {error ? <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}

      {isLoading ? <p className="text-sm text-gray-500">Загрузка заказов...</p> : null}

      {!isLoading && visibleOrders.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500">
          Заказов в этом статусе не найдено.
        </p>
      ) : null}

      <div className="space-y-3">
        {visibleOrders.map((order) => {
          const isExpanded = Boolean(expandedIds[order.id]);
          const fillingName = order.filling_id ? menuItemById[order.filling_id]?.name : null;
          const decorNames = order.decor_items
            .map((id) => menuItemById[id]?.name)
            .filter((name): name is string => Boolean(name));
          const clientLink = getClientLink(order);
          const transition = getTransitionAction(order.status);
          const isSaving = Boolean(isStatusSaving[order.id]);
          const reminderDays = reminderMetaById[order.id];
          const occasionLabel = formatOccasion(order.occasion);
          const reminderOccasionLabel = occasionLabel
            .replace(/\s*—\s*годовщина/gi, '')
            .replace(/\s+годовщина/gi, '')
            .trim();

          return (
            <article key={order.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <button
                type="button"
                onClick={() => handleExpandToggle(order.id)}
                className="w-full px-4 py-3 text-left transition hover:bg-gray-50"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{order.client_name}</p>
                    <p className="mt-1 text-sm text-gray-600">
                      {formatDate(order.order_date)} • {order.shape || 'Форма не указана'} +{' '}
                      {fillingName || 'Начинка не выбрана'}
                    </p>
                    <p className="mt-1 text-sm text-gray-600">Повод: {occasionLabel}</p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getStatusBadgeClass(order.status)}`}
                    >
                      {STATUS_TABS.find((tab) => tab.value === order.status)?.label ?? order.status}
                    </span>
                    {activeStatus === 'reminders' && reminderDays !== undefined ? (
                      <p className="mt-1 inline-flex rounded-full bg-rose-100 px-2 py-1 text-xs font-medium text-rose-700">
                        {reminderOccasionLabel} через {reminderDays} дн.
                      </p>
                    ) : null}
                    <p className="mt-1 text-sm font-semibold text-gray-900">{formatPrice(order.total_price)}</p>
                  </div>
                </div>
              </button>

              {isExpanded ? (
                <div className="border-t border-gray-100 px-4 py-3">
                  <div className="grid gap-3 text-sm text-gray-700 sm:grid-cols-2">
                    <p>
                      <span className="font-medium text-gray-900">Контакт:</span> {order.client_contact}
                    </p>
                    <p>
                      <span className="font-medium text-gray-900">Тип контакта:</span>{' '}
                      {order.client_contact_type === 'telegram'
                        ? 'Telegram'
                        : order.client_contact_type === 'whatsapp'
                          ? 'WhatsApp'
                          : 'Телефон'}
                    </p>
                    <p>
                      <span className="font-medium text-gray-900">Повод:</span> {occasionLabel}
                    </p>
                    <p>
                      <span className="font-medium text-gray-900">Порции:</span>{' '}
                      {order.servings ? `${order.servings} порц.` : 'Не указано'}
                    </p>
                    <p>
                      <span className="font-medium text-gray-900">Декор:</span>{' '}
                      {decorNames.length ? decorNames.join(', ') : 'Не выбран'}
                    </p>
                    <p>
                      <span className="font-medium text-gray-900">Тип получения:</span>{' '}
                      {order.delivery_type === 'delivery' ? 'Доставка' : 'Самовывоз'}
                    </p>
                    <p>
                      <span className="font-medium text-gray-900">Время:</span> {order.order_time || 'Не указано'}
                    </p>
                    {activeStatus === 'reminders' && reminderDays !== undefined ? (
                      <p>
                        <span className="font-medium text-gray-900">Напоминание:</span> {reminderOccasionLabel} через{' '}
                        {reminderDays} дн.
                      </p>
                    ) : null}
                  </div>

                  {order.address ? (
                    <p className="mt-3 text-sm text-gray-700">
                      <span className="font-medium text-gray-900">Адрес:</span> {order.address}
                    </p>
                  ) : null}

                  {order.comment ? (
                    <p className="mt-2 text-sm text-gray-700">
                      <span className="font-medium text-gray-900">Комментарий:</span> {order.comment}
                    </p>
                  ) : null}

                  {order.reference_photo_url ? (
                    <a href={order.reference_photo_url} target="_blank" rel="noreferrer" className="mt-3 inline-block">
                      <ReferencePreviewImage src={order.reference_photo_url} />
                    </a>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(order)}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                    >
                      Редактировать
                    </button>

                    {transition ? (
                      <button
                        type="button"
                        disabled={isSaving || activeStatus === 'reminders'}
                        onClick={() => void handleStatusChange(order, transition.next)}
                        className={`min-h-10 rounded-lg px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${ACTIVE_CONTROL_CLASS}`}
                      >
                        {transition.label}
                      </button>
                    ) : null}

                    {order.status !== 'cancelled' && order.status !== 'done' ? (
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => void handleStatusChange(order, 'cancelled')}
                        className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Отменить
                      </button>
                    ) : null}

                    {clientLink ? (
                      <a
                        href={clientLink.href}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                      >
                        {activeStatus === 'reminders' ? 'Написать клиенту' : clientLink.label}
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      {editingOrderId && editForm ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900">Редактирование заказа</h2>
              <button
                type="button"
                onClick={closeEditModal}
                className="rounded-lg border border-gray-200 px-2 py-1 text-sm text-gray-600 transition hover:bg-gray-50"
              >
                Закрыть
              </button>
            </div>

            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <label>
                <span className="mb-1 block text-gray-600">Повод</span>
                <select
                  value={editForm.occasion}
                  onChange={(event) => setEditForm((prev) => (prev ? { ...prev, occasion: event.target.value } : prev))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                >
                  <option value="">Не указан</option>
                  {OCCASION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-1 block text-gray-600">Форма</span>
                <input
                  type="text"
                  value={editForm.shape}
                  onChange={(event) => setEditForm((prev) => (prev ? { ...prev, shape: event.target.value } : prev))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                />
              </label>

              <label>
                <span className="mb-1 block text-gray-600">Начинка</span>
                <select
                  value={editForm.filling_id}
                  onChange={(event) =>
                    setEditForm((prev) => (prev ? { ...prev, filling_id: event.target.value } : prev))
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                >
                  <option value="">Не выбрана</option>
                  {fillingOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-1 block text-gray-600">Порции / вес</span>
                <input
                  type="number"
                  min={1}
                  value={editForm.servings}
                  onChange={(event) =>
                    setEditForm((prev) => (prev ? { ...prev, servings: event.target.value } : prev))
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                />
              </label>

              <label>
                <span className="mb-1 block text-gray-600">Тип получения</span>
                <select
                  value={editForm.delivery_type}
                  onChange={(event) =>
                    setEditForm((prev) =>
                      prev
                        ? {
                            ...prev,
                            delivery_type: event.target.value as 'pickup' | 'delivery',
                          }
                        : prev,
                    )
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                >
                  <option value="pickup">Самовывоз</option>
                  <option value="delivery">Доставка</option>
                </select>
              </label>

              <label>
                <span className="mb-1 block text-gray-600">Итоговая цена</span>
                <input
                  type="number"
                  min={0}
                  value={editForm.total_price}
                  onChange={(event) =>
                    setEditForm((prev) => (prev ? { ...prev, total_price: event.target.value } : prev))
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                />
              </label>

              <label>
                <span className="mb-1 block text-gray-600">Дата</span>
                <input
                  type="date"
                  value={editForm.order_date}
                  onChange={(event) =>
                    setEditForm((prev) => (prev ? { ...prev, order_date: event.target.value } : prev))
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                />
              </label>

              <label>
                <span className="mb-1 block text-gray-600">Время</span>
                <input
                  type="time"
                  value={editForm.order_time}
                  onChange={(event) =>
                    setEditForm((prev) => (prev ? { ...prev, order_time: event.target.value } : prev))
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                />
              </label>
            </div>

            <div className="mt-3">
              <p className="mb-1 text-sm text-gray-600">Декор</p>
              <div className="flex flex-wrap gap-2">
                {decorOptions.map((item) => {
                  const isChecked = editForm.decor_items.includes(item.id);
                  return (
                    <label
                      key={item.id}
                      className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-sm transition ${
                        isChecked ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-gray-200 bg-white text-gray-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleDecorToggle(item.id)}
                        className="h-4 w-4"
                      />
                      {item.name}
                    </label>
                  );
                })}
              </div>
            </div>

            <label className="mt-3 block">
              <span className="mb-1 block text-sm text-gray-600">Адрес</span>
              <textarea
                value={editForm.address}
                onChange={(event) => setEditForm((prev) => (prev ? { ...prev, address: event.target.value } : prev))}
                rows={2}
                className="w-full rounded-lg border border-gray-200 px-3 py-2"
              />
            </label>

            <label className="mt-3 block">
              <span className="mb-1 block text-sm text-gray-600">Комментарий</span>
              <textarea
                value={editForm.comment}
                onChange={(event) => setEditForm((prev) => (prev ? { ...prev, comment: event.target.value } : prev))}
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-3 py-2"
              />
            </label>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeEditModal}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={isEditSaving}
                onClick={() => void handleEditSave()}
                className={`min-h-10 rounded-lg px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${ACTIVE_CONTROL_CLASS}`}
              >
                {isEditSaving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
