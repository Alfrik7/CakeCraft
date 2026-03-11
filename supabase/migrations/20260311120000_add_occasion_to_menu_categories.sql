-- Allow 'occasion' as a category in menu_items
-- This lets bakers manage their own occasion cards from the admin panel

alter table public.menu_items
  drop constraint if exists menu_items_category_check;

alter table public.menu_items
  add constraint menu_items_category_check
  check (category in ('shape', 'filling', 'coating', 'decor', 'occasion'));
