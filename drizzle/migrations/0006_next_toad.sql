CREATE TABLE "company_researches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'completed' NOT NULL,
	"research_data" jsonb,
	"scraped_pages" jsonb,
	"proposed_changes" jsonb,
	"applied_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "is_public" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "is_highlight" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "short_description" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "slug" varchar(255);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "seo_title" varchar(70);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "seo_description" varchar(160);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "images" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "weight" numeric(10, 3);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "dimensions" jsonb;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "manufacturer" varchar(255);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "ean" varchar(13);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "min_order_quantity" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "delivery_time" varchar(100);--> statement-breakpoint
ALTER TABLE "company_researches" ADD CONSTRAINT "company_researches_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_researches" ADD CONSTRAINT "company_researches_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_company_researches_tenant" ON "company_researches" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_company_researches_tenant_company" ON "company_researches" USING btree ("tenant_id","company_id");--> statement-breakpoint
CREATE INDEX "idx_company_researches_tenant_status" ON "company_researches" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_products_slug" ON "products" USING btree ("tenant_id","slug");--> statement-breakpoint
CREATE INDEX "idx_products_is_public" ON "products" USING btree ("tenant_id","is_public");--> statement-breakpoint
CREATE INDEX "idx_products_ean" ON "products" USING btree ("tenant_id","ean");