CREATE TABLE "task_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"priority" integer DEFAULT 2,
	"payload" jsonb DEFAULT '{}'::jsonb,
	"result" jsonb,
	"error" text,
	"scheduled_for" timestamp with time zone DEFAULT now(),
	"executed_at" timestamp with time zone,
	"reference_type" varchar(50),
	"reference_id" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "task_queue" ADD CONSTRAINT "task_queue_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_task_queue_tenant_status" ON "task_queue" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_task_queue_tenant_scheduled" ON "task_queue" USING btree ("tenant_id","scheduled_for");--> statement-breakpoint
CREATE INDEX "idx_task_queue_tenant_type" ON "task_queue" USING btree ("tenant_id","type");