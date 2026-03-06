create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  baker_id uuid not null references public.bakers(id) on delete cascade,
  client_name text not null,
  client_contact text not null,
  client_contact_type text not null default 'telegram' check (client_contact_type in ('telegram', 'whatsapp', 'phone')),
  occasion text,
  shape text,
  servings integer,
  filling_id uuid references public.menu_items(id) on delete set null,
  coating_id uuid references public.menu_items(id) on delete set null,
  color text,
  decor_items uuid[] not null default '{}'::uuid[],
  topper_text text,
  reference_photo_url text,
  delivery_type text not null default 'pickup' check (delivery_type in ('pickup', 'delivery')),
  address text,
  order_date date not null,
  order_time text,
  comment text,
  total_price numeric not null,
  status text not null default 'new' check (status in ('new', 'confirmed', 'in_progress', 'done', 'cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists orders_baker_status_idx
on public.orders (baker_id, status);

create index if not exists orders_baker_order_date_idx
on public.orders (baker_id, order_date);

alter table public.orders enable row level security;
alter table public.orders force row level security;

grant select, insert on public.orders to anon;
grant select, insert, update, delete on public.orders to authenticated;

drop policy if exists "Public can create orders" on public.orders;
create policy "Public can create orders"
on public.orders
for insert
to anon, authenticated
with check (true);

drop policy if exists "Owner can read own orders" on public.orders;
create policy "Owner can read own orders"
on public.orders
for select
to authenticated
using (
  exists (
    select 1
    from public.bakers
    where bakers.id = orders.baker_id
      and bakers.telegram_id = nullif(auth.jwt() ->> 'telegram_id', '')::bigint
  )
);

drop policy if exists "Owner can manage own orders" on public.orders;
create policy "Owner can manage own orders"
on public.orders
for update
to authenticated
using (
  exists (
    select 1
    from public.bakers
    where bakers.id = orders.baker_id
      and bakers.telegram_id = nullif(auth.jwt() ->> 'telegram_id', '')::bigint
  )
)
with check (
  exists (
    select 1
    from public.bakers
    where bakers.id = orders.baker_id
      and bakers.telegram_id = nullif(auth.jwt() ->> 'telegram_id', '')::bigint
  )
);
