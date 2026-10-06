CREATE TABLE "visitor" (
	"id" serial PRIMARY KEY NOT NULL,
	"ip" text NOT NULL,
	"userAgent" text NOT NULL,
	"deviceType" text NOT NULL,
	"os" text NOT NULL,
	"browser" text NOT NULL,
	"userId" text,
	"lastPath" text DEFAULT '/' NOT NULL,
	"hits" integer DEFAULT 1 NOT NULL,
	"firstSeenAt" timestamp DEFAULT now() NOT NULL,
	"lastSeenAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "visitor" ADD CONSTRAINT "visitor_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "visitor_ip_ua_idx" ON "visitor" USING btree ("ip","userAgent");--> statement-breakpoint
CREATE INDEX "visitor_last_seen_idx" ON "visitor" USING btree ("lastSeenAt");--> statement-breakpoint
CREATE INDEX "visitor_user_idx" ON "visitor" USING btree ("userId");