CREATE TABLE IF NOT EXISTS "ninja_round" (
  "id" serial PRIMARY KEY,
  "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "stake" integer NOT NULL,
  "traps" integer NOT NULL,
  "cost" numeric(12, 2) NOT NULL,
  "awakening" integer NOT NULL DEFAULT 0,
  "seed" text NOT NULL,
  "layout" jsonb NOT NULL,
  "state" jsonb NOT NULL,
  "status" text NOT NULL DEFAULT 'active',
  "payout" numeric(12, 2) NOT NULL DEFAULT 0,
  "ticketId" integer REFERENCES "ticket"("id"),
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "settledAt" timestamp
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ninja_round_user_idx" ON "ninja_round" ("userId", "createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ninja_round_active_once" ON "ninja_round" ("userId") WHERE "status" = 'active';
