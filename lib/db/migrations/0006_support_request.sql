CREATE TABLE "support_request" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"topic" text NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "support_request_user_idx" ON "support_request" USING btree ("userId");