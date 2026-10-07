CREATE TABLE IF NOT EXISTS "bonus_offer" (
  "id" serial PRIMARY KEY,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "kind" text NOT NULL,
  "category" text NOT NULL,
  "gameTitle" text,
  "percent" integer,
  "amount" numeric(12, 2),
  "maxBonus" numeric(12, 2),
  "minDeposit" numeric(12, 2),
  "freeSpins" integer,
  "spinValue" numeric(12, 2),
  "wager" integer NOT NULL DEFAULT 0,
  "wagerContribution" integer NOT NULL DEFAULT 100,
  "validDays" integer NOT NULL DEFAULT 7,
  "maxWin" numeric(12, 2),
  "audience" text NOT NULL DEFAULT 'all',
  "promoCode" text,
  "active" boolean NOT NULL DEFAULT true,
  "sortOrder" integer NOT NULL DEFAULT 0,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "bonus_offer_promo_code" ON "bonus_offer" (upper("promoCode")) WHERE "promoCode" IS NOT NULL;--> statement-breakpoint
INSERT INTO "bonus_offer" ("title", "description", "kind", "category", "gameTitle", "percent", "amount", "maxBonus", "minDeposit", "freeSpins", "spinValue", "wager", "wagerContribution", "validDays", "maxWin", "audience", "promoCode", "sortOrder")
SELECT * FROM (VALUES
  ('Приветственный пакет 150%', 'Первое пополнение увеличиваем в 2,5 раза. Действует на все игры, слоты засчитываются в отыгрыш полностью.', 'deposit_match', 'all', NULL, 150, NULL::numeric, 300::numeric, 30::numeric, NULL::int, NULL::numeric, 40, 100, 10, NULL::numeric, 'new', 'WELCOME150', 1),
  ('50 фриспинов в Gates of Olympus', 'Пополните счёт от 30 BYN и получите 50 бесплатных вращений по 0,20 BYN в Gates of Olympus.', 'free_spins', 'slots', 'Gates of Olympus', NULL, NULL, NULL, 30, 50, 0.20, 35, 100, 3, 100, 'all', 'OLYMPUS50', 2),
  ('Sweet Bonanza x2', '100% к пополнению для игры в Sweet Bonanza и других слотах Pragmatic Play.', 'deposit_match', 'slots', 'Sweet Bonanza', 100, NULL, 150, 20, NULL, NULL, 40, 100, 7, NULL, 'all', 'BONANZA100', 3),
  ('30 фриспинов в Sugar Rush', 'За пополнение от 25 BYN — 30 вращений по 0,40 BYN в Sugar Rush.', 'free_spins', 'slots', 'Sugar Rush', NULL, NULL, NULL, 25, 30, 0.40, 30, 100, 3, 80, 'all', 'SUGAR30', 4),
  ('Бездеп: 20 спинов в Big Bass Splash', 'Подарок за пройденную верификацию: 20 вращений по 0,20 BYN без пополнения.', 'no_deposit', 'slots', 'Big Bass Splash', NULL, NULL, NULL, NULL, 20, 0.20, 45, 100, 2, 50, 'verified', 'BIGBASS20', 5),
  ('Релоад 50% в The Dog House Megaways', 'Для постоянных игроков: +50% к повторному пополнению от 40 BYN.', 'reload', 'slots', 'The Dog House Megaways', 50, NULL, 100, 40, NULL, NULL, 35, 100, 5, NULL, 'returning', 'DOGHOUSE50', 6),
  ('40 фриспинов в Wolf Gold', 'Пополнение от 30 BYN — и 40 вращений по 0,25 BYN в Wolf Gold.', 'free_spins', 'slots', 'Wolf Gold', NULL, NULL, NULL, 30, 40, 0.25, 35, 100, 3, 100, 'all', 'WOLF40', 7),
  ('Кешбэк 10% в Gates of Hades', 'Возвращаем 10% чистого проигрыша в Gates of Hades за неделю. Начисление по понедельникам.', 'cashback', 'slots', 'Gates of Hades', 10, NULL, 200, NULL, NULL, NULL, 5, 100, 7, NULL, 'all', NULL, 8),
  ('Wild West Gold +75%', '75% к пополнению от 30 BYN для игры в Wild West Gold.', 'deposit_match', 'slots', 'Wild West Gold', 75, NULL, 120, 30, NULL, NULL, 35, 100, 7, NULL, 'all', 'WILDWEST75', 9),
  ('Хайроллер: 15 спинов по 1 BYN', 'Пополнение от 150 BYN — 15 дорогих вращений в Madame Destiny Megaways.', 'free_spins', 'slots', 'Madame Destiny Megaways', NULL, NULL, NULL, 150, 15, 1.00, 30, 100, 3, 300, 'verified', 'DESTINY15', 10),
  ('Кешбэк выходного дня 15%', '15% от проигрыша в слотах за субботу и воскресенье возвращаем в понедельник.', 'cashback', 'slots', NULL, 15, NULL, 150, NULL, NULL, NULL, 3, 100, 2, NULL, 'all', NULL, 11),
  ('Пятничный релоад 50%', 'Каждую пятницу +50% к пополнению от 50 BYN на все слоты.', 'reload', 'slots', NULL, 50, NULL, 200, 50, NULL, NULL, 35, 100, 1, NULL, 'returning', 'FRIDAY50', 12),
  ('Кешбэк 10% в Lightning Roulette', 'Возвращаем 10% чистого проигрыша в XXXtreme Lightning Roulette за неделю.', 'cashback', 'live', 'XXXtreme Lightning Roulette', 10, NULL, 100, NULL, NULL, NULL, 1, 100, 7, NULL, 'all', NULL, 13),
  ('20 BYN на Monopoly Big Baller', 'Пополните от 50 BYN и получите 20 BYN для игры в Monopoly Big Baller.', 'deposit_match', 'live', 'Monopoly Big Baller', NULL, 20, 20, 50, NULL, NULL, 20, 20, 3, NULL, 'all', 'BIGBALLER20', 14),
  ('Страховка первой ставки в Lightning Blackjack', 'Если первая ставка в Lightning Blackjack проиграла — вернём её бонусом до 30 BYN.', 'insurance', 'live', 'Lightning Blackjack', 100, NULL, 30, NULL, NULL, NULL, 10, 10, 1, NULL, 'all', 'BJSAFE', 15),
  ('Immersive Roulette +25%', '25% к пополнению от 40 BYN для игры в Immersive Roulette.', 'deposit_match', 'live', 'Immersive Roulette', 25, NULL, 100, 40, NULL, NULL, 25, 20, 7, NULL, 'all', 'ROULETTE25', 16),
  ('5 BYN без депозита в Mega Ball', 'Подарок за верификацию: 5 BYN на Mega Ball без пополнения.', 'no_deposit', 'live', 'Mega Ball', NULL, 5, 5, NULL, NULL, NULL, 30, 20, 3, 50, 'verified', 'MEGABALL5', 17),
  ('VIP-кешбэк 5% в Lightning Baccarat', 'Для игроков с пополнением от 300 BYN: 5% от проигрыша в баккара без отыгрыша выше x1.', 'cashback', 'live', 'Lightning Baccarat', 5, NULL, 300, 300, NULL, NULL, 1, 10, 7, NULL, 'verified', NULL, 18),
  ('Cash or Crash +30%', '30% к пополнению от 30 BYN для игры в Cash or Crash.', 'deposit_match', 'live', 'Cash or Crash', 30, NULL, 60, 30, NULL, NULL, 25, 20, 5, NULL, 'all', 'CRASH30', 19),
  ('Живой старт 100%', 'Первое пополнение для live-игр удваиваем до 100 BYN. Live засчитывается в отыгрыш на 20%.', 'deposit_match', 'live', NULL, 100, NULL, 100, 30, NULL, NULL, 30, 20, 7, NULL, 'new', 'LIVE100', 20)
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM "bonus_offer");
