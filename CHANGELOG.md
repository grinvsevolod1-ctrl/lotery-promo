# CHANGELOG

## Логотип с монетами и футер в четыре блока — 06.10.2026

- Логотип переработан: буквы «о» в «bytoloto» заменены на детализированные золотые монеты (аверс — звезда, реверс — счастливая «7», гурт с насечкой), которые поочерёдно вращаются в 3D. Компоненты: `components/brand-coin.tsx`, `components/brand-logo.tsx`; анимация отключается при `prefers-reduced-motion`.
- Фавиконка (`app/icon.svg`), иконки PWA, `apple-icon.png` и OG-картинка перерисованы под новый знак.
- Футер: четыре равных блока — бренд и способы оплаты, разделы, документы, поддержка; нижняя полоса с 18+ и копирайтом. Плавающая кнопка регистрации прячется, когда футер в зоне видимости.
- Исправлена вложенная ссылка в шапке кабинета (логотип рендерился ссылкой внутри ссылки).

## Перевод на VPS, регистрация через e-mail, удаление админки — 03.10.2026

### Деплой на VPS

- `pnpm-workspace.yaml`: исправлен сломанный `allowBuilds` (стояла строка-заглушка, из-за которой `pnpm install` падал с `ERR_PNPM_IGNORED_BUILDS`).
- `lib/auth.ts`: `baseURL` и доверенные origin'ы берутся из `BETTER_AUTH_URL` / `NEXT_PUBLIC_SITE_URL` / `TRUSTED_ORIGINS` вместо переменных Vercel (`VERCEL_URL` и т.п.).
- Убраны `@vercel/analytics` и неиспользуемый `lucide-react`; из метаданных убран `generator: v0.app`.
- Добавлены `.env.example`, `ecosystem.config.cjs` (PM2) и скрипт `pnpm release` (install → migrate → build).
- Миграции Drizzle закоммичены в `lib/db/migrations` (`pnpm db:migrate` применяет их на VPS).
- `next.config.mjs`: `poweredByHeader: false`; из HSTS убран `includeSubDomains`, чтобы не ломать поддомены без HTTPS.
- `.gitignore`: игнорируются `.env` и все `.env.*`, кроме `.env.example`.

### Регистрация и вход

- Регистрация требует подтверждения e-mail: письмо со ссылкой (Better Auth `requireEmailVerification`), после перехода — автоматический вход и редирект в кабинет. При попытке входа с неподтверждённым адресом письмо отправляется повторно.
- Восстановление пароля: `/forgot-password` → письмо → `/reset-password?token=…`; после смены пароля старые сессии отзываются.
- Письма уходят через SMTP (`nodemailer`, переменные `SMTP_*`, `MAIL_FROM`). В development без SMTP письмо печатается в лог сервера.
- Новые страницы: `/verify-email`, `/forgot-password`, `/reset-password`; общий каркас форм — `components/auth-shell.tsx`.

### Кабинет

- Удалены админка (`/admin`), роль `admin` в схеме и auth, серверные действия администратора.
- Билеты разыгрываются автоматически при наступлении времени тиража (`settleDueTickets`): выпавшая комбинация сохраняется в `ticket.winningNumbers`, приз начисляется по числу совпадений (3 → 2, 4 → 10, 5 → 100, 6 → 1000 BYN).
- Внешние ключи `ticket.userId`/`transaction.userId` → `user.id` с каскадным удалением, индексы по `userId`.

### Производительность и чистка

- Промо-изображения конвертированы из PNG (6,8 МБ) в WebP (0,4 МБ), добавлены `width`/`height`, `loading="lazy"` для картинок ниже первого экрана.
- Удалены дубли `public/icon.svg`, `public/apple-icon.png` и неиспользуемые `public/icon-*-32x32.png`.
- Из `<html>` убран бессмысленный класс `light` (тема только тёмная).

### Как проверено

- `pnpm install --frozen-lockfile`, `pnpm exec tsc --noEmit`, `pnpm build` — без ошибок.
- Во временной PostgreSQL пройдены: миграция, регистрация → письмо → подтверждение → авто-вход → бонус → покупка билета → авто-розыгрыш (выигрыш и проигрыш) → выход; сброс пароля с проверкой старого/нового пароля.

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

- `DATABASE_URL`, `BETTER_AUTH_SECRET` и `BETTER_AUTH_URL` не заданы в окружении (по решению пользователя). Без них авторизация и кабинет не работают в рантайме. Переменные задаются в `.env` на VPS — см. `.env.example` (запись от 03.10.2026).
