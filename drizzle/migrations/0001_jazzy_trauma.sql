CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"lead_id" uuid,
	"company_id" uuid,
	"person_id" uuid,
	"type" varchar(30) NOT NULL,
	"subject" varchar(255),
	"content" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ideas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"raw_content" text NOT NULL,
	"structured_content" jsonb DEFAULT '{}'::jsonb,
	"type" varchar(20) DEFAULT 'text' NOT NULL,
	"status" varchar(20) DEFAULT 'backlog',
	"tags" text[] DEFAULT '{}',
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "webhooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"url" varchar(500) NOT NULL,
	"events" text[] NOT NULL,
	"secret" varchar(255),
	"is_active" boolean DEFAULT true,
	"last_triggered_at" timestamp with time zone,
	"last_status" integer,
	"fail_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_activities_tenant_id" ON "activities" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_activities_lead" ON "activities" USING btree ("tenant_id","lead_id");--> statement-breakpoint
CREATE INDEX "idx_activities_company" ON "activities" USING btree ("tenant_id","company_id");--> statement-breakpoint
CREATE INDEX "idx_activities_person" ON "activities" USING btree ("tenant_id","person_id");--> statement-breakpoint
CREATE INDEX "idx_activities_created_at" ON "activities" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_ideas_tenant_id" ON "ideas" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_ideas_status" ON "ideas" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_webhooks_tenant_id" ON "webhooks" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_webhooks_active" ON "webhooks" USING btree ("tenant_id","is_active");