alter table public.orders
drop column if exists coating_id,
drop column if exists color,
drop column if exists topper_text;

alter table public.bakers
drop column if exists working_hours;

delete from public.menu_items
where category = 'coating';

alter table public.menu_items
drop constraint if exists menu_items_category_check;

alter table public.menu_items
add constraint menu_items_category_check
check (category in ('shape', 'filling', 'decor'));
