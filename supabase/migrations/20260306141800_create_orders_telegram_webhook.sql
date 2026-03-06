create extension if not exists pg_net;

create or replace function public.notify_order_created_to_telegram()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  request_headers jsonb := jsonb_build_object('Content-Type', 'application/json');
  webhook_secret text := nullif(current_setting('app.settings.order_webhook_secret', true), '');
  supabase_url text := nullif(current_setting('app.settings.supabase_url', true), '');
  webhook_url text := coalesce(
    nullif(current_setting('app.settings.order_webhook_url', true), ''),
    case
      when supabase_url is not null then supabase_url || '/functions/v1/order-telegram-webhook'
      else null
    end
  );
  request_body jsonb := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', to_jsonb(new)
  );
begin
  if webhook_url is null then
    raise warning 'order webhook url is not configured, skipping telegram notification for order %', new.id;
    return new;
  end if;

  if webhook_secret is not null then
    request_headers := request_headers || jsonb_build_object('x-order-webhook-secret', webhook_secret);
  end if;

  perform net.http_post(
    url := webhook_url,
    headers := request_headers,
    body := request_body
  );

  return new;
end;
$$;

drop trigger if exists orders_notify_telegram_webhook on public.orders;
create trigger orders_notify_telegram_webhook
after insert on public.orders
for each row
execute function public.notify_order_created_to_telegram();
