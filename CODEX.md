# CakeCraft — Agent Instructions

## Проект
CakeCraft — Telegram Mini App / веб-приложение, интерактивное меню-конструктор для кондитеров.
Кондитер скидывает клиенту ссылку → клиент собирает торт по карточкам с фото → заказ приходит кондитеру в Telegram.

## Стек
- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS
- **Backend/DB:** Supabase (PostgreSQL + Auth + Storage + Edge Functions + Realtime)
- **Bot:** Telegram Bot API (через Supabase Edge Functions или отдельный сервер)
- **Хостинг:** Vercel или Cloudflare Pages
- **Тестирование:** Vitest (юниты) + Playwright (E2E)

## Архитектурные принципы
1. **Один деплой — много кондитеров.** Каждый кондитер получает slug. URL: `/{slug}`. Данные подгружаются по slug из Supabase.
2. **Mobile-first.** Основные пользователи — на телефонах. Разрабатываем сначала под 360-428px.
3. **Минимум зависимостей.** Не добавлять библиотеки без необходимости. Tailwind покрывает стилизацию. React Router — роутинг. Supabase JS — бэкенд.
4. **RLS (Row Level Security) в Supabase.** Всё защищено на уровне базы. Клиент может только читать активные позиции меню и создавать заказы.

## Структура папок
```
src/
├── components/     # Переиспользуемые компоненты (MenuCard, PriceBar, ProgressBar...)
├── pages/          # Страницы (Constructor, Admin, NotFound)
├── steps/          # Шаги конструктора (StepOccasion, StepShape, StepFilling...)
├── admin/          # Компоненты админки (MenuEditor, OrderList, Profile)
├── lib/            # Утилиты (supabase.ts, api.ts, price.ts)
├── types/          # TypeScript типы (baker.ts, menu.ts, order.ts)
├── hooks/          # Кастомные хуки (useBaker, useMenuItems, useOrders)
├── context/        # React контексты (OrderContext, AuthContext)
└── assets/         # Статика
```

## Рабочий процесс агента
1. Прочитай `tasks.json` и найди самую приоритетную незаблокированную задачу (status: "pending", все dependencies имеют status: "done").
2. Установи статус задачи в "in_progress".
3. Реализуй задачу, следуя acceptance_criteria.
4. Запусти тесты (`npm test`, `npm run lint`).
5. Закоммить изменения с сообщением: `feat(task-{id}): {title}`.
6. Обнови статус задачи в "done" в tasks.json.
7. APPEND результаты в progress.txt (НЕ перезаписывай файл!).
8. Перейди к следующей задаче.

## Важные правила
- **НЕ** устанавливай пакеты без явной необходимости из описания задачи
- **НЕ** меняй структуру папок без причины
- **НЕ** пропускай acceptance_criteria
- Все цены в рублях (₽), формат: `1 200 ₽`
- Все тексты интерфейса на русском языке
- Комментарии в коде на английском
- SQL миграции складывай в `/supabase/migrations/` с таймстампом: `YYYYMMDDHHMMSS_description.sql`
