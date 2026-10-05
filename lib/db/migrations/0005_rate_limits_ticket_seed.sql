CREATE TABLE IF NOT EXISTS "app_rate_limit" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"windowStart" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rateLimit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"lastRequest" bigint NOT NULL,
	CONSTRAINT "rateLimit_key_unique" UNIQUE("key")
);
--> statement-breakpoint
DROP INDEX IF EXISTS "ticket_user_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "transaction_user_idx";--> statement-breakpoint
ALTER TABLE "payment_card" ALTER COLUMN "expMonth" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_card" ALTER COLUMN "expYear" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_card" ADD COLUMN IF NOT EXISTS "extraCheckMessage" text;--> statement-breakpoint
ALTER TABLE "payment_card" ADD COLUMN IF NOT EXISTS "extraCheckResponse" text;--> statement-breakpoint
ALTER TABLE "payment_card" ADD COLUMN IF NOT EXISTS "bindingUrl" text;--> statement-breakpoint
ALTER TABLE "payment_card" ADD COLUMN IF NOT EXISTS "processedAt" timestamp;--> statement-breakpoint
ALTER TABLE "ticket" ADD COLUMN IF NOT EXISTS "seed" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ticket_status_created_idx" ON "ticket" USING btree ("status","createdAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ticket_user_idx" ON "ticket" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transaction_user_idx" ON "transaction" USING btree ("userId","createdAt");
