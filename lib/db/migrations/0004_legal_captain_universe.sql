CREATE TABLE IF NOT EXISTS "referral" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"inviteeId" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"processedAt" timestamp,
	CONSTRAINT "referral_inviteeId_unique" UNIQUE("inviteeId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "referral_code" (
	"userId" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "referral_code_code_unique" UNIQUE("code")
);
