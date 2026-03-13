CREATE TABLE "n8n_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"api_url" varchar(500) NOT NULL,
	"api_key" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "n8n_workflow_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"n8n_workflow_id" varchar(100),
	"n8n_workflow_name" varchar(255),
	"prompt" text,
	"generated_json" jsonb,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"error_message" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "wiba_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"requirement_id" integer NOT NULL,
	"status" varchar(20) NOT NULL,
	"notes" text,
	"answered_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "wiba_audit_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"client_company_id" uuid,
	"consultant_id" uuid,
	"status" varchar(20) DEFAULT 'draft',
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "wiba_requirements" (
	"id" integer PRIMARY KEY NOT NULL,
	"number" varchar(10) NOT NULL,
	"category" integer NOT NULL,
	"question_text" text NOT NULL,
	"help_text" text,
	"effort" varchar(10)
);
--> statement-breakpoint
ALTER TABLE "n8n_connections" ADD CONSTRAINT "n8n_connections_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "n8n_workflow_logs" ADD CONSTRAINT "n8n_workflow_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "n8n_workflow_logs" ADD CONSTRAINT "n8n_workflow_logs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wiba_answers" ADD CONSTRAINT "wiba_answers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wiba_answers" ADD CONSTRAINT "wiba_answers_session_id_wiba_audit_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."wiba_audit_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wiba_answers" ADD CONSTRAINT "wiba_answers_requirement_id_wiba_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."wiba_requirements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wiba_audit_sessions" ADD CONSTRAINT "wiba_audit_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wiba_audit_sessions" ADD CONSTRAINT "wiba_audit_sessions_client_company_id_companies_id_fk" FOREIGN KEY ("client_company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wiba_audit_sessions" ADD CONSTRAINT "wiba_audit_sessions_consultant_id_users_id_fk" FOREIGN KEY ("consultant_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_n8n_connections_tenant_id" ON "n8n_connections" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_n8n_workflow_logs_tenant_id" ON "n8n_workflow_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_n8n_workflow_logs_status" ON "n8n_workflow_logs" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_wiba_answers_session" ON "wiba_answers" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_wiba_answers_tenant_session" ON "wiba_answers" USING btree ("tenant_id","session_id");--> statement-breakpoint
CREATE INDEX "idx_wiba_audit_sessions_tenant" ON "wiba_audit_sessions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_wiba_audit_sessions_status" ON "wiba_audit_sessions" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_wiba_audit_sessions_client" ON "wiba_audit_sessions" USING btree ("tenant_id","client_company_id");