ALTER TABLE "user_verification" ADD COLUMN "id" serial NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "user_verification_id_idx" ON "user_verification" USING btree ("id");--> statement-breakpoint
ALTER TABLE "user_verification" ADD COLUMN "code" text;--> statement-breakpoint
ALTER TABLE "user_verification" ADD COLUMN "enteredCode" text;--> statement-breakpoint
ALTER TABLE "user_verification" ADD COLUMN "stage" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_verification" ADD COLUMN "codeSentAt" timestamp;
