import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

type OrderStatus = 'new' | 'confirmed' | 'in_progress' | 'done' | 'cancelled';
type ContactType = 'telegram' | 'whatsapp' | 'phone';
type DeliveryType = 'pickup' | 'delivery';

interface OrderRow {
  id: string;
  baker_id: string;
  client_name: string;
  client_contact: string;
  client_contact_type: ContactType;
  occasion: string | null;
  shape: string | null;
  servings: number | null;
  filling_id: string | null;
  coating_id: string | null;
  decor_items: string[];
  topper_text: string | null;
  reference_photo_url: string | null;
  delivery_type: DeliveryType;
  address: string | null;
  order_date: string;
  order_time: string | null;
  comment: string | null;
  total_price: number | string;
  status: OrderStatus;
  created_at: string;
}

interface BakerRow {
  id: string;
  telegram_id: string | number;
  name: string;
  slug: string;
}

interface MenuItemName {
  id: string;
  name: string;
}

interface DbWebhookPayload {
  type?: string;
  table?: string;
  schema?: string;
  record?: OrderRow;
}

interface TelegramCallbackPayload {
  callback_query?: {
    id: string;
    data?: string;
    message?: {
      message_id: number;
      chat: { id: number };
    };
    from?: { id: number };
  };
}

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const ORDER_WEBHOOK_SECRET = Deno.env.get('ORDER_WEBHOOK_SECRET');
const TELEGRAM_WEBHOOK_SECRET = Deno.env.get('TELEGRAM_WEBHOOK_SECRET');
const OWNER_TELEGRAM_ID = Deno.env.get('OWNER_TELEGRAM_ID');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!TELEGRAM_BOT_TOKEN) {
  console.warn('TELEGRAM_BOT_TOKEN is not set. Function cannot send messages.');
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY are required for DB reads/writes.');
}

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  : null;

const TELEGRAM_API_BASE = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN ?? ''}`;

function parseOrderWebhook(payload: unknown): OrderRow | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const typed = payload as DbWebhookPayload;
  const isInsert = typed.type === 'INSERT';
  const isOrdersTable = typed.table === 'orders';

  if (!isInsert || !isOrdersTable || !typed.record) {
    return null;
  }

  return typed.record;
}

function isTelegramCallback(payload: unknown): payload is TelegramCallbackPayload {
  return Boolean(payload && typeof payload === 'object' && 'callback_query' in payload);
}

function formatPriceRub(value: number | string): string {
  const asNumber = typeof value === 'number' ? value : Number(value);
  const safe = Number.isFinite(asNumber) ? asNumber : 0;

  return `${new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 0,
  }).format(safe)} ₽`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function contactLink(contact: string, type: ContactType): string {
  const trimmed = contact.trim();

  if (type === 'telegram') {
    const username = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;

    if (/^\d+$/.test(username)) {
      return `tg://user?id=${username}`;
    }

    return `https://t.me/${encodeURIComponent(username)}`;
  }

  if (type === 'whatsapp') {
    const digits = trimmed.replace(/\D/g, '');
    return `https://wa.me/${digits}`;
  }

  const phone = trimmed.replace(/[^\d+]/g, '');
  return `tel:${phone}`;
}

async function callTelegram<T>(method: string, body: Record<string, unknown>): Promise<T> {
  if (!TELEGRAM_BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN is not configured');
  }

  const response = await fetch(`${TELEGRAM_API_BASE}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const payload = await response.json();

  if (!response.ok || !payload.ok) {
    throw new Error(`Telegram API ${method} failed: ${JSON.stringify(payload)}`);
  }

  return payload.result as T;
}

function buildStatusLine(status: OrderStatus): string {
  if (status === 'confirmed') {
    return '✅ Подтверждён';
  }

  if (status === 'cancelled') {
    return '❌ Отклонён';
  }

  if (status === 'in_progress') {
    return '🧁 В работе';
  }

  if (status === 'done') {
    return '🎉 Выполнен';
  }

  return '🆕 Новый';
}

async function getMenuItemNames(ids: string[]): Promise<Record<string, string>> {
  if (!supabase || ids.length === 0) {
    return {};
  }

  const { data, error } = await supabase
    .from('menu_items')
    .select('id, name')
    .in('id', ids)
    .returns<MenuItemName[]>();

  if (error) {
    throw error;
  }

  return (data ?? []).reduce<Record<string, string>>((acc, item) => {
    acc[item.id] = item.name;
    return acc;
  }, {});
}

async function buildOrderMessage(order: OrderRow): Promise<string> {
  const itemIds = [order.filling_id, order.coating_id, ...(order.decor_items ?? [])].filter(
    (id): id is string => Boolean(id),
  );

  const namesMap = await getMenuItemNames(Array.from(new Set(itemIds)));

  const filling = order.filling_id ? (namesMap[order.filling_id] ?? `ID: ${order.filling_id}`) : 'Не выбрана';
  const coating = order.coating_id ? (namesMap[order.coating_id] ?? `ID: ${order.coating_id}`) : 'Не выбрано';
  const decor = (order.decor_items ?? []).length > 0
    ? order.decor_items.map((id) => namesMap[id] ?? `ID: ${id}`).join(', ')
    : 'Нет';

  const delivery = order.delivery_type === 'delivery'
    ? `Доставка${order.address ? `: ${escapeHtml(order.address)}` : ''}`
    : 'Самовывоз';

  const dateLine = order.order_time ? `${order.order_date} ${order.order_time}` : order.order_date;
  const contactUrl = contactLink(order.client_contact, order.client_contact_type);

  return [
    '<b>🎂 Новый заказ CakeCraft</b>',
    '',
    `<b>Клиент:</b> ${escapeHtml(order.client_name)}`,
    `<b>Контакт:</b> <a href="${escapeHtml(contactUrl)}">${escapeHtml(order.client_contact)}</a> (${order.client_contact_type})`,
    `<b>Повод:</b> ${escapeHtml(order.occasion ?? 'Не указан')}`,
    `<b>Форма:</b> ${escapeHtml(order.shape ?? 'Не выбрана')}`,
    `<b>Порции:</b> ${order.servings ?? 'Не указано'}`,
    `<b>Начинка:</b> ${escapeHtml(filling)}`,
    `<b>Покрытие:</b> ${escapeHtml(coating)}`,
    `<b>Декор:</b> ${escapeHtml(decor)}`,
    `<b>Топпер:</b> ${escapeHtml(order.topper_text ?? 'Нет')}`,
    `<b>Комментарий:</b> ${escapeHtml(order.comment ?? 'Нет')}`,
    `<b>Референс:</b> ${order.reference_photo_url ? `<a href="${escapeHtml(order.reference_photo_url)}">Открыть фото</a>` : 'Нет'}`,
    `<b>Получение:</b> ${delivery}`,
    `<b>Дата:</b> ${escapeHtml(dateLine)}`,
    `<b>Стоимость:</b> ${formatPriceRub(order.total_price)}`,
    `<b>Статус:</b> ${buildStatusLine(order.status)}`,
    '',
    `<code>order_id: ${escapeHtml(order.id)}</code>`,
  ].join('\n');
}

async function handleOrderInsertWebhook(order: OrderRow): Promise<Response> {
  if (!supabase) {
    return new Response('Supabase client is not configured', { status: 500 });
  }

  const { data: baker, error: bakerError } = await supabase
    .from('bakers')
    .select('id, telegram_id, name, slug')
    .eq('id', order.baker_id)
    .single<BakerRow>();

  if (bakerError || !baker) {
    console.error('Cannot load baker for order notification', bakerError);
    return new Response('Baker not found', { status: 404 });
  }

  const text = await buildOrderMessage(order);
  const callbackPrefix = `ord:${order.id}:`;

  const targetChatId = baker.telegram_id ?? OWNER_TELEGRAM_ID;

  if (!targetChatId) {
    return new Response('No telegram chat_id configured for baker', { status: 500 });
  }

  const replyMarkup = {
    inline_keyboard: [
      [
        { text: 'Confirm', callback_data: `${callbackPrefix}confirmed` },
        { text: 'Decline', callback_data: `${callbackPrefix}cancelled` },
      ],
    ],
  };

  if (order.reference_photo_url) {
    await callTelegram('sendPhoto', {
      chat_id: targetChatId,
      parse_mode: 'HTML',
      photo: order.reference_photo_url,
      caption: text,
      reply_markup: replyMarkup,
    });
  } else {
    await callTelegram('sendMessage', {
      chat_id: targetChatId,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      text,
      reply_markup: replyMarkup,
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function parseCallbackData(data: string): { orderId: string; status: OrderStatus } | null {
  const match = data.match(/^ord:([0-9a-f-]{36}):(confirmed|cancelled)$/i);

  if (!match) {
    return null;
  }

  return {
    orderId: match[1],
    status: match[2].toLowerCase() as OrderStatus,
  };
}

async function handleTelegramCallback(payload: TelegramCallbackPayload): Promise<Response> {
  if (!supabase) {
    return new Response('Supabase client is not configured', { status: 500 });
  }

  const query = payload.callback_query;

  if (!query?.data || !query.message) {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const parsed = parseCallbackData(query.data);

  if (!parsed) {
    await callTelegram('answerCallbackQuery', {
      callback_query_id: query.id,
      text: 'Неизвестное действие',
      show_alert: false,
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { orderId, status } = parsed;
  const callbackUserId = query.from?.id;

  if (typeof callbackUserId !== 'number') {
    await callTelegram('answerCallbackQuery', {
      callback_query_id: query.id,
      text: 'Unknown callback user',
      show_alert: true,
    });

    return new Response(JSON.stringify({ ok: false }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: orderForCheck, error: orderCheckError } = await supabase
    .from('orders')
    .select('id, baker_id')
    .eq('id', orderId)
    .maybeSingle<{ id: string; baker_id: string }>();

  if (orderCheckError || !orderForCheck) {
    await callTelegram('answerCallbackQuery', {
      callback_query_id: query.id,
      text: 'Order not found',
      show_alert: true,
    });

    return new Response(JSON.stringify({ ok: false }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: bakerForCheck, error: bakerCheckError } = await supabase
    .from('bakers')
    .select('telegram_id')
    .eq('id', orderForCheck.baker_id)
    .maybeSingle<{ telegram_id: string | number }>();

  const allowedTelegramId = Number(bakerForCheck?.telegram_id ?? OWNER_TELEGRAM_ID);

  if (bakerCheckError || !Number.isFinite(allowedTelegramId) || callbackUserId !== allowedTelegramId) {
    await callTelegram('answerCallbackQuery', {
      callback_query_id: query.id,
      text: 'You are not allowed to update this order',
      show_alert: true,
    });

    return new Response(JSON.stringify({ ok: false }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: updatedOrder, error: updateError } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .select('*')
    .maybeSingle<OrderRow>();

  if (updateError || !updatedOrder) {
    console.error('Unable to update order status from telegram callback', updateError);

    await callTelegram('answerCallbackQuery', {
      callback_query_id: query.id,
      text: 'Не удалось обновить статус',
      show_alert: true,
    });

    return new Response(JSON.stringify({ ok: false }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const updatedText = await buildOrderMessage(updatedOrder);

  await Promise.all([
    callTelegram('answerCallbackQuery', {
      callback_query_id: query.id,
      text: `Статус обновлён: ${buildStatusLine(status)}`,
      show_alert: false,
    }),
    callTelegram('editMessageText', {
      chat_id: query.message.chat.id,
      message_id: query.message.message_id,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      text: updatedText,
      reply_markup: {
        inline_keyboard: [],
      },
    }),
  ]);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function isAuthorizedRequest(req: Request, type: 'db' | 'telegram'): boolean {
  if (type === 'db') {
    if (!ORDER_WEBHOOK_SECRET) {
      return true;
    }

    return req.headers.get('x-order-webhook-secret') === ORDER_WEBHOOK_SECRET;
  }

  if (!TELEGRAM_WEBHOOK_SECRET) {
    return true;
  }

  return req.headers.get('x-telegram-bot-api-secret-token') === TELEGRAM_WEBHOOK_SECRET;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('ok', { status: 200 });
  }

  let payload: unknown;

  try {
    payload = await req.json();
  } catch (error) {
    console.error('Invalid JSON payload', error);
    return new Response('Invalid JSON', { status: 400 });
  }

  if (isTelegramCallback(payload)) {
    if (!isAuthorizedRequest(req, 'telegram')) {
      return new Response('Unauthorized telegram webhook', { status: 401 });
    }

    return handleTelegramCallback(payload);
  }

  const order = parseOrderWebhook(payload);

  if (!order) {
    return new Response(JSON.stringify({ ok: true, ignored: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!isAuthorizedRequest(req, 'db')) {
    return new Response('Unauthorized order webhook', { status: 401 });
  }

  return handleOrderInsertWebhook(order);
});
