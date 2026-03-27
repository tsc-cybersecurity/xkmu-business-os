CREATE TABLE "grundschutz_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"control_id" varchar(30) NOT NULL,
	"status" varchar(20) DEFAULT 'offen',
	"notes" text,
	"answered_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "grundschutz_audit_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"client_company_id" uuid,
	"consultant_id" uuid,
	"title" varchar(255),
	"status" varchar(20) DEFAULT 'draft',
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "grundschutz_catalog_meta" (
	"id" varchar(50) PRIMARY KEY DEFAULT 'current' NOT NULL,
	"catalog_uuid" varchar(100),
	"title" varchar(255),
	"version" varchar(100),
	"last_modified" varchar(100),
	"oscal_version" varchar(20),
	"total_groups" integer DEFAULT 0,
	"total_controls" integer DEFAULT 0,
	"imported_at" timestamp with time zone DEFAULT now(),
	"source_url" text
);
--> statement-breakpoint
CREATE TABLE "grundschutz_controls" (
	"id" varchar(30) PRIMARY KEY NOT NULL,
	"group_id" varchar(20) NOT NULL,
	"title" varchar(500) NOT NULL,
	"statement" text,
	"sec_level" varchar(30),
	"effort_level" varchar(10),
	"tags" text[] DEFAULT '{}',
	"oscal_class" varchar(100),
	"params" jsonb DEFAULT '[]'::jsonb,
	"sort_order" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "grundschutz_groups" (
	"id" varchar(20) PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"parent_id" varchar(20),
	"sort_order" integer DEFAULT 0
);
--> statement-breakpoint
ALTER TABLE "grundschutz_answers" ADD CONSTRAINT "grundschutz_answers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grundschutz_answers" ADD CONSTRAINT "grundschutz_answers_session_id_grundschutz_audit_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."grundschutz_audit_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grundschutz_audit_sessions" ADD CONSTRAINT "grundschutz_audit_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grundschutz_audit_sessions" ADD CONSTRAINT "grundschutz_audit_sessions_client_company_id_companies_id_fk" FOREIGN KEY ("client_company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grundschutz_audit_sessions" ADD CONSTRAINT "grundschutz_audit_sessions_consultant_id_users_id_fk" FOREIGN KEY ("consultant_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_grundschutz_answers_session" ON "grundschutz_answers" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_grundschutz_sessions_tenant" ON "grundschutz_audit_sessions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_grundschutz_controls_group" ON "grundschutz_controls" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "idx_grundschutz_controls_sec_level" ON "grundschutz_controls" USING btree ("sec_level");