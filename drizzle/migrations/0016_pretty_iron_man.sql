CREATE TABLE "time_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"company_id" uuid,
	"description" varchar(500),
	"date" timestamp with time zone NOT NULL,
	"start_time" timestamp with time zone,
	"end_time" timestamp with time zone,
	"duration_minutes" integer DEFAULT 0,
	"billable" boolean DEFAULT true,
	"hourly_rate" numeric(10, 2),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "payment_status" varchar(20) DEFAULT 'unpaid';--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "paid_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "paid_amount" numeric(10, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "dunning_level" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_time_entries_tenant" ON "time_entries" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_time_entries_tenant_date" ON "time_entries" USING btree ("tenant_id","date");--> statement-breakpoint
CREATE INDEX "idx_time_entries_tenant_company" ON "time_entries" USING btree ("tenant_id","company_id");--> statement-breakpoint
CREATE INDEX "idx_time_entries_user_date" ON "time_entries" USING btree ("user_id","date");