# CHANGELOG

## Аудит и доведение до идеала — 26.09.2026

### Безопасность

- **Транзакции в денежных операциях** (`app/actions/cabinet.ts`, `app/actions/admin.ts`)
  - Покупка билета, начисление welcome-бонуса и разрешение выигрыша (`resolveTicket`) обёрнуты в `db.transaction`, чтобы списание баланса и создание записей происходили атомарно.
  - Как проверено: `pnpm exec tsc --noEmit` без ошибок; `pnpm build` — успешная сборка.
- **Серверная валидация ввода** (`app/actions/cabinet.ts`)
  - Проверка суммы/количества: положительные целые значения, ограничение по максимуму, пересчёт стоимости на сервере, повторная проверка баланса внутри транзакции.
- **Защита от повторного начисления welcome-бонуса**
  - Бонус выдаётся один раз через проверку внутри транзакции.
- **HTTP-заголовки безопасности** (`next.config.mjs`)
  - Добавлены `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security`, `X-Frame-Options: SAMEORIGIN`, `Permissions-Policy` (camera/microphone/geolocation отключены).
  - Как проверено: `pnpm build` применил `next.config.mjs` без ошибок.

### База данных

- **Уникальный индекс** на связке пользователь/тираж в `lib/db/schema.ts`, чтобы исключить дубли.
- **Инструментарий Drizzle**: добавлен `drizzle.config.ts` и скрипты `db:generate`, `db:migrate`, `db:push` в `package.json`; установлен `drizzle-kit` (dev).

### SEO и метаданные

- **`app/layout.tsx`**: добавлены `metadataBase`, Open Graph, Twitter card, `keywords`, `canonical`, `applicationName`, локаль `ru_RU`.
- **Иконки приложения**: `app/icon.svg` и `app/apple-icon.png` для автогенерации favicon/apple-touch.

### Чистка

- Удалены неиспользуемые файлы из `public/`: `emblem.png`, `hero-lottery.png`, `placeholder-logo.png/.svg`, `placeholder-user.jpg`, `placeholder.jpg/.svg`.
- Приведены в порядок вспомогательные классы в `app/globals.css`.

### Известные ограничения

- `DATABASE_URL`, `BETTER_AUTH_SECRET` и `BETTER_AUTH_URL` не заданы в окружении (по решению пользователя). Без них авторизация, кабинет и админка не работают в рантайме. Код готов — нужно лишь добавить переменные окружения.
