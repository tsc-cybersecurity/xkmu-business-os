CREATE TABLE "document_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" varchar(100),
	"body_html" text,
	"placeholders" jsonb DEFAULT '[]'::jsonb,
	"header_html" text,
	"footer_html" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_document_templates_tenant" ON "document_templates" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_document_templates_category" ON "document_templates" USING btree ("tenant_id","category");