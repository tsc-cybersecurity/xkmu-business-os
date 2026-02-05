CREATE TABLE "ai_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"provider_id" uuid,
	"user_id" uuid,
	"provider_type" varchar(30) NOT NULL,
	"model" varchar(100) NOT NULL,
	"prompt" text NOT NULL,
	"response" text,
	"status" varchar(20) DEFAULT 'success' NOT NULL,
	"error_message" text,
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"total_tokens" integer,
	"duration_ms" integer,
	"feature" varchar(50),
	"entity_type" varchar(50),
	"entity_id" uuid,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_prompt_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"slug" varchar(100) NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"system_prompt" text NOT NULL,
	"user_prompt" text NOT NULL,
	"output_format" text,
	"is_active" boolean DEFAULT true,
	"is_default" boolean DEFAULT false,
	"version" integer DEFAULT 1,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"provider_type" varchar(30) NOT NULL,
	"name" varchar(100) NOT NULL,
	"api_key" text,
	"base_url" varchar(500),
	"model" varchar(100) NOT NULL,
	"max_tokens" integer DEFAULT 1000,
	"temperature" numeric(3, 2) DEFAULT '0.70',
	"priority" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid,
	"name" varchar(100) NOT NULL,
	"key_hash" varchar(255) NOT NULL,
	"key_prefix" varchar(10) NOT NULL,
	"permissions" jsonb DEFAULT '["read","write"]'::jsonb,
	"last_used_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" varchar(30) NOT NULL,
	"old_values" jsonb,
	"new_values" jsonb,
	"ip_address" "inet",
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"legal_form" varchar(50),
	"street" varchar(255),
	"house_number" varchar(20),
	"postal_code" varchar(20),
	"city" varchar(100),
	"country" varchar(2) DEFAULT 'DE',
	"phone" varchar(50),
	"email" varchar(255),
	"website" varchar(255),
	"industry" varchar(100),
	"employee_count" integer,
	"annual_revenue" numeric(15, 2),
	"vat_id" varchar(50),
	"status" varchar(30) DEFAULT 'prospect',
	"tags" text[] DEFAULT '{}',
	"notes" text,
	"custom_fields" jsonb DEFAULT '{}'::jsonb,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"company_id" uuid,
	"person_id" uuid,
	"source" varchar(50) NOT NULL,
	"source_detail" varchar(255),
	"status" varchar(30) DEFAULT 'new',
	"score" integer DEFAULT 0,
	"ai_research_status" varchar(30) DEFAULT 'pending',
	"ai_research_result" jsonb,
	"assigned_to" uuid,
	"raw_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "persons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"company_id" uuid,
	"salutation" varchar(20),
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"email" varchar(255),
	"phone" varchar(50),
	"mobile" varchar(50),
	"job_title" varchar(100),
	"department" varchar(100),
	"street" varchar(255),
	"house_number" varchar(20),
	"postal_code" varchar(20),
	"city" varchar(100),
	"country" varchar(2) DEFAULT 'DE',
	"status" varchar(30) DEFAULT 'active',
	"is_primary_contact" boolean DEFAULT false,
	"tags" text[] DEFAULT '{}',
	"notes" text,
	"custom_fields" jsonb DEFAULT '{}'::jsonb,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100),
	"description" text,
	"parent_id" uuid,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"type" varchar(20) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"sku" varchar(50),
	"category_id" uuid,
	"price_net" numeric(15, 2),
	"vat_rate" numeric(5, 2) DEFAULT '19.00',
	"unit" varchar(30) DEFAULT 'Stück',
	"status" varchar(20) DEFAULT 'active',
	"tags" text[] DEFAULT '{}',
	"notes" text,
	"custom_fields" jsonb DEFAULT '{}'::jsonb,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"status" varchar(20) DEFAULT 'active',
	"trial_ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"role" varchar(50) DEFAULT 'member',
	"status" varchar(20) DEFAULT 'active',
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "ai_logs" ADD CONSTRAINT "ai_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_logs" ADD CONSTRAINT "ai_logs_provider_id_ai_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."ai_providers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_logs" ADD CONSTRAINT "ai_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_prompt_templates" ADD CONSTRAINT "ai_prompt_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_providers" ADD CONSTRAINT "ai_providers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persons" ADD CONSTRAINT "persons_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persons" ADD CONSTRAINT "persons_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persons" ADD CONSTRAINT "persons_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_ai_logs_tenant_id" ON "ai_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_ai_logs_provider" ON "ai_logs" USING btree ("tenant_id","provider_type");--> statement-breakpoint
CREATE INDEX "idx_ai_logs_status" ON "ai_logs" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_ai_logs_feature" ON "ai_logs" USING btree ("tenant_id","feature");--> statement-breakpoint
CREATE INDEX "idx_ai_logs_created_at" ON "ai_logs" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_ai_prompt_templates_tenant_slug" ON "ai_prompt_templates" USING btree ("tenant_id","slug");--> statement-breakpoint
CREATE INDEX "idx_ai_prompt_templates_tenant_active" ON "ai_prompt_templates" USING btree ("tenant_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_ai_providers_tenant_id" ON "ai_providers" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_ai_providers_active" ON "ai_providers" USING btree ("tenant_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_ai_providers_priority" ON "ai_providers" USING btree ("tenant_id","priority");--> statement-breakpoint
CREATE INDEX "idx_api_keys_tenant_id" ON "api_keys" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_api_keys_key_prefix" ON "api_keys" USING btree ("key_prefix");--> statement-breakpoint
CREATE INDEX "idx_audit_log_tenant_id" ON "audit_log" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_audit_log_entity" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_audit_log_created_at" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_companies_tenant_id" ON "companies" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_companies_status" ON "companies" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_companies_name" ON "companies" USING btree ("tenant_id","name");--> statement-breakpoint
CREATE INDEX "idx_leads_tenant_id" ON "leads" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_leads_status" ON "leads" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_leads_ai_status" ON "leads" USING btree ("tenant_id","ai_research_status");--> statement-breakpoint
CREATE INDEX "idx_leads_assigned_to" ON "leads" USING btree ("tenant_id","assigned_to");--> statement-breakpoint
CREATE INDEX "idx_persons_tenant_id" ON "persons" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_persons_company_id" ON "persons" USING btree ("tenant_id","company_id");--> statement-breakpoint
CREATE INDEX "idx_persons_email" ON "persons" USING btree ("tenant_id","email");--> statement-breakpoint
CREATE INDEX "idx_persons_name" ON "persons" USING btree ("tenant_id","last_name","first_name");--> statement-breakpoint
CREATE INDEX "idx_product_categories_tenant_id" ON "product_categories" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_product_categories_slug" ON "product_categories" USING btree ("tenant_id","slug");--> statement-breakpoint
CREATE INDEX "idx_product_categories_parent_id" ON "product_categories" USING btree ("tenant_id","parent_id");--> statement-breakpoint
CREATE INDEX "idx_products_tenant_id" ON "products" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_products_type" ON "products" USING btree ("tenant_id","type");--> statement-breakpoint
CREATE INDEX "idx_products_status" ON "products" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_products_category_id" ON "products" USING btree ("tenant_id","category_id");--> statement-breakpoint
CREATE INDEX "idx_products_sku" ON "products" USING btree ("tenant_id","sku");--> statement-breakpoint
CREATE INDEX "idx_products_name" ON "products" USING btree ("tenant_id","name");--> statement-breakpoint
CREATE INDEX "idx_tenants_slug" ON "tenants" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_tenants_status" ON "tenants" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_users_tenant_id" ON "users" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_users_role" ON "users" USING btree ("tenant_id","role");