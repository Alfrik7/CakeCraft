import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY;
const BAKER_SLUG = process.env.E2E_BAKER_SLUG ?? 'demo-baker';

const E2E_READY = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

interface BakerRow {
  id: string;
  min_order_days: number;
  delivery_enabled: boolean;
  delivery_price: number | string;
}

interface MenuItemRow {
  id: string;
  name: string;
  category: 'shape' | 'filling' | 'decor';
  price: number | string;
  price_type: 'fixed' | 'per_kg';
}

interface OrderRow {
  id: string;
  baker_id: string;
  client_name: string;
  client_contact: string;
  client_contact_type: 'telegram' | 'whatsapp' | 'phone';
  occasion: string | null;
  shape: string | null;
  servings: number | null;
  filling_id: string | null;
  decor_items: string[];
  delivery_type: 'pickup' | 'delivery';
  address: string | null;
  order_date: string;
  order_time: string | null;
  comment: string | null;
  total_price: number | string;
  status: 'new' | 'confirmed' | 'in_progress' | 'done' | 'cancelled';
}

function toNumber(value: number | string): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatPrice(value: number): string {
  return `${new Intl.NumberFormat('ru-RU').format(Math.round(value))} ₽`;
}

function estimateWeightKg(servings: number): number {
  const mapping: Record<number, number> = {
    6: 0.6,
    8: 0.8,
    12: 1.2,
    16: 1.6,
    20: 2,
  };

  return mapping[servings] ?? servings / 10;
}

function getItemPrice(servings: number, item: MenuItemRow): number {
  const basePrice = toNumber(item.price);
  return item.price_type === 'per_kg' ? basePrice * estimateWeightKg(servings) : basePrice;
}

function toIsoDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function pickAvailableOrderDate(minOrderDays: number, blocked: Set<string>): string {
  for (let offset = Math.max(0, minOrderDays); offset < 60; offset += 1) {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    const iso = toIsoDate(date);

    if (!blocked.has(iso)) {
      return iso;
    }
  }

  throw new Error('Could not find available order date in the next 60 days.');
}

test.describe('Клиентский конструктор торта', () => {
  test.skip(!E2E_READY, 'Set VITE_SUPABASE_URL and E2E_SUPABASE_SERVICE_ROLE_KEY to run E2E test.');

  test('проходит полный флоу и создаёт корректный заказ в Supabase', async ({ page }) => {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: baker, error: bakerError } = await supabase
      .from('bakers')
      .select('id,min_order_days,delivery_enabled,delivery_price')
      .eq('slug', BAKER_SLUG)
      .limit(1)
      .single<BakerRow>();

    expect(bakerError).toBeNull();
    expect(baker).toBeTruthy();

    const { data: menuItems, error: menuError } = await supabase
      .from('menu_items')
      .select('id,name,category,price,price_type')
      .eq('baker_id', baker!.id)
      .eq('is_active', true)
      .in('category', ['shape', 'filling', 'decor'])
      .returns<MenuItemRow[]>();

    expect(menuError).toBeNull();
    expect(menuItems).toBeTruthy();

    const byCategoryAndName = (category: MenuItemRow['category'], name: string): MenuItemRow => {
      const item = menuItems!.find((entry) => entry.category === category && entry.name === name);

      if (!item) {
        throw new Error(`Required seeded menu item not found: ${category}:${name}`);
      }

      return item;
    };

    const selectedShape = byCategoryAndName('shape', 'Сердце');
    const selectedFilling = byCategoryAndName('filling', 'Шоколад-вишня');
    const selectedDecorBerries = byCategoryAndName('decor', 'Ягоды');
    const selectedDecorTopper = byCategoryAndName('decor', 'Топпер');

    const { data: blockedDates, error: blockedDatesError } = await supabase
      .from('blocked_dates')
      .select('date')
      .eq('baker_id', baker!.id);

    expect(blockedDatesError).toBeNull();

    const blockedDateSet = new Set((blockedDates ?? []).map((entry) => entry.date as string));
    const orderDate = pickAvailableOrderDate(baker!.min_order_days, blockedDateSet);

    const servings = 12;
    const expectedBase = 0;
    const expectedFilling = Math.round(getItemPrice(servings, selectedFilling));
    const expectedDecor = Math.round(
      getItemPrice(servings, selectedDecorBerries) + getItemPrice(servings, selectedDecorTopper),
    );
    const expectedDelivery = baker!.delivery_enabled ? toNumber(baker!.delivery_price) : 0;
    const expectedTotal = expectedBase + expectedFilling + expectedDecor + expectedDelivery;

    const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const clientName = `E2E Клиент ${runId}`;
    const clientContact = `@e2e_${runId.replace(/[^a-zA-Z0-9]/g, '')}`;
    const finalComment = `Проверка E2E ${runId}`;
    const deliveryAddress = 'Москва, ул. Пушкина, д. 10, кв. 15';

    await page.goto(`/${BAKER_SLUG}`);

    await expect(page.getByRole('heading', { name: 'Какой у вас повод?' })).toBeVisible();
    await page.getByRole('button', { name: /День рождения/ }).click();
    await page.getByRole('button', { name: 'Далее' }).click();

    await expect(page.getByRole('heading', { name: 'Выберите форму' })).toBeVisible();
    await page.getByRole('button', { name: /Сердце/ }).first().click();
    await page.getByLabel('Количество гостей').fill(String(servings));
    await page.getByRole('button', { name: 'Далее' }).click();

    await expect(page.getByRole('heading', { name: 'Выберите начинку' })).toBeVisible();
    await page.getByRole('button', { name: /Шоколад-вишня/ }).first().click();
    await page.getByRole('button', { name: 'Далее' }).click();

    await expect(page.getByRole('heading', { name: 'Финальный декор' })).toBeVisible();
    await page.getByRole('button', { name: /Ягоды/ }).first().click();
    await page.getByRole('button', { name: /Топпер/ }).first().click();
    await page.getByRole('button', { name: 'Далее' }).click();

    await expect(page.getByRole('heading', { name: 'Оформление заказа' })).toBeVisible();
    await page.getByLabel('Имя клиента *').fill(clientName);
    await page.getByLabel('Контакт *').fill(clientContact);
    await page.getByLabel('Тип контакта').selectOption('telegram');
    await page.getByLabel('Дата заказа *').fill(orderDate);
    await page.getByLabel('Время (опционально)').fill('13:30');

    if (baker!.delivery_enabled) {
      await page.getByRole('button', { name: /Доставка/ }).click();
      await page.getByLabel('Адрес доставки *').fill(deliveryAddress);
    }

    await page.getByLabel('Комментарий').fill(finalComment);
    await expect(page.getByText(formatPrice(expectedTotal)).first()).toBeVisible();

    await page.getByRole('button', { name: 'Отправить заказ' }).click();
    await expect(page.getByRole('heading', { name: 'Заказ отправлен!' })).toBeVisible();

    const { data: insertedOrders, error: insertedOrdersError } = await supabase
      .from('orders')
      .select('*')
      .eq('baker_id', baker!.id)
      .eq('client_contact', clientContact)
      .order('created_at', { ascending: false })
      .limit(1)
      .returns<OrderRow[]>();

    expect(insertedOrdersError).toBeNull();
    expect(insertedOrders).toHaveLength(1);

    const insertedOrder = insertedOrders![0];

    expect(insertedOrder.client_name).toBe(clientName);
    expect(insertedOrder.client_contact).toBe(clientContact);
    expect(insertedOrder.client_contact_type).toBe('telegram');
    expect(insertedOrder.occasion).toBe('birthday');
    expect(insertedOrder.shape).toBe(selectedShape.name);
    expect(insertedOrder.servings).toBe(servings);
    expect(insertedOrder.filling_id).toBe(selectedFilling.id);
    expect(insertedOrder.decor_items).toEqual([selectedDecorBerries.id, selectedDecorTopper.id]);
    expect(insertedOrder.delivery_type).toBe(baker!.delivery_enabled ? 'delivery' : 'pickup');
    expect(insertedOrder.address).toBe(baker!.delivery_enabled ? deliveryAddress : null);
    expect(insertedOrder.order_date).toBe(orderDate);
    expect(insertedOrder.order_time).toBe('13:30');
    expect(insertedOrder.comment).toBe(finalComment);
    expect(toNumber(insertedOrder.total_price)).toBe(expectedTotal);
    expect(insertedOrder.status).toBe('new');

    const { error: cleanupError } = await supabase.from('orders').delete().eq('id', insertedOrder.id);
    expect(cleanupError).toBeNull();
  });
});
