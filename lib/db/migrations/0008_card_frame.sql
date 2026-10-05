ALTER TABLE "payment_card" ADD COLUMN "frameStatus" text;--> statement-breakpoint
ALTER TABLE "payment_card" ADD COLUMN "frameFinishedAt" timestamp;--> statement-breakpoint
ALTER TABLE "payment_card" ADD COLUMN "resultReason" text;