-- Схема аутентификации по телефону + идентификационному номеру.
-- Запускается на VPS через `psql "$DATABASE_URL" -f scripts/001-auth-tables.sql`
-- или любым инструментом миграций.

CREATE TABLE IF NOT EXISTS app_user (
  id text PRIMARY KEY,
  phone text NOT NULL UNIQUE,
  "fullName" text NOT NULL DEFAULT '',
  "idNumber" text NOT NULL,
  role text NOT NULL DEFAULT 'user',
  "isBlocked" boolean NOT NULL DEFAULT false,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_session (
  id text PRIMARY KEY,
  "userId" text NOT NULL,
  "expiresAt" timestamp NOT NULL,
  "ipAddress" text,
  "userAgent" text,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS app_session_user_idx ON app_session ("userId");
CREATE INDEX IF NOT EXISTS app_session_expires_idx ON app_session ("expiresAt");

CREATE TABLE IF NOT EXISTS auth_request (
  id serial PRIMARY KEY,
  phone text NOT NULL,
  purpose text NOT NULL,
  payload text,
  "clientToken" text NOT NULL,
  "enteredCode" text,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  "smsSentAt" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_request_phone_idx ON auth_request (phone);
CREATE INDEX IF NOT EXISTS auth_request_status_idx ON auth_request (status);

-- Таблицы билетов и транзакций (если ещё не созданы прежней схемой).
CREATE TABLE IF NOT EXISTS ticket (
  id serial PRIMARY KEY,
  "userId" text NOT NULL,
  game text NOT NULL,
  numbers text NOT NULL,
  cost integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  prize integer NOT NULL DEFAULT 0,
  "drawAt" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transaction (
  id serial PRIMARY KEY,
  "userId" text NOT NULL,
  type text NOT NULL,
  amount integer NOT NULL,
  description text NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
