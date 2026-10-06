CREATE TABLE "visitor_event" (
	"id" serial PRIMARY KEY NOT NULL,
	"visitorId" integer NOT NULL,
	"type" text NOT NULL,
	"label" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "visitor_ip_ua_idx";--> statement-breakpoint
ALTER TABLE "visitor" ADD COLUMN "deviceId" text;--> statement-breakpoint
ALTER TABLE "visitor_event" ADD CONSTRAINT "visitor_event_visitorId_visitor_id_fk" FOREIGN KEY ("visitorId") REFERENCES "public"."visitor"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "visitor_event_visitor_idx" ON "visitor_event" USING btree ("visitorId","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "visitor_device_id_idx" ON "visitor" USING btree ("deviceId") WHERE "visitor"."deviceId" is not null;--> statement-breakpoint
CREATE INDEX "visitor_ip_ua_idx" ON "visitor" USING btree ("ip","userAgent");