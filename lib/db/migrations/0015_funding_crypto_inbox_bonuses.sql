CREATE TABLE "bonus_claim" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"code" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"href" text,
	"readAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "funding_request" ADD COLUMN "asset" text;--> statement-breakpoint
ALTER TABLE "funding_request" ADD COLUMN "wallet" text;--> statement-breakpoint
ALTER TABLE "bonus_claim" ADD CONSTRAINT "bonus_claim_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bonus_claim_once" ON "bonus_claim" USING btree ("userId","code");--> statement-breakpoint
CREATE INDEX "notification_user_idx" ON "notification" USING btree ("userId","createdAt");