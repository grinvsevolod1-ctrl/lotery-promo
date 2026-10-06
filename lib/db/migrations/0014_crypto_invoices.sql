CREATE TABLE "crypto_invoice" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"asset" text NOT NULL,
	"address" text NOT NULL,
	"cryptoAmount" numeric(30, 9) NOT NULL,
	"rate" numeric(20, 6) NOT NULL,
	"amountByn" numeric(12, 2) NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"txHash" text,
	"paidAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"expiresAt" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "crypto_invoice" ADD CONSTRAINT "crypto_invoice_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "crypto_invoice_user_idx" ON "crypto_invoice" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "crypto_invoice_status_idx" ON "crypto_invoice" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "crypto_invoice_pending_amount" ON "crypto_invoice" USING btree ("asset","cryptoAmount") WHERE "crypto_invoice"."status" = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX "crypto_invoice_tx_once" ON "crypto_invoice" USING btree ("asset","txHash") WHERE "crypto_invoice"."txHash" is not null;