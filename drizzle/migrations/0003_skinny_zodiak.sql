CREATE TABLE "document_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"position" integer DEFAULT 0,
	"product_id" uuid,
	"name" varchar(255) NOT NULL,
	"description" text,
	"quantity" numeric(10, 3) DEFAULT '1',
	"unit" varchar(30) DEFAULT 'Stück',
	"unit_price" numeric(15, 2) DEFAULT '0',
	"vat_rate" numeric(5, 2) DEFAULT '19.00',
	"discount" numeric(15, 2),
	"discount_type" varchar(10),
	"line_total" numeric(15, 2) DEFAULT '0',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"type" varchar(20) NOT NULL,
	"number" varchar(50) NOT NULL,
	"company_id" uuid,
	"contact_person_id" uuid,
	"status" varchar(30) DEFAULT 'draft',
	"issue_date" timestamp with time zone,
	"due_date" timestamp with time zone,
	"valid_until" timestamp with time zone,
	"subtotal" numeric(15, 2) DEFAULT '0',
	"tax_total" numeric(15, 2) DEFAULT '0',
	"total" numeric(15, 2) DEFAULT '0',
	"discount" numeric(15, 2),
	"discount_type" varchar(10),
	"notes" text,
	"payment_terms" varchar(255),
	"customer_name" varchar(255),
	"customer_street" varchar(255),
	"customer_house_number" varchar(20),
	"customer_postal_code" varchar(20),
	"customer_city" varchar(100),
	"customer_country" varchar(2),
	"customer_vat_id" varchar(50),
	"converted_from_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" uuid NOT NULL,
	"module" varchar(50) NOT NULL,
	"can_create" boolean DEFAULT false,
	"can_read" boolean DEFAULT false,
	"can_update" boolean DEFAULT false,
	"can_delete" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(50) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role_id" uuid;--> statement-breakpoint
ALTER TABLE "document_items" ADD CONSTRAINT "document_items_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_items" ADD CONSTRAINT "document_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_items" ADD CONSTRAINT "document_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_contact_person_id_persons_id_fk" FOREIGN KEY ("contact_person_id") REFERENCES "public"."persons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_document_items_document" ON "document_items" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_document_items_tenant_document" ON "document_items" USING btree ("tenant_id","document_id");--> statement-breakpoint
CREATE INDEX "idx_document_items_product" ON "document_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_documents_tenant_type" ON "documents" USING btree ("tenant_id","type");--> statement-breakpoint
CREATE INDEX "idx_documents_tenant_status" ON "documents" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_documents_tenant_company" ON "documents" USING btree ("tenant_id","company_id");--> statement-breakpoint
CREATE INDEX "idx_documents_tenant_number" ON "documents" USING btree ("tenant_id","number");--> statement-breakpoint
CREATE INDEX "idx_documents_tenant_issue_date" ON "documents" USING btree ("tenant_id","issue_date");--> statement-breakpoint
CREATE INDEX "idx_role_permissions_role_id" ON "role_permissions" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "idx_role_permissions_module" ON "role_permissions" USING btree ("role_id","module");--> statement-breakpoint
CREATE INDEX "idx_roles_tenant_id" ON "roles" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_roles_tenant_name" ON "roles" USING btree ("tenant_id","name");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE set null ON UPDATE no action;