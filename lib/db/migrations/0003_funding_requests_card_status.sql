CREATE TABLE "funding_request" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"amount" integer NOT NULL,
	"cardId" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"note" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"processedAt" timestamp
);
--> statement-breakpoint
ALTER TABLE "payment_card" ADD COLUMN "status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
CREATE INDEX "funding_request_user_idx" ON "funding_request" USING btree ("userId");