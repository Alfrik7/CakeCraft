create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.bakers (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint not null unique,
  name text not null,
  slug text not null unique,
  logo_url text,
  email text,
  welcome_message text not null default 'Добро пожаловать! Соберите свой торт 🎂',
  min_order_days integer not null default 3,
  delivery_enabled boolean not null default false,
  delivery_price numeric not null default 0,
  working_hours jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bakers enable row level security;
alter table public.bakers force row level security;

drop trigger if exists set_bakers_updated_at on public.bakers;
create trigger set_bakers_updated_at
before update on public.bakers
for each row
execute function public.set_updated_at();

grant select on public.bakers to anon;
grant select, insert, update, delete on public.bakers to authenticated;

drop policy if exists "Public can read bakers" on public.bakers;
create policy "Public can read bakers"
on public.bakers
for select
to anon, authenticated
using (slug is not null);

drop policy if exists "Owner can manage own baker" on public.bakers;
create policy "Owner can manage own baker"
on public.bakers
for all
to authenticated
using (telegram_id = nullif(auth.jwt() ->> 'telegram_id', '')::bigint)
with check (telegram_id = nullif(auth.jwt() ->> 'telegram_id', '')::bigint);
