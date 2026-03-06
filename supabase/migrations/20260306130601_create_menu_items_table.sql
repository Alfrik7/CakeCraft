create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  baker_id uuid not null references public.bakers(id) on delete cascade,
  category text not null check (category in ('shape', 'filling', 'coating', 'decor')),
  name text not null,
  description text,
  photo_url text,
  price numeric not null default 0,
  price_type text not null default 'fixed' check (price_type in ('fixed', 'per_kg')),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  tags text[] not null default '{}'::text[],
  created_at timestamptz not null default now()
);

create index if not exists menu_items_baker_category_sort_order_idx
on public.menu_items (baker_id, category, sort_order);

alter table public.menu_items enable row level security;
alter table public.menu_items force row level security;

grant select on public.menu_items to anon;
grant select, insert, update, delete on public.menu_items to authenticated;

drop policy if exists "Public can read active menu items" on public.menu_items;
create policy "Public can read active menu items"
on public.menu_items
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Owner can manage own menu items" on public.menu_items;
create policy "Owner can manage own menu items"
on public.menu_items
for all
to authenticated
using (
  exists (
    select 1
    from public.bakers
    where bakers.id = menu_items.baker_id
      and bakers.telegram_id = nullif(auth.jwt() ->> 'telegram_id', '')::bigint
  )
)
with check (
  exists (
    select 1
    from public.bakers
    where bakers.id = menu_items.baker_id
      and bakers.telegram_id = nullif(auth.jwt() ->> 'telegram_id', '')::bigint
  )
);
