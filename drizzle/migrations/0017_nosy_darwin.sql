CREATE TABLE "receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"file_name" varchar(255),
	"file_url" varchar(500),
	"amount" numeric(10, 2),
	"date" timestamp with time zone,
	"vendor" varchar(255),
	"category" varchar(100),
	"status" varchar(20) DEFAULT 'pending',
	"ocr_data" jsonb,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_receipts_tenant" ON "receipts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_receipts_tenant_date" ON "receipts" USING btree ("tenant_id","date");