import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuthContext } from '../../context/AuthContext';
import { BAKER_THEMES } from '../../lib/theme';
import { getBakerById, updateBakerProfile, uploadBakerLogo } from '../../lib/api';
import type { Baker, WorkingHours } from '../../types';

const WEEK_DAYS: Array<{ key: string; label: string }> = [
  { key: 'monday', label: 'Пн' },
  { key: 'tuesday', label: 'Вт' },
  { key: 'wednesday', label: 'Ср' },
  { key: 'thursday', label: 'Чт' },
  { key: 'friday', label: 'Пт' },
  { key: 'saturday', label: 'Сб' },
  { key: 'sunday', label: 'Вс' },
];

interface ProfileFormState {
  name: string;
  notificationTelegram: string;
  welcomeMessage: string;
  minOrderDays: string;
  deliveryEnabled: boolean;
  deliveryPriceType: Baker['delivery_price_type'];
  deliveryPrice: string;
  theme: Baker['theme'];
  pickupAddress: string;
  workingHours: WorkingHours;
  logoFile: File | null;
}

function getDefaultWorkingHours(): WorkingHours {
  return WEEK_DAYS.reduce<WorkingHours>((acc, day, index) => {
    acc[day.key] = {
      from: '10:00',
      to: '20:00',
      enabled: index < 5,
    };
    return acc;
  }, {});
}

function getInitialFormState(baker: Baker): ProfileFormState {
  return {
    name: baker.name,
    notificationTelegram: baker.notification_telegram ?? '',
    welcomeMessage: baker.welcome_message,
    minOrderDays: String(baker.min_order_days),
    deliveryEnabled: baker.delivery_enabled,
    deliveryPriceType: baker.delivery_price_type ?? 'fixed',
    deliveryPrice: String(baker.delivery_price),
    theme: baker.theme ?? 'pink',
    pickupAddress: baker.pickup_address ?? '',
    workingHours: baker.working_hours ?? getDefaultWorkingHours(),
    logoFile: null,
  };
}

function normalizeTelegramUsername(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  const withoutPrefix = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
  return withoutPrefix ? `@${withoutPrefix}` : '';
}

function isTelegramUsernameValid(value: string): boolean {
  if (!value.trim()) {
    return true;
  }

  const normalized = normalizeTelegramUsername(value);
  return /^@[a-zA-Z0-9_]{5,32}$/.test(normalized);
}

export function AdminProfilePage() {
  const { session, updateSessionProfile } = useAuthContext();
  const [baker, setBaker] = useState<Baker | null>(null);
  const [form, setForm] = useState<ProfileFormState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  const constructorUrl = useMemo(
    () => (session ? `https://app.cakecraft.ru/${session.bakerSlug}` : ''),
    [session],
  );

  useEffect(() => {
    if (!session?.bakerId) {
      return;
    }

    const loadProfile = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const loaded = await getBakerById(session.bakerId);

        if (!loaded) {
          setError('Профиль не найден.');
          return;
        }

        setBaker(loaded);
        setForm(getInitialFormState(loaded));
      } catch {
        setError('Не удалось загрузить профиль. Попробуйте обновить страницу.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadProfile();
  }, [session?.bakerId]);

  const handleCopyLink = async () => {
    if (!constructorUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(constructorUrl);
      setCopySuccess('Ссылка скопирована.');
    } catch {
      setCopySuccess('Не удалось скопировать ссылку.');
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form || !session?.bakerId) {
      return;
    }

    setError(null);
    setSuccess(null);

    const trimmedName = form.name.trim();
    const trimmedWelcome = form.welcomeMessage.trim();
    const normalizedNotificationTelegram = normalizeTelegramUsername(form.notificationTelegram);
    const trimmedPickupAddress = form.pickupAddress.trim();
    const minOrderDays = Number(form.minOrderDays);
    const deliveryPrice = Number(form.deliveryPrice.replace(',', '.'));

    if (!trimmedName) {
      setError('Укажите имя мастера или название кондитерской.');
      return;
    }

    if (!trimmedWelcome) {
      setError('Добавьте приветственное сообщение.');
      return;
    }

    if (!Number.isFinite(minOrderDays) || minOrderDays < 0) {
      setError('Минимальный срок заказа должен быть 0 или больше.');
      return;
    }

    if (form.deliveryPriceType === 'fixed' && (!Number.isFinite(deliveryPrice) || deliveryPrice < 0)) {
      setError('Укажите корректную цену доставки.');
      return;
    }

    if (!isTelegramUsernameValid(normalizedNotificationTelegram)) {
      setError('Укажите корректный Telegram username в формате @username.');
      return;
    }

    if (form.logoFile && !['image/jpeg', 'image/png', 'image/webp'].includes(form.logoFile.type)) {
      setError('Допустимы только JPG, PNG или WEBP.');
      return;
    }

    if (form.logoFile && form.logoFile.size > 5 * 1024 * 1024) {
      setError('Размер логотипа должен быть не больше 5MB.');
      return;
    }

    try {
      setIsSaving(true);

      let logoUrl: string | undefined;
      if (form.logoFile) {
        logoUrl = await uploadBakerLogo(session.bakerId, form.logoFile);
      }

      const updated = await updateBakerProfile(session.bakerId, {
        name: trimmedName,
        ...(logoUrl ? { logo_url: logoUrl } : {}),
        notification_telegram: normalizedNotificationTelegram || null,
        welcome_message: trimmedWelcome,
        min_order_days: minOrderDays,
        delivery_enabled: form.deliveryEnabled,
        delivery_price_type: form.deliveryPriceType,
        delivery_price: deliveryPrice,
        theme: form.theme,
        pickup_address: trimmedPickupAddress || null,
        working_hours: form.workingHours,
      });

      setBaker(updated);
      setForm(getInitialFormState(updated));
      updateSessionProfile({
        bakerName: updated.name,
        bakerLogoUrl: updated.logo_url,
      });
      setSuccess('Профиль сохранён.');
    } catch {
      setError('Не удалось сохранить профиль. Попробуйте ещё раз.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!session) {
    return null;
  }

  if (isLoading || !form || !baker) {
    return <p className="text-sm text-gray-500">Загрузка профиля...</p>;
  }

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Профиль</h1>
        <p className="mt-1 text-sm text-gray-600">Настройте публичный профиль и параметры заказа.</p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
        <p className="text-sm font-medium text-gray-800">Ссылка на конструктор</p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            readOnly
            value={constructorUrl}
            className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700"
          />
          <button
            type="button"
            onClick={handleCopyLink}
            className="min-h-11 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Копировать
          </button>
        </div>
        {copySuccess ? <p className="mt-2 text-sm text-gray-600">{copySuccess}</p> : null}
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-gray-800">Основная информация</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block font-medium text-gray-700">Имя мастера / название кондитерской</span>
              <input
                type="text"
                required
                value={form.name}
                onChange={(event) => setForm((prev) => (prev ? { ...prev, name: event.target.value } : prev))}
                className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Логотип / аватарка</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) =>
                  setForm((prev) => (prev ? { ...prev, logoFile: event.target.files?.[0] ?? null } : prev))
                }
                className="block w-full rounded-xl border border-gray-200 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-rose-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-rose-700"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Telegram для уведомлений</span>
              <input
                type="text"
                value={form.notificationTelegram}
                onChange={(event) =>
                  setForm((prev) => (prev ? { ...prev, notificationTelegram: event.target.value } : prev))
                }
                className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm"
                placeholder="@username"
              />
            </label>

            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block font-medium text-gray-700">Приветственное сообщение</span>
              <textarea
                rows={3}
                required
                value={form.welcomeMessage}
                onChange={(event) =>
                  setForm((prev) => (prev ? { ...prev, welcomeMessage: event.target.value } : prev))
                }
                className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm"
              />
            </label>

            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block font-medium text-gray-700">Адрес самовывоза</span>
              <textarea
                rows={2}
                value={form.pickupAddress}
                onChange={(event) =>
                  setForm((prev) => (prev ? { ...prev, pickupAddress: event.target.value } : prev))
                }
                className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm"
                placeholder="Город, улица, дом, ориентир"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Минимальный срок заказа (дней)</span>
              <input
                type="number"
                min={0}
                required
                value={form.minOrderDays}
                onChange={(event) =>
                  setForm((prev) => (prev ? { ...prev, minOrderDays: event.target.value } : prev))
                }
                className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm"
              />
            </label>

            <div className="block text-sm sm:col-span-2">
              <span className="mb-2 block font-medium text-gray-700">Тема конструктора</span>
              <div className="grid gap-2 sm:grid-cols-2">
                {BAKER_THEMES.map((themePreset) => {
                  const isSelected = form.theme === themePreset.id;

                  return (
                    <button
                      key={themePreset.id}
                      type="button"
                      onClick={() =>
                        setForm((prev) => (prev ? { ...prev, theme: themePreset.id } : prev))
                      }
                      className={[
                        'flex items-center gap-3 rounded-xl border px-3 py-2 text-left transition',
                        isSelected ? 'border-rose-300 bg-rose-50' : 'border-gray-200 bg-white hover:bg-gray-50',
                      ].join(' ')}
                      aria-pressed={isSelected}
                    >
                      <span
                        className="h-10 w-10 shrink-0 rounded-lg border border-white/60 shadow-sm"
                        style={{
                          backgroundImage: `linear-gradient(135deg, ${themePreset.colors.primaryFrom} 0%, ${themePreset.colors.primaryTo} 100%)`,
                        }}
                        aria-hidden="true"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-gray-800">{themePreset.label}</span>
                        <span className="mt-1 block h-2.5 w-20 rounded-full border border-gray-200/80 bg-gray-100">
                          <span
                            className="block h-full rounded-full"
                            style={{
                              width: '70%',
                              backgroundImage: `linear-gradient(90deg, ${themePreset.colors.primaryFrom} 0%, ${themePreset.colors.primaryTo} 100%)`,
                            }}
                          />
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-gray-800">Доставка</h2>
          <label className="mt-3 flex min-h-11 items-center gap-3 rounded-xl border border-gray-200 px-3 py-2">
            <input
              type="checkbox"
              checked={form.deliveryEnabled}
              onChange={(event) =>
                setForm((prev) => (prev ? { ...prev, deliveryEnabled: event.target.checked } : prev))
              }
              className="h-4 w-4 rounded border-gray-300 text-rose-500 focus:ring-rose-300"
            />
            <span className="text-sm font-medium text-gray-700">Включить доставку</span>
          </label>

          <div className="mt-3 space-y-2">
            <p className="text-sm font-medium text-gray-700">Тип стоимости доставки</p>
            <label className="flex min-h-11 items-center gap-3 rounded-xl border border-gray-200 px-3 py-2">
              <input
                type="radio"
                name="deliveryPriceType"
                value="fixed"
                disabled={!form.deliveryEnabled}
                checked={form.deliveryPriceType === 'fixed'}
                onChange={() =>
                  setForm((prev) => (prev ? { ...prev, deliveryPriceType: 'fixed' } : prev))
                }
                className="h-4 w-4 border-gray-300 text-rose-500 focus:ring-rose-300"
              />
              <span className="text-sm text-gray-700">Фиксированная цена</span>
            </label>
            <label className="flex min-h-11 items-center gap-3 rounded-xl border border-gray-200 px-3 py-2">
              <input
                type="radio"
                name="deliveryPriceType"
                value="custom"
                disabled={!form.deliveryEnabled}
                checked={form.deliveryPriceType === 'custom'}
                onChange={() =>
                  setForm((prev) => (prev ? { ...prev, deliveryPriceType: 'custom' } : prev))
                }
                className="h-4 w-4 border-gray-300 text-rose-500 focus:ring-rose-300"
              />
              <span className="text-sm text-gray-700">Рассчитывается отдельно</span>
            </label>
          </div>

          <label className="mt-3 block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Цена доставки, ₽</span>
            <input
              type="number"
              min={0}
              step={1}
              disabled={!form.deliveryEnabled || form.deliveryPriceType !== 'fixed'}
              value={form.deliveryPrice}
              onChange={(event) =>
                setForm((prev) => (prev ? { ...prev, deliveryPrice: event.target.value } : prev))
              }
              className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm disabled:cursor-not-allowed disabled:bg-gray-100"
            />
          </label>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-gray-800">Рабочие часы</h2>
          <div className="mt-3 space-y-2">
            {WEEK_DAYS.map((day) => {
              const dayState = form.workingHours[day.key] ?? { from: '10:00', to: '20:00', enabled: false };

              return (
                <div
                  key={day.key}
                  className="grid grid-cols-[52px_1fr_1fr] items-center gap-2 rounded-xl border border-gray-200 px-3 py-2"
                >
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={Boolean(dayState.enabled)}
                      onChange={(event) =>
                        setForm((prev) =>
                          prev
                            ? {
                                ...prev,
                                workingHours: {
                                  ...prev.workingHours,
                                  [day.key]: {
                                    ...dayState,
                                    enabled: event.target.checked,
                                  },
                                },
                              }
                            : prev,
                        )
                      }
                      className="h-4 w-4 rounded border-gray-300 text-rose-500 focus:ring-rose-300"
                    />
                    {day.label}
                  </label>

                  <input
                    type="time"
                    value={dayState.from}
                    disabled={!dayState.enabled}
                    onChange={(event) =>
                      setForm((prev) =>
                        prev
                          ? {
                              ...prev,
                              workingHours: {
                                ...prev.workingHours,
                                [day.key]: {
                                  ...dayState,
                                  from: event.target.value,
                                },
                              },
                            }
                          : prev,
                      )
                    }
                    className="h-10 rounded-lg border border-gray-200 px-2 text-sm disabled:cursor-not-allowed disabled:bg-gray-100"
                  />

                  <input
                    type="time"
                    value={dayState.to}
                    disabled={!dayState.enabled}
                    onChange={(event) =>
                      setForm((prev) =>
                        prev
                          ? {
                              ...prev,
                              workingHours: {
                                ...prev.workingHours,
                                [day.key]: {
                                  ...dayState,
                                  to: event.target.value,
                                },
                              },
                            }
                          : prev,
                      )
                    }
                    className="h-10 rounded-lg border border-gray-200 px-2 text-sm disabled:cursor-not-allowed disabled:bg-gray-100"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}
        {success ? <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}

        <button
          type="submit"
          disabled={isSaving}
          className="flex min-h-11 w-full items-center justify-center rounded-xl bg-rose-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-rose-200"
        >
          {isSaving ? 'Сохраняем...' : 'Сохранить'}
        </button>
      </form>
    </section>
  );
}
