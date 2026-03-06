import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthContext } from '../../context/AuthContext';
import { getAdminOrders, getMenuItemsByIds, setOrderStatus } from '../../lib/api';
import type { MenuItem, Order, OrderStatus } from '../../types';

const STATUS_TABS: Array<{ value: OrderStatus; label: string }> = [
  { value: 'new', label: 'Новые' },
  { value: 'confirmed', label: 'Подтверждённые' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'done', label: 'Выполненные' },
  { value: 'cancelled', label: 'Отменённые' },
];

function formatPrice(value: number): string {
  return `${new Intl.NumberFormat('ru-RU').format(Math.round(value))} ₽`;
}

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
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

export function AdminOrdersPage() {
  const { session } = useAuthContext();
  const [activeStatus, setActiveStatus] = useState<OrderStatus>('new');
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItemById, setMenuItemById] = useState<Record<string, MenuItem>>({});
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStatusSaving, setIsStatusSaving] = useState<Record<string, boolean>>({});
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
        ...(order.coating_id ? [order.coating_id] : []),
        ...order.decor_items,
      ]);

      const items = await getMenuItemsByIds(bakerId, itemIds);
      setMenuItemById(
        items.reduce<Record<string, MenuItem>>((acc, item) => {
          acc[item.id] = item;
          return acc;
        }, {}),
      );
    } catch {
      setError('Не удалось загрузить заказы. Попробуйте обновить страницу.');
    } finally {
      setIsLoading(false);
    }
  }, [bakerId, dateFrom, dateTo]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const countsByStatus = useMemo(
    () =>
      orders.reduce<Record<OrderStatus, number>>(
        (acc, order) => {
          acc[order.status] += 1;
          return acc;
        },
        {
          new: 0,
          confirmed: 0,
          in_progress: 0,
          done: 0,
          cancelled: 0,
        },
      ),
    [orders],
  );

  const visibleOrders = useMemo(
    () => orders.filter((order) => order.status === activeStatus),
    [activeStatus, orders],
  );

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
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                isActive ? 'bg-rose-500 text-white shadow-sm' : 'bg-white text-gray-700 hover:bg-gray-100'
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
          const coatingName = order.coating_id ? menuItemById[order.coating_id]?.name : null;
          const decorNames = order.decor_items
            .map((id) => menuItemById[id]?.name)
            .filter((name): name is string => Boolean(name));
          const clientLink = getClientLink(order);
          const transition = getTransitionAction(order.status);
          const isSaving = Boolean(isStatusSaving[order.id]);

          return (
            <article
              key={order.id}
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white"
            >
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
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getStatusBadgeClass(order.status)}`}>
                      {STATUS_TABS.find((tab) => tab.value === order.status)?.label ?? order.status}
                    </span>
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
                      <span className="font-medium text-gray-900">Повод:</span> {order.occasion || 'Не указан'}
                    </p>
                    <p>
                      <span className="font-medium text-gray-900">Порции:</span>{' '}
                      {order.servings ? `${order.servings} порц.` : 'Не указано'}
                    </p>
                    <p>
                      <span className="font-medium text-gray-900">Покрытие:</span> {coatingName || 'Не выбрано'}
                    </p>
                    <p>
                      <span className="font-medium text-gray-900">Декор:</span>{' '}
                      {decorNames.length ? decorNames.join(', ') : 'Не выбран'}
                    </p>
                    <p>
                      <span className="font-medium text-gray-900">Надпись на топпере:</span>{' '}
                      {order.topper_text || 'Нет'}
                    </p>
                    <p>
                      <span className="font-medium text-gray-900">Тип получения:</span>{' '}
                      {order.delivery_type === 'delivery' ? 'Доставка' : 'Самовывоз'}
                    </p>
                    <p>
                      <span className="font-medium text-gray-900">Время:</span> {order.order_time || 'Не указано'}
                    </p>
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
                    <a
                      href={order.reference_photo_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-block"
                    >
                      <img
                        src={order.reference_photo_url}
                        alt="Референс клиента"
                        className="h-40 w-40 rounded-xl border border-gray-200 object-cover"
                      />
                    </a>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {transition ? (
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => void handleStatusChange(order, transition.next)}
                        className="rounded-lg bg-rose-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
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
                        {clientLink.label}
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
