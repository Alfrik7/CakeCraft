import { useCallback, useEffect, useMemo, useState } from 'react';
import { SkeletonCheckoutForm } from '../components/SkeletonCheckoutForm';
import { StepHeader } from '../components/StepHeader';
import { useMenuDataContext } from '../context/MenuDataContext';
import { useOrderContext } from '../context/OrderContext';
import { createOrder, getBlockedDates } from '../lib/api';
import { calculateTotal, getItemPrice } from '../lib/price';
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

function toIsoDateUtc(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function fromIsoDate(value: string): Date {
  const [year, month, day] = value.split('-').map((part) => Number(part));
  return new Date(Date.UTC(year, month - 1, day));
}

function getMonthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function shiftMonth(date: Date, delta: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + delta, 1));
}

function getCalendarDays(monthDate: Date): Date[] {
  const monthStart = getMonthStart(monthDate);
  const weekday = monthStart.getUTCDay();
  const startOffset = (weekday + 6) % 7;
  const firstGridDate = new Date(monthStart);
  firstGridDate.setUTCDate(monthStart.getUTCDate() - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const next = new Date(firstGridDate);
    next.setUTCDate(firstGridDate.getUTCDate() + index);
    return next;
  });
}

const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

interface BookingCalendarProps {
  value: string;
  minDate: string;
  blockedDateSet: Set<string>;
  onChange: (value: string) => void;
}

function BookingCalendar({ value, minDate, blockedDateSet, onChange }: BookingCalendarProps) {
  const [visibleMonth, setVisibleMonth] = useState<Date>(() =>
    getMonthStart(value ? fromIsoDate(value) : fromIsoDate(minDate)),
  );

  useEffect(() => {
    if (!value) {
      return;
    }

    setVisibleMonth(getMonthStart(fromIsoDate(value)));
  }, [value]);

  const minDateUtc = fromIsoDate(minDate);
  const monthLabel = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    visibleMonth,
  );

  return (
    <div className="mt-2 rounded-2xl border border-transparent bg-vanilla p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setVisibleMonth((prev) => shiftMonth(prev, -1))}
          className="tap-scale rounded-full border border-[#F4E0E4] bg-white w-8 h-8 flex items-center justify-center text-truffle transition hover:text-rose hover:border-rose focus-visible:outline-none"
        >
          ←
        </button>
        <p className="text-[15px] font-bold capitalize text-chocolate">{monthLabel}</p>
        <button
          type="button"
          onClick={() => setVisibleMonth((prev) => shiftMonth(prev, 1))}
          className="tap-scale rounded-full border border-[#F4E0E4] bg-white w-8 h-8 flex items-center justify-center text-truffle transition hover:text-rose hover:border-rose focus-visible:outline-none"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="py-1 text-center text-[11px] font-bold uppercase tracking-wider text-truffle">
            {label}
          </div>
        ))}
        {getCalendarDays(visibleMonth).map((day) => {
          const iso = toIsoDateUtc(day);
          const isCurrentMonth = day.getUTCMonth() === visibleMonth.getUTCMonth();
          const isBlocked = blockedDateSet.has(iso);
          const isTooEarly = day.getTime() < minDateUtc.getTime();
          const isDisabled = isBlocked || isTooEarly;
          const isSelected = value === iso;

          return (
            <button
              key={iso}
              type="button"
              disabled={isDisabled}
              onClick={() => onChange(iso)}
              className={[
                'tap-scale relative min-h-[36px] rounded-xl text-[13px] transition-all duration-300',
                isCurrentMonth ? 'text-chocolate' : 'text-truffle/40',
                isSelected ? 'btn-gradient font-bold text-white shadow-md' : '',
                !isSelected && !isDisabled ? 'hover:bg-rose/10 hover:text-rose' : '',
                isTooEarly ? 'cursor-not-allowed opacity-30' : '',
                isBlocked
                  ? 'cursor-not-allowed bg-cream text-truffle line-through after:absolute after:left-1 after:right-1 after:top-1/2 after:h-[1.5px] after:-translate-y-1/2 after:rotate-[-15deg] after:bg-rose/60'
                  : '',
              ].join(' ')}
              aria-label={iso}
            >
              {day.getUTCDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface StepCheckoutProps {
  baker: Baker;
  onBack: () => void;
  registerSubmitHandler: (handler: (() => Promise<boolean>) | null) => void;
  onCanSubmitChange: (value: boolean) => void;
}

export function StepCheckout({ baker, onBack, registerSubmitHandler, onCanSubmitChange }: StepCheckoutProps) {
  const { order, updateOrder } = useOrderContext();
  const { menuData } = useMenuDataContext();
  const [loadingBlockedDates, setLoadingBlockedDates] = useState(true);
  const [blockedDateSet, setBlockedDateSet] = useState<Set<string>>(new Set());
  const [blockedDatesError, setBlockedDatesError] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const menuItemsById = useMemo(
    () =>
      [...menuData.filling, ...menuData.decor].reduce<Record<string, MenuItem>>((acc, item) => {
        acc[item.id] = item;
        return acc;
      }, {}),
    [menuData.decor, menuData.filling],
  );

  const minOrderDate = useMemo(() => toIsoDate(addDays(new Date(), baker.min_order_days)), [baker.min_order_days]);
  const isDeliveryEnabled = baker.delivery_enabled;
  const isCustomDeliveryPrice = baker.delivery_price_type === 'custom';
  const isDeliverySelected = isDeliveryEnabled && order.delivery_type === 'delivery';
  const pickupAddress = baker.pickup_address?.trim() ?? '';
  const showPickupAddress = order.delivery_type === 'pickup' && pickupAddress.length > 0;

  useEffect(() => {
    let isActive = true;

    async function loadCheckoutData() {
      setLoadingBlockedDates(true);
      setBlockedDatesError(false);

      try {
        const blockedDates = await getBlockedDates(baker.id);

        if (!isActive) {
          return;
        }

        setBlockedDateSet(new Set(blockedDates.map((item) => item.date)));
      } catch {
        if (isActive) {
          setBlockedDatesError(true);
          setBlockedDateSet(new Set());
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

  const guests = order.servings ?? 0;
  const fillingItem = order.filling_id ? menuItemsById[order.filling_id] : null;
  const selectedDecorItems = order.decor_items
    .map((itemId) => menuItemsById[itemId])
    .filter((item): item is MenuItem => Boolean(item));
  const fillingPrice = getItemPrice(guests, fillingItem);
  const decorPrice = selectedDecorItems.reduce((sum, item) => sum + getItemPrice(guests, item), 0);
  const subtotalPrice = calculateTotal(guests, fillingItem, selectedDecorItems);
  const basePrice = Math.max(0, Math.round(subtotalPrice - fillingPrice - decorPrice));
  const deliveryPrice = isDeliverySelected && !isCustomDeliveryPrice ? baker.delivery_price : 0;
  const finalTotalPrice = Math.round(subtotalPrice + deliveryPrice);

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
    'mt-2 min-h-[48px] w-full rounded-xl border border-transparent bg-vanilla shadow-soft px-4 py-3 text-[15px] text-chocolate outline-none transition duration-300 focus:ring-2 focus:ring-rose/40 placeholder:text-truffle/50';
  const labelClass = 'block text-[12px] font-bold uppercase tracking-wider text-truffle';

  return (
    <section className="px-4 py-6 mb-24">
      <StepHeader
        title="Оформление заказа"
        subtitle="Заполните контакты и выберите удобный формат получения"
        onBack={onBack}
      />

      <div className="mt-8 space-y-6">
        {loadingBlockedDates ? <SkeletonCheckoutForm /> : null}
        {!loadingBlockedDates ? (
          <div className="space-y-6">
            <label className={labelClass}>
              Имя клиента *
              <input
                type="text"
                value={order.client_name}
                onChange={(event) => updateOrder({ client_name: event.target.value })}
                placeholder="Например: Анна"
                className={fieldBaseClass}
              />
              {fieldErrors.client_name ? (
                <p className="mt-2 text-[12px] text-[#D4596C] font-semibold">{fieldErrors.client_name}</p>
              ) : null}
            </label>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-[minmax(0,1fr)_170px]">
              <label className={labelClass}>
                Контакт *
                <input
                  type="text"
                  value={order.client_contact}
                  onChange={(event) => updateOrder({ client_contact: event.target.value })}
                  placeholder="@username / +7..."
                  className={fieldBaseClass}
                />
                {fieldErrors.client_contact ? (
                  <p className="mt-2 text-[12px] text-[#D4596C] font-semibold">{fieldErrors.client_contact}</p>
                ) : null}
              </label>

              <label className={labelClass}>
                Тип контакта
                <select
                  value={order.client_contact_type}
                  onChange={(event) =>
                    updateOrder({ client_contact_type: event.target.value as 'telegram' | 'whatsapp' | 'phone' })
                  }
                  className={[fieldBaseClass, 'appearance-none bg-[image:var(--select-chevron)] bg-[position:right_1rem_center] bg-[length:0.75rem] bg-no-repeat pr-10'].join(' ')}
                >
                  <option value="telegram">Telegram</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="phone">Телефон</option>
                </select>
              </label>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <label className={labelClass}>
                Дата заказа *
                <BookingCalendar
                  value={order.order_date}
                  minDate={minOrderDate}
                  blockedDateSet={blockedDateSet}
                  onChange={(date) => updateOrder({ order_date: date })}
                />
                <p className="mt-2 text-[12px] text-truffle normal-case tracking-normal font-normal">Минимальная дата заказа: {minOrderDate}</p>
                {fieldErrors.order_date ? (
                  <p className="mt-2 text-[12px] text-[#D4596C] font-semibold normal-case tracking-normal">{fieldErrors.order_date}</p>
                ) : null}
              </label>

              <label className={labelClass}>
                Время (опционально)
                <div className="relative mt-2">
                  <input
                    type="time"
                    value={order.order_time ?? ''}
                    onChange={(event) => updateOrder({ order_time: event.target.value || null })}
                    className={[fieldBaseClass, 'mt-0 pr-12'].join(' ')}
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xl">🕒</span>
                </div>
              </label>
            </div>

            <div className="content-fade-in">
              {blockedDatesError ? (
                <p className="text-[12px] text-[#D4596C]">
                  Не удалось загрузить заблокированные даты, проверьте дату вручную.
                </p>
              ) : null}
            </div>

            <div className="border-t border-[#F4E0E4] pt-6">
              <p className={labelClass}>Получение заказа</p>
              {isDeliveryEnabled ? (
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      triggerTelegramHaptic('selection');
                      updateOrder({ delivery_type: 'pickup', address: null });
                    }}
                    className={[
                      'tap-scale min-h-[44px] rounded-full px-5 py-2 text-[14px] font-bold transition-all duration-300',
                      order.delivery_type === 'pickup'
                        ? 'btn-gradient text-white shadow-md'
                        : 'bg-vanilla text-truffle border border-[#F4E0E4] hover:text-chocolate hover:border-rose',
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
                      'tap-scale min-h-[44px] rounded-full px-5 py-2 text-[14px] font-bold transition-all duration-300',
                      order.delivery_type === 'delivery'
                        ? 'btn-gradient text-white shadow-md'
                        : 'bg-vanilla text-truffle border border-[#F4E0E4] hover:text-chocolate hover:border-rose',
                    ].join(' ')}
                    aria-pressed={order.delivery_type === 'delivery'}
                  >
                    {isCustomDeliveryPrice ? 'Доставка (рассч. отдельно)' : `Доставка (+${formatPrice(baker.delivery_price)})`}
                  </button>
                </div>
              ) : (
                <p className="mt-3 text-[14px] text-truffle">Доступен только самовывоз.</p>
              )}

              {isDeliverySelected ? (
                <label className={[labelClass, 'mt-6'].join(' ')}>
                  Адрес доставки *
                  <textarea
                    value={order.address ?? ''}
                    onChange={(event) => updateOrder({ address: event.target.value })}
                    rows={2}
                    placeholder="Город, улица, дом, подъезд"
                    className={fieldBaseClass}
                  />
                  {fieldErrors.address ? (
                    <p className="mt-2 text-[12px] text-[#D4596C] font-semibold normal-case tracking-normal">{fieldErrors.address}</p>
                  ) : null}
                </label>
              ) : null}

              {showPickupAddress ? (
                <div className="mt-4 rounded-2xl bg-vanilla p-4 shadow-soft border border-[#F4E0E4]">
                  <p className="text-[13px] font-bold text-chocolate uppercase tracking-wider">📍 Адрес самовывоза</p>
                  <p className="mt-2 text-[15px] text-truffle">{pickupAddress}</p>
                </div>
              ) : null}
            </div>

            <label className={[labelClass, 'block border-t border-[#F4E0E4] pt-6'].join(' ')}>
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
        ) : null}
      </div>

      {!loadingBlockedDates ? (
        <div className="mt-8 rounded-[24px] bg-cream border border-[#F4E0E4] p-5 shadow-soft">
          <p className="font-display text-[22px] font-bold text-chocolate">Итоговая стоимость</p>
          <div className="mt-4 space-y-3 text-[15px] text-truffle font-medium">
            <div className="flex items-center justify-between gap-3 border-b border-dashed border-[#F4E0E4] pb-3">
              <span>База (форма и размер)</span>
              <span className="text-chocolate font-bold">{formatPrice(basePrice)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-dashed border-[#F4E0E4] pb-3">
              <span>Начинка</span>
              <span className="text-chocolate font-bold">{formatPrice(fillingPrice)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-dashed border-[#F4E0E4] pb-3">
              <span>Декор</span>
              <span className="text-chocolate font-bold">{formatPrice(decorPrice)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Доставка</span>
              <span className="text-chocolate font-bold">
                {isDeliverySelected && isCustomDeliveryPrice ? 'рассчитывается отдельно' : formatPrice(deliveryPrice)}
              </span>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-[#F4E0E4] pt-4">
            <span className="text-[15px] font-bold text-truffle uppercase tracking-wider">Итого</span>
            <span className="font-display text-[28px] font-bold text-rose leading-none">
              {formatPrice(finalTotalPrice)}
            </span>
          </div>
        </div>
      ) : null}

      {!loadingBlockedDates && submitError ? (
        <p className="mt-6 text-[14px] text-center font-bold text-[#D4596C] bg-[#FFF0F3] py-3 rounded-xl">{submitError}</p>
      ) : null}
    </section>
  );
}