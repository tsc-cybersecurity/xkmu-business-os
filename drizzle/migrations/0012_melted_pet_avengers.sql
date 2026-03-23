ALTER TABLE "process_tasks" ADD COLUMN "app_status" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "process_tasks" ADD COLUMN "app_notes" text;--> statement-breakpoint
ALTER TABLE "process_tasks" ADD COLUMN "app_module" varchar(100);--> statement-breakpoint
CREATE INDEX "idx_process_tasks_app_status" ON "process_tasks" USING btree ("tenant_id","app_status");