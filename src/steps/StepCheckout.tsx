import { useCallback, useEffect, useMemo, useState } from 'react';
import { SkeletonParagraph } from '../components/SkeletonMenuGrid';
import { useOrderContext } from '../context/OrderContext';
import { createOrder, getBlockedDates, getMenuItems } from '../lib/api';
import { getItemPrice } from '../lib/price';
import { triggerTelegramHaptic } from '../lib/telegram';
import type { Baker, MenuItem } from '../types';

function formatPrice(value: number): string {
  return `${new Intl.NumberFormat('ru-RU').format(Math.round(value))} ₽`;
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeOptionalText(value: string | null): string | null {
  const nextValue = (value ?? '').trim();
  return nextValue.length > 0 ? nextValue : null;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + Math.max(0, days));
  return result;
}

interface StepCheckoutProps {
  baker: Baker;
  registerSubmitHandler: (handler: (() => Promise<boolean>) | null) => void;
  onCanSubmitChange: (value: boolean) => void;
}

export function StepCheckout({ baker, registerSubmitHandler, onCanSubmitChange }: StepCheckoutProps) {
  const { order, updateOrder } = useOrderContext();
  const [loadingBlockedDates, setLoadingBlockedDates] = useState(true);
  const [blockedDateSet, setBlockedDateSet] = useState<Set<string>>(new Set());
  const [blockedDatesError, setBlockedDatesError] = useState(false);
  const [menuItemsById, setMenuItemsById] = useState<Record<string, MenuItem>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const minOrderDate = useMemo(() => toIsoDate(addDays(new Date(), baker.min_order_days)), [baker.min_order_days]);
  const isDeliveryEnabled = baker.delivery_enabled;
  const isDeliverySelected = isDeliveryEnabled && order.delivery_type === 'delivery';

  useEffect(() => {
    let isActive = true;

    async function loadCheckoutData() {
      setLoadingBlockedDates(true);
      setBlockedDatesError(false);

      try {
        const [blockedDates, fillings, coatings, decorItems] = await Promise.all([
          getBlockedDates(baker.id),
          getMenuItems(baker.id, 'filling'),
          getMenuItems(baker.id, 'coating'),
          getMenuItems(baker.id, 'decor'),
        ]);

        if (!isActive) {
          return;
        }

        setBlockedDateSet(new Set(blockedDates.map((item) => item.date)));
        setMenuItemsById(
          [...fillings, ...coatings, ...decorItems].reduce<Record<string, MenuItem>>((acc, item) => {
            acc[item.id] = item;
            return acc;
          }, {}),
        );
      } catch {
        if (isActive) {
          setBlockedDatesError(true);
          setBlockedDateSet(new Set());
          setMenuItemsById({});
        }
      } finally {
        if (isActive) {
          setLoadingBlockedDates(false);
        }
      }
    }

    loadCheckoutData();

    return () => {
      isActive = false;
    };
  }, [baker.id]);

  const servings = order.servings ?? 0;
  const fillingPrice = getItemPrice(servings, order.filling_id ? menuItemsById[order.filling_id] : null);
  const coatingPrice = getItemPrice(servings, order.coating_id ? menuItemsById[order.coating_id] : null);
  const decorPrice = order.decor_items.reduce((sum, itemId) => sum + getItemPrice(servings, menuItemsById[itemId]), 0);
  const basePrice = Math.max(0, Math.round(order.total_price - fillingPrice - coatingPrice - decorPrice));
  const deliveryPrice = isDeliverySelected ? baker.delivery_price : 0;
  const finalTotalPrice = Math.round(order.total_price + deliveryPrice);

  const validate = useCallback(() => {
    const errors: Record<string, string> = {};

    if (!order.client_name.trim()) {
      errors.client_name = 'Укажите имя клиента.';
    }

    if (!order.client_contact.trim()) {
      errors.client_contact = 'Укажите контакт для связи.';
    }

    if (!order.order_date) {
      errors.order_date = 'Выберите дату заказа.';
    } else if (order.order_date < minOrderDate) {
      errors.order_date = `Дата должна быть не раньше ${minOrderDate}.`;
    } else if (blockedDateSet.has(order.order_date)) {
      errors.order_date = 'Эта дата недоступна для заказа.';
    }

    if (isDeliverySelected && !(order.address ?? '').trim()) {
      errors.address = 'Укажите адрес доставки.';
    }

    return errors;
  }, [
    blockedDateSet,
    isDeliverySelected,
    minOrderDate,
    order.address,
    order.client_contact,
    order.client_name,
    order.order_date,
  ]);

  const canSubmit = useMemo(() => {
    if (loadingBlockedDates) {
      return false;
    }

    return Object.keys(validate()).length === 0;
  }, [loadingBlockedDates, validate]);

  useEffect(() => {
    onCanSubmitChange(canSubmit);
  }, [canSubmit, onCanSubmitChange]);

  const submitOrder = useCallback(async () => {
    const nextErrors = validate();
    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setSubmitError('Проверьте обязательные поля формы.');
      return false;
    }

    setSubmitError(null);

    try {
      await createOrder({
        baker_id: order.baker_id,
        client_name: order.client_name.trim(),
        client_contact: order.client_contact.trim(),
        client_contact_type: order.client_contact_type,
        occasion: normalizeOptionalText(order.occasion),
        shape: normalizeOptionalText(order.shape),
        servings: order.servings,
        filling_id: order.filling_id,
        coating_id: order.coating_id,
        color: normalizeOptionalText(order.color),
        decor_items: order.decor_items,
        topper_text: normalizeOptionalText(order.topper_text),
        reference_photo_url: normalizeOptionalText(order.reference_photo_url),
        delivery_type: isDeliverySelected ? 'delivery' : 'pickup',
        address: isDeliverySelected ? normalizeOptionalText(order.address) : null,
        order_date: order.order_date,
        order_time: normalizeOptionalText(order.order_time),
        comment: normalizeOptionalText(order.comment),
        total_price: finalTotalPrice,
      });

      updateOrder({
        delivery_type: isDeliverySelected ? 'delivery' : 'pickup',
        total_price: finalTotalPrice,
      });

      return true;
    } catch {
      setSubmitError('Не удалось отправить заказ. Попробуйте ещё раз.');
      return false;
    }
  }, [
    finalTotalPrice,
    isDeliverySelected,
    order.address,
    order.baker_id,
    order.client_contact,
    order.client_contact_type,
    order.client_name,
    order.coating_id,
    order.color,
    order.comment,
    order.decor_items,
    order.filling_id,
    order.occasion,
    order.order_date,
    order.order_time,
    order.reference_photo_url,
    order.servings,
    order.shape,
    order.topper_text,
    updateOrder,
    validate,
  ]);

  useEffect(() => {
    registerSubmitHandler(submitOrder);

    return () => {
      registerSubmitHandler(null);
    };
  }, [registerSubmitHandler, submitOrder]);

  const fieldBaseClass =
    'mt-1 min-h-[44px] w-full rounded-xl border border-transparent bg-surface px-3 py-2 text-sm text-text-primary outline-none transition duration-300 focus:ring-2 focus:ring-primary-from/40';
  const labelClass = 'block text-xs font-semibold uppercase tracking-[0.04em] text-text-secondary';

  return (
    <section className="rounded-3xl bg-white/85 p-5 shadow-card backdrop-blur-sm sm:p-6">
      <h2 className="text-center font-display text-3xl text-text-primary">Оформление заказа</h2>
      <p className="mt-2 text-center text-sm text-text-secondary">Заполните контакты и выберите удобный формат получения</p>

      <div className="mt-5 space-y-4">
        <label className={labelClass}>
          Имя клиента *
          <input
            type="text"
            value={order.client_name}
            onChange={(event) => updateOrder({ client_name: event.target.value })}
            placeholder="Например: Анна"
            className={fieldBaseClass}
          />
          {fieldErrors.client_name ? <p className="mt-1 text-xs text-rose-700">{fieldErrors.client_name}</p> : null}
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_170px]">
          <label className={labelClass}>
            Контакт *
            <input
              type="text"
              value={order.client_contact}
              onChange={(event) => updateOrder({ client_contact: event.target.value })}
              placeholder="@username / +7..."
              className={fieldBaseClass}
            />
            {fieldErrors.client_contact ? <p className="mt-1 text-xs text-rose-700">{fieldErrors.client_contact}</p> : null}
          </label>

          <label className={labelClass}>
            Тип контакта
            <select
              value={order.client_contact_type}
              onChange={(event) =>
                updateOrder({ client_contact_type: event.target.value as 'telegram' | 'whatsapp' | 'phone' })
              }
              className={[fieldBaseClass, 'appearance-none bg-[image:var(--select-chevron)] bg-[position:right_0.7rem_center] bg-[length:0.75rem] bg-no-repeat pr-9'].join(' ')}
            >
              <option value="telegram">Telegram</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="phone">Телефон</option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            Дата заказа *
            <div className="relative mt-1">
              <input
                type="date"
                min={minOrderDate}
                value={order.order_date}
                onChange={(event) => updateOrder({ order_date: event.target.value })}
                className={[fieldBaseClass, 'datepicker-input mt-0 pr-10'].join(' ')}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-base text-primary-to">📅</span>
            </div>
            <p className="mt-1 text-xs text-text-secondary">Минимальная дата заказа: {minOrderDate}</p>
            {fieldErrors.order_date ? <p className="mt-1 text-xs text-rose-700">{fieldErrors.order_date}</p> : null}
          </label>

          <label className={labelClass}>
            Время (опционально)
            <div className="relative mt-1">
              <input
                type="time"
                value={order.order_time ?? ''}
                onChange={(event) => updateOrder({ order_time: event.target.value || null })}
                className={[fieldBaseClass, 'datepicker-input mt-0 pr-10'].join(' ')}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-base text-primary-to">🕒</span>
            </div>
          </label>
        </div>

        {loadingBlockedDates ? <SkeletonParagraph /> : null}
        {!loadingBlockedDates ? (
          <div className="content-fade-in">
            {blockedDatesError ? (
              <p className="text-xs text-rose-700">Не удалось загрузить заблокированные даты, проверьте дату вручную.</p>
            ) : null}
            {blockedDateSet.size > 0 ? (
              <p className="text-xs text-text-secondary">
                Недоступные даты: {Array.from(blockedDateSet).sort().join(', ')}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="border-t border-primary-from/15 pt-4">
          <p className={labelClass}>Получение заказа</p>
          {isDeliveryEnabled ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  triggerTelegramHaptic('selection');
                  updateOrder({ delivery_type: 'pickup', address: null });
                }}
                className={[
                  'tap-scale min-h-[44px] rounded-full px-4 py-2 text-sm font-semibold transition duration-300',
                  order.delivery_type === 'pickup'
                    ? 'bg-[var(--gradient-primary)] text-white shadow-card'
                    : 'bg-surface text-text-primary shadow-[inset_0_0_0_1px_rgba(232,103,124,0.22)] hover:shadow-card',
                ].join(' ')}
                aria-pressed={order.delivery_type === 'pickup'}
              >
                Самовывоз
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerTelegramHaptic('selection');
                  updateOrder({ delivery_type: 'delivery' });
                }}
                className={[
                  'tap-scale min-h-[44px] rounded-full px-4 py-2 text-sm font-semibold transition duration-300',
                  order.delivery_type === 'delivery'
                    ? 'bg-[var(--gradient-primary)] text-white shadow-card'
                    : 'bg-surface text-text-primary shadow-[inset_0_0_0_1px_rgba(232,103,124,0.22)] hover:shadow-card',
                ].join(' ')}
                aria-pressed={order.delivery_type === 'delivery'}
              >
                Доставка (+{formatPrice(baker.delivery_price)})
              </button>
            </div>
          ) : (
            <p className="mt-2 text-sm text-text-secondary">Доступен только самовывоз.</p>
          )}

          {isDeliverySelected ? (
            <label className={[labelClass, 'mt-4'].join(' ')}>
              Адрес доставки *
              <textarea
                value={order.address ?? ''}
                onChange={(event) => updateOrder({ address: event.target.value })}
                rows={2}
                placeholder="Город, улица, дом, подъезд"
                className={fieldBaseClass}
              />
              {fieldErrors.address ? <p className="mt-1 text-xs text-rose-700">{fieldErrors.address}</p> : null}
            </label>
          ) : null}
        </div>

        <label className={[labelClass, 'block border-t border-primary-from/15 pt-4'].join(' ')}>
          Комментарий
          <textarea
            value={order.comment ?? ''}
            onChange={(event) => updateOrder({ comment: event.target.value })}
            rows={3}
            placeholder="Дополнительные пожелания по заказу"
            className={fieldBaseClass}
          />
        </label>
      </div>

      <div className="mt-6 rounded-2xl bg-secondary/95 p-4 shadow-card">
        <p className="font-display text-xl text-text-primary">Итоговая стоимость</p>
        <div className="mt-3 space-y-2 text-sm text-text-primary">
          <div className="flex items-center justify-between gap-3 border-b border-dashed border-primary-from/30 pb-2">
            <span>База (форма и размер)</span>
            <span>{formatPrice(basePrice)}</span>
          </div>
          <div className="flex items-center justify-between gap-3 border-b border-dashed border-primary-from/30 pb-2">
            <span>Начинка</span>
            <span>{formatPrice(fillingPrice)}</span>
          </div>
          <div className="flex items-center justify-between gap-3 border-b border-dashed border-primary-from/30 pb-2">
            <span>Покрытие</span>
            <span>{formatPrice(coatingPrice)}</span>
          </div>
          <div className="flex items-center justify-between gap-3 border-b border-dashed border-primary-from/30 pb-2">
            <span>Декор</span>
            <span>{formatPrice(decorPrice)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>Доставка</span>
            <span>{formatPrice(deliveryPrice)}</span>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-primary-from/35 pt-3 text-base">
          <span>Итого</span>
          <span className="bg-[var(--gradient-primary)] bg-clip-text font-display text-2xl font-semibold text-transparent">
            {formatPrice(finalTotalPrice)}
          </span>
        </div>
      </div>

      {submitError ? <p className="mt-4 text-sm text-rose-700">{submitError}</p> : null}
    </section>
  );
}
