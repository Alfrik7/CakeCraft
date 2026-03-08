# Telegram Bot Setup For Orders

This project uses `supabase/functions/order-telegram-webhook` and a DB trigger on `orders` `INSERT`.

## 1) Ensure baker Telegram ID

`supabase/seed.sql` now sets demo baker Telegram ID to `612190238`.

If needed for an existing baker:

```sql
update public.bakers
set telegram_id = 612190238
where slug = 'demo-baker';
```

## 2) Set Supabase function secrets

Run from project root:

```bash
supabase secrets set \
  TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN \
  ORDER_WEBHOOK_SECRET=change-me-db-webhook-secret \
  TELEGRAM_WEBHOOK_SECRET=change-me-telegram-webhook-secret
```

For this task, `YOUR_BOT_TOKEN` should be set to the provided bot token.

## 3) Configure DB settings for trigger function

```sql
alter database postgres set app.settings.supabase_url = 'https://YOUR_PROJECT_REF.supabase.co';
alter database postgres set app.settings.order_webhook_url = 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/order-telegram-webhook';
alter database postgres set app.settings.order_webhook_secret = 'change-me-db-webhook-secret';
```

Reconnect sessions after changing DB settings.

## 4) Deploy edge function

```bash
supabase functions deploy order-telegram-webhook --no-verify-jwt
```

## 5) Configure Telegram webhook for callbacks

```bash
curl -X POST "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url":"https://YOUR_PROJECT_REF.supabase.co/functions/v1/order-telegram-webhook",
    "secret_token":"change-me-telegram-webhook-secret"
  }'
```

## 6) Connect baker chat via /start deep link

Use deep link from admin profile:

`https://t.me/photodep_bot?start=<BAKER_ID>`

After pressing `Start`, bot should reply:

`Уведомления подключены! Новые заказы будут приходить сюда 🎂`

and `public.bakers.telegram_chat_id` must be updated.

## 7) Smoke test

1. Insert a new row into `public.orders`.
2. Verify Telegram receives formatted order message with `Confirm` and `Decline`.
3. Press a button and verify `public.orders.status` changes to `confirmed` or `cancelled`.
