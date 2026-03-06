create table if not exists public.blocked_dates (
  id uuid primary key default gen_random_uuid(),
  baker_id uuid not null references public.bakers(id) on delete cascade,
  date date not null,
  reason text,
  unique (baker_id, date)
);

alter table public.blocked_dates enable row level security;
alter table public.blocked_dates force row level security;

grant select on public.blocked_dates to anon;
grant select, insert, update, delete on public.blocked_dates to authenticated;

drop policy if exists "Public can read blocked dates" on public.blocked_dates;
create policy "Public can read blocked dates"
on public.blocked_dates
for select
to anon, authenticated
using (true);

drop policy if exists "Owner can manage own blocked dates" on public.blocked_dates;
create policy "Owner can manage own blocked dates"
on public.blocked_dates
for all
to authenticated
using (
  exists (
    select 1
    from public.bakers
    where bakers.id = blocked_dates.baker_id
      and bakers.telegram_id = nullif(auth.jwt() ->> 'telegram_id', '')::bigint
  )
)
with check (
  exists (
    select 1
    from public.bakers
    where bakers.id = blocked_dates.baker_id
      and bakers.telegram_id = nullif(auth.jwt() ->> 'telegram_id', '')::bigint
  )
);
