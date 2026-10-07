ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "blockedAt" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "blockReason" text;
