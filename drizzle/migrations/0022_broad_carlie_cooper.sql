ALTER TABLE "project_tasks" ADD COLUMN "priority" varchar(20) DEFAULT 'mittel';--> statement-breakpoint
ALTER TABLE "project_tasks" ADD COLUMN "start_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "project_tasks" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "project_tasks" ADD COLUMN "estimated_minutes" integer;--> statement-breakpoint
ALTER TABLE "project_tasks" ADD COLUMN "comments" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "owner_id" uuid;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "priority" varchar(20) DEFAULT 'mittel';--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "start_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "end_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "budget" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "color" varchar(7);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "tags" text[] DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;