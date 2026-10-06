CREATE TABLE "user_verification" (
	"userId" text PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"lastName" text NOT NULL,
	"firstName" text NOT NULL,
	"middleName" text,
	"birthDate" date NOT NULL,
	"citizenship" text NOT NULL,
	"documentType" text NOT NULL,
	"documentNumber" text NOT NULL,
	"personalNumber" text NOT NULL,
	"phone" text NOT NULL,
	"address" text NOT NULL,
	"note" text,
	"submittedAt" timestamp DEFAULT now() NOT NULL,
	"reviewedAt" timestamp
);
--> statement-breakpoint
ALTER TABLE "user_verification" ADD CONSTRAINT "user_verification_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_verification_status_idx" ON "user_verification" USING btree ("status","submittedAt");