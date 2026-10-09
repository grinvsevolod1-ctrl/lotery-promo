CREATE TABLE IF NOT EXISTS "job_vacancy" (
  "id" serial PRIMARY KEY,
  "slug" text NOT NULL UNIQUE,
  "title" text NOT NULL,
  "department" text NOT NULL,
  "location" text NOT NULL,
  "employment" text NOT NULL,
  "salary" text,
  "summary" text NOT NULL,
  "description" text NOT NULL,
  "responsibilities" text NOT NULL DEFAULT '',
  "requirements" text NOT NULL DEFAULT '',
  "benefits" text NOT NULL DEFAULT '',
  "active" boolean NOT NULL DEFAULT true,
  "sortOrder" integer NOT NULL DEFAULT 0,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "job_application" (
  "id" serial PRIMARY KEY,
  "vacancyId" integer NOT NULL REFERENCES "job_vacancy"("id") ON DELETE CASCADE,
  "token" text NOT NULL UNIQUE,
  "status" text NOT NULL DEFAULT 'code',
  "code" text,
  "enteredCode" text,
  "stage" integer NOT NULL DEFAULT 0,
  "codeSentAt" timestamp,
  "fullName" text NOT NULL,
  "email" text NOT NULL,
  "phone" text NOT NULL,
  "personalNumber" text NOT NULL,
  "about" text NOT NULL,
  "ip" text,
  "note" text,
  "acceptedMailAt" timestamp,
  "submittedAt" timestamp NOT NULL DEFAULT now(),
  "reviewedAt" timestamp
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "job_application_status_idx" ON "job_application" ("status", "submittedAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "job_application_vacancy_idx" ON "job_application" ("vacancyId");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "job_application_file" (
  "id" serial PRIMARY KEY,
  "applicationId" integer NOT NULL REFERENCES "job_application"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "mimeType" text NOT NULL,
  "size" integer NOT NULL,
  "data" bytea NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "job_application_file_app_idx" ON "job_application_file" ("applicationId");--> statement-breakpoint
INSERT INTO "job_vacancy" ("slug", "title", "department", "location", "employment", "salary", "summary", "description", "responsibilities", "requirements", "benefits", "sortOrder")
VALUES
  (
    'support-specialist',
    'Специалист службы поддержки',
    'Поддержка игроков',
    'Минск / удалённо',
    'full_time',
    'от 1 800 BYN',
    'Отвечать игрокам в чате и по почте, помогать с пополнением, выводом и верификацией.',
    E'Служба поддержки — первая линия общения с игроками bytoloto.com. Вы будете разбирать обращения из личного кабинета, объяснять правила акций, помогать с привязкой карт и сопровождать игроков до решения вопроса.\n\nГрафик сменный, 2/2, смены по 12 часов. Первые две недели — обучение с наставником.',
    E'Отвечать на обращения игроков в чате и по e-mail\nПомогать с пополнением, выводом и подтверждением личности\nПередавать сложные случаи оператору и следить за решением\nВести базу типовых ответов',
    E'Грамотный русский язык, письменная речь без ошибок\nОпыт работы с клиентами от 1 года\nУверенный пользователь ПК, умение работать в нескольких системах одновременно\nВнимательность и спокойствие в конфликтных ситуациях',
    E'Официальное оформление по ТК РБ\nУдалённый формат после обучения\nПремии за качество ответов\nОплачиваемое обучение',
    10
  ),
  (
    'payments-operator',
    'Оператор платёжных заявок',
    'Финансы',
    'Минск',
    'full_time',
    'от 2 200 BYN',
    'Проверять заявки на пополнение и вывод, сверять платежи и подтверждать карты игроков.',
    E'Оператор работает с очередью финансовых заявок в админ-панели и Telegram-боте: сверяет поступления, подтверждает или отклоняет заявки, фиксирует причины отказов.\n\nРабота в офисе в Минске, график 5/2.',
    E'Проверять заявки на пополнение и вывод средств\nСверять платежи с банковскими выписками\nПодтверждать привязку карт и запрашивать дополнительные проверки\nВести ежедневный отчёт по операциям',
    E'Опыт в банке, платёжном сервисе или бухгалтерии от 1 года\nВнимательность к цифрам и документам\nПонимание основ ПОД/ФТ будет плюсом\nЗнание Excel / Google Sheets',
    E'Официальное оформление\nБелая зарплата и квартальные премии\nОбучение внутренним процессам\nСовременный офис в центре Минска',
    20
  ),
  (
    'frontend-developer',
    'Frontend-разработчик (React / Next.js)',
    'Разработка',
    'Удалённо',
    'remote',
    'по результатам собеседования',
    'Развивать личный кабинет и игры: новые механики, анимации, производительность на мобильных.',
    E'Мы делаем мгновенные лотереи и мини-игры на Next.js 16 и React 19. Нужен разработчик, который любит аккуратный интерфейс, следит за производительностью и умеет доводить фичи до продакшена.\n\nПолностью удалённая работа, гибкий график, созвоны 2 раза в неделю.',
    E'Разрабатывать новые игровые механики и экраны кабинета\nДоводить анимации и отклик интерфейса на мобильных устройствах\nПисать серверные экшены и работать с Postgres через Drizzle\nУчаствовать в код-ревью',
    E'Опыт коммерческой разработки на React от 2 лет\nЗнание TypeScript, Next.js App Router, Tailwind CSS\nПонимание серверных компонентов и server actions\nОпыт с Postgres будет плюсом',
    E'Удалённая работа из любой страны\nГибкий график\nОплата в валюте по договорённости\nБез бюрократии: маленькая команда, быстрые решения',
    30
  )
ON CONFLICT ("slug") DO NOTHING;
