# bytoloto.com — паспорт проекта

Обновлять при каждом заметном изменении. Цель: открыть новый чат, дать ссылку на этот файл и сразу продолжить работу.

Доступ к серверу (SSH) — в [`docs/ACCESS.md`](./ACCESS.md).

## 1. Что это

Промо-сайт лотереи (бренд BY TO!LOTO, домен **bytoloto.com**) с личным кабинетом: регистрация, игровой баланс, билеты, колесо удачи, рефералы, привязка карт с подтверждением через Telegram-админа, поддержка через форму.

## 2. Стек

| Слой | Решение | Почему |
| --- | --- | --- |
| Фреймворк | Next.js 16 (App Router, Turbopack), React 19, TypeScript | Серверные компоненты + server actions, без отдельного API |
| UI | Tailwind CSS v4, свои компоненты, `components/ui` (button/input/label) | Лёгкий бандл, стиль под бренд |
| БД | PostgreSQL 16 на своём VPS, Drizzle ORM, миграции в `lib/db/migrations` | Всё локально на сервере, без облачных БД |
| Авторизация | Better Auth (email + пароль, подтверждение почты) | Сессии и хеши паролей из коробки |
| Почта | SMTP Google Workspace (`support@bytoloto.com`), nodemailer, шаблоны в `lib/email.ts` | Свой ящик, без сторонних сервисов |
| Админ-уведомления | Telegram-бот (`lib/telegram.ts`, вебхук `app/api/telegram/webhook`) | Админ подтверждает карты/заявки кнопками в ТГ |
| Аналитика | Umami (самохостинг, тот же Postgres) | Без cookies-баннеров |
| Деплой | Docker Compose + Caddy (HTTPS) на VPS `31.77.189.137`, каталог `/opt/bytoloto` | Полный контроль, один сервер |

## 3. Деплой

```bash
# локально: ветка v0/fix-review-tests -> merge в master -> push
ssh -i ~/.ssh/bytoloto_tmp root@31.77.189.137
cd /opt/bytoloto && git pull --ff-only
export DEPLOYMENT_VERSION=$(git rev-parse --short HEAD)
docker compose build migrate app      # migrate ОБЯЗАТЕЛЬНО, иначе новые миграции не применятся
docker compose run --rm migrate         # применяет миграции lib/db/migrations
docker compose up -d
docker compose logs app --since 2m
```

Сервисы compose: `app`, `db` (Postgres), `migrate` (одноразовый), `caddy`, `backup`. Проверка таблицы:
`docker compose exec -T db sh -c 'psql -U $POSTGRES_USER -d $POSTGRES_DB -c "\dt"'`

- `.env` на сервере: `/opt/bytoloto/.env` (бэкапы `.env.bak.*`). Шаблон — `deploy/env.production.example`.
- `NEXT_PUBLIC_*` вшиваются при сборке → после их изменения нужен `docker compose build app`.
- Миграции применяет сервис `migrate` (`pnpm db:migrate`); `deploy/deploy.sh` делает это сам, при ручном деплое — см. команды выше.
- Бэкап БД: `deploy/backup.sh` в контейнере `backup` — дамп раз в сутки в `/opt/bytoloto/backups`, хранится 14 дней. Первый дамп через 10 минут после старта (`BACKUP_INITIAL_DELAY`), чтобы приложение успело накатить миграции.
- Тестовый аккаунт на проде: `aloev5267@gmail.com` (пароль у владельца). Ручная проверка — через agent-browser; Playwright в песочнице v0 не стартует (нет системных библиотек Chromium), запускать локально или в CI.

### Переменные окружения (сервер)

Заполнены: `DATABASE_URL`/`POSTGRES_*`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `ADMIN_SECRET`, `CRON_SECRET`, `UMAMI_APP_SECRET`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `SMTP_HOST/PORT/SECURE/USER/PASS`, `MAIL_FROM`, `REQUIRE_EMAIL_VERIFICATION=true`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPPORT_EMAIL`.

Удалены по решению владельца: Turnstile, Resend, телефон, УНП/юрлицо, ссылки на Telegram/VK-группы.

## 4. Продуктовые решения (не откатывать без запроса)

- Логотип везде один — `components/brand-logo.tsx` (как на главной). Старый «кружок + lotery.by» удалён.
- Кабинет и игры разделены: `/cabinet` — обзор аккаунта, `/play` — игры, `/cabinet/wins`, `/cabinet/cards`, `/cabinet/profile`, `/cabinet/support`.
- Навигация кабинета — нижний док (`components/account/bottom-dock.tsx`): 4 вкладки + центральная кнопка (4 точки → крестик), открывает панель «Быстрые действия» 3×2. Без восклицательных знаков и веера.
- Анимации в духе Apple: только `transform`/`opacity`, easing `cubic-bezier(0.32,0.72,0,1)`, без анимаций, сдвигающих layout при скролле.
- Карта: имя держателя автоматически транслитерируется в латиницу (`lib/translit.ts`); кнопка — «Сохранить»; после сохранения показывается превью «Ожидайте перенаправления на страницу подтверждения вашей карты». Логика подтверждения (админ в ТГ → код/доп. вопрос) не менялась.
- Поддержка: форма → запись в `support_request` → сообщение админу в ТГ → письмо пользователю «Обращение зарегистрировано».
- Письма — фирменные (логотип, оранжевый бренд), `lib/email.ts`.
- Колесо удачи — в цветах бренда (оранжевый/синий), не фиолетовое.
- Ошибки «Не удалось связаться с сервером» после деплоя: устранены через `deploymentId` в `next.config.mjs` + `components/stale-deployment-guard.tsx` (перезагрузка при устаревшей версии) + `lib/action-error.ts`.

## 5. Карта файлов

### Корень
| Файл | Назначение |
| --- | --- |
| `Dockerfile`, `docker-compose.yml`, `.dockerignore` | Сборка образа app, сервисы app/postgres/caddy/umami |
| `next.config.mjs` | standalone-сборка, `deploymentId`, заголовки безопасности |
| `instrumentation.ts` | Применение миграций при старте сервера |
| `drizzle.config.ts` | Конфиг drizzle-kit |
| `vitest.config.mts`, `playwright.config.ts` | Юнит- и e2e-тесты |
| `ecosystem.config.cjs`, `vercel.json` | Альтернативные способы запуска (не основной путь) |
| `.env.example` | Список переменных для локальной разработки |
| `AGENTS.md`, `CLAUDE.md` | Правила для ИИ-агентов (генерирует Next.js) |
| `CHANGELOG.md` | История изменений |
| `ci/github-ci.yml` | Шаблон CI (typecheck + тесты) |

### `deploy/`
| Файл | Назначение |
| --- | --- |
| `setup-server.sh` | Первичная настройка VPS (Docker, firewall, генерация секретов) |
| `deploy.sh` | Обновление: pull → build → up |
| `Caddyfile` | HTTPS-пр���кси д��я bytoloto.com и аналитики |
| `backup.sh` | Дамп Postgres |
| `env.production.example` | Шаблон серверного `.env` |
| `postgres-init/01-umami.sql` | Создание БД для Umami |

### `app/` — маршруты
| Путь | Назначение |
| --- | --- |
| `layout.tsx`, `globals.css` | Корневой layout, шрифты, токены темы, PWA, guard устаревшего деплоя |
| `page.tsx` | Главная (hero, колесо, как играть, призы, FAQ) |
| `sign-in`, `sign-up`, `forgot-password`, `reset-password`, `verify-email` | Авторизация (оболочка `components/auth-shell.tsx`) |
| `cabinet/layout.tsx` | Проверка сессии + `AccountShell` (шапка + нижний док) |
| `cabinet/page.tsx` | Обзор: баланс, бонус, пополнение, рефералы, операции |
| `cabinet/cards` | Привязка и управление картами. Отклонённая карта: алерт игроку → удаляется (`dismissRejectedCards`). Удаление через своё модальное окно, не `confirm()` |
| `cabinet/deposit` | Пополнение: сумма (пресеты 10/20/50/100 или своя, 5–1000 BYN) + подтверждённая карта → заявка в Telegram «Подтвердить/Отклонить» → при одобрении `lib/reviews.ts` зачисляет транзакцию `deposit` |
| `cabinet/wins` | История выигрышей |
| `cabinet/profile` | Имя, пароль, почта, сессии, удаление аккаунта |
| `cabinet/support` | Форма обращения в поддержку |
| `cabinet/loading.tsx` | Скелетон кабинета |
| `play/layout.tsx`, `play/page.tsx` | Проводник игр: карточки игр со статусом, без самих игр |
| `play/lottery/page.tsx` | Отдельная страница моментальной лотереи (покупка билета) |
| `play/wheel/page.tsx` | Отдельная страница ежедневного колеса удачи |
| `play/tickets/page.tsx` | История билетов и результаты |
| `pay/confirm/[token]` | Страница подтверждения карты/платежа |
| `invite/[code]/route.ts` | Реферальная ссылка → cookie → регистрация |
| `admin/*` | Админ-панель (вход по `ADMIN_SECRET`) |
| `results`, `rules`, `terms`, `privacy`, `contacts` | Публичные и юридические страницы |
| `offline`, `not-found`, `error`, `global-error` | Служебные страницы |
| `manifest.ts`, `robots.ts`, `sitemap.ts` | PWA и SEO |
| `actions/*.ts` | Server actions: `cabinet` (билеты, бонус, спин), `cards`, `funding`, `support`, `admin` |
| `api/auth/[...all]` | Better Auth |
| `api/cabinet/cards`, `api/cabinet/funding`, `api/wins` | JSON для SWR |
| `api/telegram/webhook` | Кнопки админа из Telegram |
| `api/cron/settle` | Розыгрыши по расписанию (защищено `CRON_SECRET`) |
| `api/health` | Healthcheck для Docker |

### `components/`
| Файл | Назначение |
| --- | --- |
| `account/account-shell.tsx` | Каркас кабинета (фон, отступ под док) |
| `account/account-top-bar.tsx` | Шапка кабинета с логотипом и аватаром |
| `account/bottom-dock.tsx` | Нижний док + панель быстрых действий |
| `play/game-card.tsx`, `play/back-to-games.tsx`, `play/balance-badge.tsx` | Карточка игры в проводнике, кнопка «Все игры», плашка баланса |
| `account/page-heading.tsx` | Заголовок страницы кабинета |
| `account/support-form.tsx` | Форма поддержки |
| `cabinet/payment-cards.tsx` | Карты: оркестратор (SWR-опрос, удаление с подтверждением, алерт об отклонении + авто-удаление rejected, авто-открытие модалок) |
| `cabinet/cards/card-tile.tsx` | Плитка карты, бейджи статусов, `BRAND_MATERIAL` |
| `cabinet/cards/card-binding-form.tsx` | Форма привязки с 3D-превью; после «Сохранить» — экран «Ожидайте перенаправления…» и переход на `/cabinet/cards/[id]` |
| `cabinet/cards/card-modal.tsx` | `Modal`, формы кода и доп. проверки, `CardActionModal` |
| `cabinet/cards/card-confirmation.tsx` | Страница подтверждения: шаги, ввод кода/ответа, итог (подтверждена/отклонена) |
| `cabinet/cards/card-icons.tsx` | SVG-иконки карт |
| `app/cabinet/cards/[id]/page.tsx` | Маршрут подтверждения карты; `/cabinet/cards?new=1` сразу открывает форму |
| `cabinet/card-brand-mark.tsx` | Логотипы Visa/Mastercard/Белкарт |
| `cabinet/buy-ticket-panel.tsx`, `number-picker.tsx`, `ticket-card.tsx` | Покупка и отображение билетов |
| `cabinet/daily-spin.tsx` | Ежедневное колесо в кабинете |
| `cabinet/funding-panel.tsx`, `withdraw-form.tsx` | Заявки и вывод |
| `cabinet/deposit-form.tsx` | Форма пополнения (кнопка «Пополнить» в доке ведёт на `/cabinet/deposit`) |
| `cabinet/referral-panel.tsx`, `referral-link.tsx` | Рефералы |
| `cabinet/profile-view.tsx` | Настройки профиля |
| `cabinet/transactions-list.tsx`, `welcome-bonus-card.tsx`, `panel.tsx` | Операции, бонус, базовая карточка |
| `admin/*` | Дашборд, вход, проверка рефералов |
| `brand-logo.tsx` | Единый логотип |
| `icons.tsx` | Все иконки (SVG) |
| `site-header.tsx`, `site-footer.tsx`, `header-auth-nav.tsx` | Публичная шапка/подвал |
| `hero.tsx`, `how-to-section.tsx`, `prizes-section.tsx`, `faq-section.tsx`, `terms-section.tsx`, `winners-marquee.tsx`, `live-wins-feed.tsx` | Секции главной |
| `fortune-wheel.tsx`, `wheel.tsx` | Колесо удачи (секция + SVG-колесо) |
| `auth-shell.tsx`, `auth-form.tsx`, `forgot-password-form.tsx`, `reset-password-form.tsx`, `verify-email-resend.tsx` | Авторизация |
| `pwa.tsx` | Регистрация SW и кнопка «Установить приложение» (Android prompt / инструкция iOS) |
| `reveal.tsx` | Появление при скролле (без сдвига layout) |
| `stale-deployment-guard.tsx` | Перезагрузка при устаревшей сборке |
| `legal-page.tsx` | Шаблон юр. страниц |
| `analytics.tsx`, `auto-refresh.tsx`, `confetti.tsx`, `cursor-aura.tsx`, `lotto-ball.tsx`, `share-button.tsx` | Утилитарные UI-компоненты |
| `ui/button.tsx`, `ui/input.tsx`, `ui/label.tsx` | Базовые элементы форм (широкие, высокие поля) |

### `lib/`
| Файл | Назначение |
| --- | --- |
| `db/index.ts`, `db/schema.ts`, `db/migrations/*` | Подключение и схема Postgres |
| `auth.ts`, `auth-client.ts`, `require-session.ts`, `admin-auth.ts` | Сессии пользователя и админа |
| `email.ts`, `mail-capture.ts` | Фирменные письма и SMTP |
| `telegram.ts`, `telegram-security.ts` | Отправка в ТГ и проверка вебхука |
| `deployment-guard.ts` + корневой `proxy.ts` | Репозиторий авто-деплоит чужой Vercel-проект `tolottery.vercel.app` (другой аккаунт, свой `TELEGRAM_CHAT_ID` → заявки уходили в чужой ТГ). Любой деплой с `VERCEL_PROJECT_ID` ≠ `prj_RyT6GbGxtvaAkYS6DD0HbozvUzOz` (или `ALLOWED_VERCEL_PROJECT_ID`) делает 308 на `https://bytoloto.com` и не шлёт ничего в Telegram. Сервер (без `VERCEL_*`) не затронут. Сам проект `tolottery` удалить можно только из того аккаунта Vercel. |
| `payment-cards.ts`, `funding.ts`, `lottery.ts`, `draws.ts`, `random.ts`, `referrals.ts` | Доменная логика |
| `reviews.ts`, `review-*.ts` | Статусы проверки карт/заявок админом |
| `rate-limit.ts` | Лимиты запросов (в Postgres) |
| `translit.ts` | Кириллица → латиница для имени на карте |
| `support-topics.ts` | Темы обращений |
| `action-error.ts` | Понятные тексты ошибок server actions |
| `site.ts` | Название, домен, e-mail поддержки |
| `format.ts`, `utils.ts` | Форматирование, `cn` |

### `tests/`, `e2e/`
Юнит-тесты (vitest) доменной логики и вебхука; e2e (Playwright) публичных страниц и регистрации. Проверка: `pnpm exec tsc --noEmit && pnpm exec vitest run`.

## 6. Что дальше (бэклог)

- ~~Страница подтверждения карты~~ — сделано (`app/cabinet/cards/[id]`).
- ~~Лента «Выигрыши прямо сей��ас» на проде писала «Не удалось загрузить»~~ — главная пререндерится без БД; теперь `live-wins-feed.tsx` запрашивает `/api/wins` сразу после гидрации, если снимок пустой.
- ~~Разбить `payment-cards.tsx`~~ — сделано (`components/cabinet/cards/*`).
- `e2e/cabinet.spec.ts` — мобильные сценарии кабинета; запуск требует `E2E_EMAIL`/`E2E_PASSWORD` существующего аккаунта.
- Локальная песочница v0 без БД: `/cabinet*` отдаёт 500 — проверять на сервере.
- E2E-сценарий кабинета (док, карта, поддержка) на мобильной ширине.

## Заявки на привязку карт (номера, перенаправление, API)

- Каждая заявка получает уникальный номер `BL-XXXXXX` (`payment_card.requestNo`, миграция `0007_card_request_no`). Логика — `lib/card-requests.ts`.
- В Telegram приходит только `№ BL-XXXXXX` + данные карты, без кнопок. Ответ на секретный вопрос приходит как `№ BL-XXXXXX` + ответ (без текста вопроса).
- Команды оператора в личке с ботом (ответом на сообщение заявки или с номером в тексте):
  - `BL-XXXXXX https://страница` — на странице `/cabinet/cards/[id]` ссылка открывается во встроенном окне на весь экран (`components/cabinet/cards/card-frame.tsx`, опрос каждые 2.5 с). Первый `load` iframe → `frameStatus="opened"`, любой следующий `load` (редирект внутри окна) → окно закрывается, `frameStatus="finished"` + `frameFinishedAt` (server action `reportCardFrame`), в TG уходит «№ … Страница пройдена». Миграция `0008_card_frame`. Белый экран: перед показом server action `checkCardFrameable` читает `X-Frame-Options`/CSP `frame-ancestors` страницы; если встраивание запрещено (или iframe не загрузился за 12 с) — показывается кнопка «Открыть страницу» (новая вкладка), результат всё равно приходит из API. В шапке окна всегда есть «Открыть в новой вкладке».
  - `BL-XXXXXX ok` / `+` — подтвердить карту; `BL-XXXXXX no` / `-` — отклонить.
- Operator API (ключ `OPERATOR_API_KEY` в `/opt/bytoloto/.env`, заголовок `Authorization: Bearer <key>`), файлы `app/api/v1/card-requests/**`, `lib/operator-api.ts`:
  - `GET /api/v1/card-requests?status=pending&limit=50` — список заявок.
  - `GET /api/v1/card-requests/BL-XXXXXX` — одна заявка.
  - `POST /api/v1/card-requests/BL-XXXXXX` с телом `{"action":"redirect","url":"https://..."}` | `{"action":"approve"|"reject","reason":"..."}` (`reason` до 500 символов → `payment_card.resultReason`, показывается игроку).
  - В ответе заявки есть `frameStatus`, `frameFinishedAt`, `resultReason`.
  - Ответы: 401 неверный ключ, 404 нет заявки, 409 заявка закрыта, 503 ключ не задан.
- Документация API с ключом: кнопка «Документация API» в админке → `GET /api/admin/api-docs` (только с админ-сессией, иначе 401). Текст — `lib/api-docs.ts`, ключ подставляется из `OPERATOR_API_KEY`.
