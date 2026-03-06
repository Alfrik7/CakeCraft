alter table public.bakers
add column if not exists theme text not null default 'pink';

alter table public.bakers
drop constraint if exists bakers_theme_check;

alter table public.bakers
add constraint bakers_theme_check
check (theme in ('pink', 'chocolate', 'minimal', 'lavender', 'mint'));
