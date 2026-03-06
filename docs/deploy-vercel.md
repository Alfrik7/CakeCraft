# Деплой CakeCraft на Vercel

Этот проект деплоится через GitHub Actions (`.github/workflows/deploy-vercel.yml`) при каждом пуше в `main`.

## 1. Подключить проект к Vercel

1. Создайте проект в Vercel и подключите GitHub-репозиторий.
2. Для Framework Preset выберите `Vite`.
3. Убедитесь, что Production Domain активен (`*.vercel.app`) или подключите кастомный домен.

## 2. Настроить переменные окружения

Добавьте в Vercel (Production environment):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 3. Настроить GitHub Secrets

В репозитории GitHub добавьте Secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

После этого деплой будет идти автоматически при пуше в `main`.

## 4. Проверки после деплоя

Workflow автоматически делает проверку:

- деплой успешен и возвращён публичный URL;
- URL `/<slug>` доступен (`/demo-baker`);
- SPA-роутинг работает (rewrite на `index.html`, см. `vercel.json`).

## 5. SSL и домен

- Для `*.vercel.app` SSL включён автоматически.
- Для кастомного домена SSL выдаётся Vercel после привязки DNS.

## Локальная валидация перед пушем

```bash
npm run lint
npm test
npm run build
```
