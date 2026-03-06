-- Seed data for CakeCraft demo baker and menu.
-- Idempotent: safe to run multiple times.

with upsert_baker as (
  insert into public.bakers (
    telegram_id,
    name,
    slug,
    logo_url,
    email,
    welcome_message,
    min_order_days,
    delivery_enabled,
    delivery_price,
    working_hours
  )
  values (
    612190238,
    'Демо Кондитерская CakeCraft',
    'demo-baker',
    'https://picsum.photos/seed/cakecraft-logo/400/400',
    'demo@cakecraft.app',
    'Привет! Соберите свой торт, а я приготовлю его с любовью 🎂',
    2,
    true,
    500,
    '{
      "monday": {"from": "10:00", "to": "19:00"},
      "tuesday": {"from": "10:00", "to": "19:00"},
      "wednesday": {"from": "10:00", "to": "19:00"},
      "thursday": {"from": "10:00", "to": "19:00"},
      "friday": {"from": "10:00", "to": "20:00"},
      "saturday": {"from": "11:00", "to": "18:00"},
      "sunday": {"from": "11:00", "to": "17:00"}
    }'::jsonb
  )
  on conflict (slug)
  do update set
    telegram_id = excluded.telegram_id,
    name = excluded.name,
    logo_url = excluded.logo_url,
    email = excluded.email,
    welcome_message = excluded.welcome_message,
    min_order_days = excluded.min_order_days,
    delivery_enabled = excluded.delivery_enabled,
    delivery_price = excluded.delivery_price,
    working_hours = excluded.working_hours,
    updated_at = now()
  returning id
),
resolved_baker as (
  select id from upsert_baker
  union all
  select b.id
  from public.bakers b
  where b.slug = 'demo-baker'
  limit 1
),
clear_menu as (
  delete from public.menu_items
  where baker_id = (select id from resolved_baker)
)
insert into public.menu_items (
  baker_id,
  category,
  name,
  description,
  photo_url,
  price,
  price_type,
  is_active,
  sort_order,
  tags
)
select
  (select id from resolved_baker),
  seed.category,
  seed.name,
  seed.description,
  seed.photo_url,
  seed.price,
  seed.price_type,
  true,
  seed.sort_order,
  seed.tags
from (
  values
    -- Shapes (3)
    (
      'shape'::text,
      'Круг',
      'Классическая круглая форма для любого повода.',
      'https://picsum.photos/seed/shape-round/900/700',
      600::numeric,
      'fixed'::text,
      0,
      '{}'::text[]
    ),
    (
      'shape'::text,
      'Квадрат',
      'Аккуратная квадратная форма для строгой подачи.',
      'https://picsum.photos/seed/shape-square/900/700',
      700::numeric,
      'fixed'::text,
      1,
      '{}'::text[]
    ),
    (
      'shape'::text,
      'Сердце',
      'Романтичная форма для особенных случаев.',
      'https://picsum.photos/seed/shape-heart/900/700',
      900::numeric,
      'fixed'::text,
      2,
      '{"Хит"}'::text[]
    ),

    -- Fillings (5)
    (
      'filling'::text,
      'Шоколад-вишня',
      'Насыщенный шоколадный бисквит с вишнёвой прослойкой.',
      'https://picsum.photos/seed/filling-choco-cherry/900/700',
      1400::numeric,
      'per_kg'::text,
      0,
      '{"Хит"}'::text[]
    ),
    (
      'filling'::text,
      'Морковный с крем-чиз',
      'Пряный морковный бисквит с нежным крем-чизом.',
      'https://picsum.photos/seed/filling-carrot/900/700',
      1300::numeric,
      'per_kg'::text,
      1,
      '{"Новинка"}'::text[]
    ),
    (
      'filling'::text,
      'Медовик',
      'Тонкие медовые коржи и сметанный крем.',
      'https://picsum.photos/seed/filling-medovik/900/700',
      1200::numeric,
      'per_kg'::text,
      2,
      '{}'::text[]
    ),
    (
      'filling'::text,
      'Красный бархат',
      'Нежные коржи red velvet и сливочный крем.',
      'https://picsum.photos/seed/filling-redvelvet/900/700',
      1500::numeric,
      'per_kg'::text,
      3,
      '{"Сезонное"}'::text[]
    ),
    (
      'filling'::text,
      'Чизкейк Нью-Йорк',
      'Плотная сливочная текстура и ванильный аромат.',
      'https://picsum.photos/seed/filling-cheesecake/900/700',
      1600::numeric,
      'per_kg'::text,
      4,
      '{"Хит"}'::text[]
    ),

    -- Coatings (4)
    (
      'coating'::text,
      'Крем',
      'Классическое кремовое покрытие.',
      'https://picsum.photos/seed/coating-cream/900/700',
      350::numeric,
      'fixed'::text,
      0,
      '{}'::text[]
    ),
    (
      'coating'::text,
      'Мастика',
      'Гладкое покрытие для сложного декора.',
      'https://picsum.photos/seed/coating-mastic/900/700',
      700::numeric,
      'fixed'::text,
      1,
      '{}'::text[]
    ),
    (
      'coating'::text,
      'Велюр',
      'Бархатистая текстура с премиальной подачей.',
      'https://picsum.photos/seed/coating-velour/900/700',
      900::numeric,
      'fixed'::text,
      2,
      '{"Новинка"}'::text[]
    ),
    (
      'coating'::text,
      'Без покрытия',
      'Минималистичный вариант без внешнего слоя.',
      'https://picsum.photos/seed/coating-none/900/700',
      200::numeric,
      'fixed'::text,
      3,
      '{}'::text[]
    ),

    -- Decor (6)
    (
      'decor'::text,
      'Ягоды',
      'Свежие сезонные ягоды.',
      'https://picsum.photos/seed/decor-berries/900/700',
      400::numeric,
      'fixed'::text,
      0,
      '{"Хит"}'::text[]
    ),
    (
      'decor'::text,
      'Цветы',
      'Живые или сахарные цветы по сезону.',
      'https://picsum.photos/seed/decor-flowers/900/700',
      800::numeric,
      'fixed'::text,
      1,
      '{"Сезонное"}'::text[]
    ),
    (
      'decor'::text,
      'Шоколадный декор',
      'Плитки, стружка и фигурные элементы из шоколада.',
      'https://picsum.photos/seed/decor-chocolate/900/700',
      500::numeric,
      'fixed'::text,
      2,
      '{}'::text[]
    ),
    (
      'decor'::text,
      'Топпер',
      'Акриловый или бумажный топпер на торт.',
      'https://picsum.photos/seed/decor-topper/900/700',
      300::numeric,
      'fixed'::text,
      3,
      '{"Хит"}'::text[]
    ),
    (
      'decor'::text,
      'Фигурки из мастики',
      'Ручная лепка по вашему сюжету.',
      'https://picsum.photos/seed/decor-figures/900/700',
      1200::numeric,
      'fixed'::text,
      4,
      '{}'::text[]
    ),
    (
      'decor'::text,
      'Macaron',
      'Яркие миндальные пирожные в декоре торта.',
      'https://picsum.photos/seed/decor-macaron/900/700',
      650::numeric,
      'fixed'::text,
      5,
      '{"Новинка"}'::text[]
    )
) as seed(category, name, description, photo_url, price, price_type, sort_order, tags);
