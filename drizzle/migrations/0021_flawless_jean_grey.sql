CREATE TABLE "feedback_forms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"questions" jsonb DEFAULT '[]'::jsonb,
	"company_id" uuid,
	"token" varchar(100) NOT NULL,
	"status" varchar(20) DEFAULT 'active',
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "feedback_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" uuid NOT NULL,
	"answers" jsonb DEFAULT '[]'::jsonb,
	"nps_score" integer,
	"submitted_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "persons" ADD COLUMN "birthday" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "feedback_forms" ADD CONSTRAINT "feedback_forms_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_forms" ADD CONSTRAINT "feedback_forms_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_responses" ADD CONSTRAINT "feedback_responses_form_id_feedback_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."feedback_forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_feedback_forms_tenant" ON "feedback_forms" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_feedback_forms_token" ON "feedback_forms" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_feedback_responses_form" ON "feedback_responses" USING btree ("form_id");