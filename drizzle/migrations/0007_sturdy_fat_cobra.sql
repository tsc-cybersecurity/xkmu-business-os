CREATE TABLE "firecrawl_researches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"url" varchar(500) NOT NULL,
	"status" varchar(20) DEFAULT 'completed' NOT NULL,
	"page_count" integer,
	"pages" jsonb,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "firecrawl_researches" ADD CONSTRAINT "firecrawl_researches_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "firecrawl_researches" ADD CONSTRAINT "firecrawl_researches_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_firecrawl_researches_tenant" ON "firecrawl_researches" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_firecrawl_researches_tenant_company" ON "firecrawl_researches" USING btree ("tenant_id","company_id");