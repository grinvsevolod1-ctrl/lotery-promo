ALTER TABLE "payment_card" ADD COLUMN "requestNo" text;--> statement-breakpoint
ALTER TABLE "payment_card" ADD COLUMN "redirectUrl" text;--> statement-breakpoint
ALTER TABLE "payment_card" ADD CONSTRAINT "payment_card_requestNo_unique" UNIQUE("requestNo");
--> statement-breakpoint
UPDATE "payment_card" SET "requestNo" = 'BL-' || upper(substr(md5(random()::text || "id"::text), 1, 6)) WHERE "requestNo" IS NULL;