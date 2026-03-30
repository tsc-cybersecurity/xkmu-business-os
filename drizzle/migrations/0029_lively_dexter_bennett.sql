CREATE TABLE "grundschutz_asset_controls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"control_id" varchar(30) NOT NULL,
	"applicability" varchar(20) DEFAULT 'applicable',
	"justification" text,
	"implementation_status" varchar(20) DEFAULT 'offen',
	"implementation_notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "grundschutz_asset_relations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"source_asset_id" uuid NOT NULL,
	"target_asset_id" uuid NOT NULL,
	"relation_type" varchar(30) NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "grundschutz_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category_type" varchar(50) NOT NULL,
	"category_name" varchar(100) NOT NULL,
	"category_uuid" varchar(40),
	"vertraulichkeit" varchar(20) DEFAULT 'normal',
	"integritaet" varchar(20) DEFAULT 'normal',
	"verfuegbarkeit" varchar(20) DEFAULT 'normal',
	"schutzbedarf_begruendung" text,
	"owner_id" uuid,
	"status" varchar(20) DEFAULT 'active',
	"location" varchar(255),
	"tags" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"custom_fields" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "grundschutz_asset_controls" ADD CONSTRAINT "grundschutz_asset_controls_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grundschutz_asset_controls" ADD CONSTRAINT "grundschutz_asset_controls_asset_id_grundschutz_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."grundschutz_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grundschutz_asset_relations" ADD CONSTRAINT "grundschutz_asset_relations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grundschutz_asset_relations" ADD CONSTRAINT "grundschutz_asset_relations_source_asset_id_grundschutz_assets_id_fk" FOREIGN KEY ("source_asset_id") REFERENCES "public"."grundschutz_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grundschutz_asset_relations" ADD CONSTRAINT "grundschutz_asset_relations_target_asset_id_grundschutz_assets_id_fk" FOREIGN KEY ("target_asset_id") REFERENCES "public"."grundschutz_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grundschutz_assets" ADD CONSTRAINT "grundschutz_assets_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grundschutz_assets" ADD CONSTRAINT "grundschutz_assets_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grundschutz_assets" ADD CONSTRAINT "grundschutz_assets_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_gs_asset_ctrl_asset" ON "grundschutz_asset_controls" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "idx_gs_asset_ctrl_control" ON "grundschutz_asset_controls" USING btree ("control_id");--> statement-breakpoint
CREATE INDEX "idx_gs_asset_ctrl_tenant" ON "grundschutz_asset_controls" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_gs_asset_rel_source" ON "grundschutz_asset_relations" USING btree ("source_asset_id");--> statement-breakpoint
CREATE INDEX "idx_gs_asset_rel_target" ON "grundschutz_asset_relations" USING btree ("target_asset_id");--> statement-breakpoint
CREATE INDEX "idx_gs_assets_tenant" ON "grundschutz_assets" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_gs_assets_company" ON "grundschutz_assets" USING btree ("tenant_id","company_id");--> statement-breakpoint
CREATE INDEX "idx_gs_assets_category" ON "grundschutz_assets" USING btree ("tenant_id","category_type");--> statement-breakpoint
CREATE INDEX "idx_gs_assets_status" ON "grundschutz_assets" USING btree ("tenant_id","status");