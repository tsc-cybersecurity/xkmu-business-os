ALTER TABLE "leads" ADD COLUMN "title" varchar(255);--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "tags" text[] DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "notes" text;