CREATE TABLE "draw" (
	"id" serial PRIMARY KEY NOT NULL,
	"drawAt" timestamp NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"winningNumbers" text,
	"ticketsCount" integer DEFAULT 0 NOT NULL,
	"winnersCount" integer DEFAULT 0 NOT NULL,
	"prizeTotal" integer DEFAULT 0 NOT NULL,
	"settledAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "draw_draw_at_unique" ON "draw" USING btree ("drawAt");--> statement-breakpoint
CREATE INDEX "draw_status_idx" ON "draw" USING btree ("status","drawAt");--> statement-breakpoint
CREATE TABLE "spin" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"day" date NOT NULL,
	"segment" integer NOT NULL,
	"amount" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "spin" ADD CONSTRAINT "spin_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "spin_user_day_unique" ON "spin" USING btree ("userId","day");--> statement-breakpoint
ALTER TABLE "ticket" ADD COLUMN "drawId" integer;--> statement-breakpoint
ALTER TABLE "ticket" ADD COLUMN "matches" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "termsAcceptedAt" timestamp;--> statement-breakpoint
-- Tickets created before draws existed: group them into one draw per draw time
-- so the new NOT NULL "drawId" can be populated without losing history.
UPDATE "ticket" SET "drawAt" = now() WHERE "drawAt" IS NULL;--> statement-breakpoint
INSERT INTO "draw" ("drawAt", "status", "settledAt")
SELECT DISTINCT "drawAt",
	CASE WHEN "drawAt" <= now() THEN 'settled' ELSE 'scheduled' END,
	CASE WHEN "drawAt" <= now() THEN now() END
FROM "ticket"
ON CONFLICT ("drawAt") DO NOTHING;--> statement-breakpoint
UPDATE "ticket" t SET "drawId" = d."id" FROM "draw" d WHERE d."drawAt" = t."drawAt";--> statement-breakpoint
UPDATE "draw" d SET
	"ticketsCount" = s.tickets,
	"winnersCount" = s.winners,
	"prizeTotal" = s.prize
FROM (
	SELECT "drawId", count(*) AS tickets, count(*) FILTER (WHERE "status" = 'win') AS winners, coalesce(sum("prize"), 0) AS prize
	FROM "ticket" GROUP BY "drawId"
) s
WHERE s."drawId" = d."id" AND d."status" = 'settled';--> statement-breakpoint
ALTER TABLE "ticket" ALTER COLUMN "drawId" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_drawId_draw_id_fk" FOREIGN KEY ("drawId") REFERENCES "public"."draw"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ticket_draw_idx" ON "ticket" USING btree ("drawId");--> statement-breakpoint
ALTER TABLE "ticket" DROP COLUMN "winningNumbers";--> statement-breakpoint
ALTER TABLE "ticket" DROP COLUMN "drawAt";
