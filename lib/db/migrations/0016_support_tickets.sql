CREATE TABLE "support_reply" (
	"id" serial PRIMARY KEY NOT NULL,
	"requestId" integer NOT NULL,
	"body" text NOT NULL,
	"emailed" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_template" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "support_reply" ADD CONSTRAINT "support_reply_requestId_support_request_id_fk" FOREIGN KEY ("requestId") REFERENCES "public"."support_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "support_reply_request_idx" ON "support_reply" USING btree ("requestId","createdAt");