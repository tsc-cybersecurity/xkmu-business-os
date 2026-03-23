CREATE TABLE "process_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"process_id" uuid NOT NULL,
	"task_key" varchar(20) NOT NULL,
	"subprocess" varchar(255),
	"title" varchar(255) NOT NULL,
	"purpose" text,
	"trigger" text,
	"time_estimate" varchar(50),
	"automation_potential" varchar(20),
	"tools" jsonb DEFAULT '[]'::jsonb,
	"prerequisites" jsonb DEFAULT '[]'::jsonb,
	"steps" jsonb DEFAULT '[]'::jsonb,
	"checklist" jsonb DEFAULT '[]'::jsonb,
	"expected_output" text,
	"error_escalation" text,
	"solution" text,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "processes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"key" varchar(20) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "process_tasks" ADD CONSTRAINT "process_tasks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_tasks" ADD CONSTRAINT "process_tasks_process_id_processes_id_fk" FOREIGN KEY ("process_id") REFERENCES "public"."processes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processes" ADD CONSTRAINT "processes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_process_tasks_tenant" ON "process_tasks" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_process_tasks_process" ON "process_tasks" USING btree ("process_id");--> statement-breakpoint
CREATE INDEX "idx_process_tasks_tenant_key" ON "process_tasks" USING btree ("tenant_id","task_key");--> statement-breakpoint
CREATE INDEX "idx_processes_tenant" ON "processes" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_processes_tenant_key" ON "processes" USING btree ("tenant_id","key");