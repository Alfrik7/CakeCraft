alter table public.bakers
add column if not exists telegram_chat_id bigint;
