ALTER TABLE "vault_file" ALTER COLUMN "size" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "vault_file" ALTER COLUMN "data" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "vault_file" ADD COLUMN "storagePath" text;
