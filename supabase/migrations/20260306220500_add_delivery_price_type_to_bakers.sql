alter table public.bakers
add column if not exists delivery_price_type text not null default 'fixed'
check (delivery_price_type in ('fixed', 'custom'));
