CREATE TABLE "payment_card" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"brand" text NOT NULL,
	"last4" text NOT NULL,
	"bankName" text,
	"cardholder" text NOT NULL,
	"expMonth" integer NOT NULL,
	"expYear" integer NOT NULL,
	"fingerprint" text NOT NULL,
	"isDefault" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ticket" ALTER COLUMN "drawId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ticket" ADD COLUMN "winningNumbers" text;--> statement-breakpoint
ALTER TABLE "payment_card" ADD CONSTRAINT "payment_card_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_card_user_idx" ON "payment_card" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_card_user_fingerprint_unique" ON "payment_card" USING btree ("userId","fingerprint");--> statement-breakpoint
-- Legacy tickets: copy the winning combination of their draw onto the ticket.
UPDATE "ticket" t SET "winningNumbers" = d."winningNumbers" FROM "draw" d WHERE d."id" = t."drawId" AND t."winningNumbers" IS NULL;
