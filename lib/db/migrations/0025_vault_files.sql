CREATE TABLE "vault_file" (
	"id" serial PRIMARY KEY NOT NULL,
	"telegramFileUniqueId" text NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"mimeType" text NOT NULL,
	"size" integer NOT NULL,
	"data" bytea NOT NULL,
	"caption" text,
	"chatId" text NOT NULL,
	"messageId" integer,
	"senderId" text,
	"senderName" text,
	"senderUsername" text,
	"receivedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vault_file_telegramFileUniqueId_unique" UNIQUE("telegramFileUniqueId")
);
--> statement-breakpoint
CREATE INDEX "vault_file_received_idx" ON "vault_file" USING btree ("receivedAt");
