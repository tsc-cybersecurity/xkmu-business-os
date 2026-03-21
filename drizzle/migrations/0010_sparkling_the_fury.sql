CREATE TABLE "chat_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(255) DEFAULT 'Neuer Chat',
	"provider_id" uuid,
	"model" varchar(100),
	"context" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cockpit_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"system_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"label" varchar(255) NOT NULL,
	"username" varchar(255),
	"password" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cockpit_systems" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"hostname" varchar(500),
	"url" varchar(500),
	"category" varchar(100),
	"function" varchar(255),
	"description" text,
	"ip_address" varchar(45),
	"port" integer,
	"protocol" varchar(20),
	"status" varchar(20) DEFAULT 'active',
	"tags" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "generated_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"prompt" text NOT NULL,
	"revised_prompt" text,
	"provider" varchar(50) NOT NULL,
	"model" varchar(100) NOT NULL,
	"size" varchar(30),
	"style" varchar(30),
	"image_url" text NOT NULL,
	"thumbnail_url" text,
	"mime_type" varchar(50) DEFAULT 'image/png',
	"size_bytes" integer,
	"category" varchar(100),
	"tags" text[] DEFAULT '{}',
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "opportunities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"industry" varchar(255),
	"address" varchar(500),
	"city" varchar(255),
	"postal_code" varchar(20),
	"country" varchar(10) DEFAULT 'DE',
	"phone" varchar(100),
	"email" varchar(255),
	"website" varchar(500),
	"rating" real,
	"review_count" integer,
	"place_id" varchar(255),
	"status" varchar(30) DEFAULT 'new' NOT NULL,
	"source" varchar(50) DEFAULT 'google_maps',
	"search_query" varchar(255),
	"search_location" varchar(255),
	"converted_company_id" uuid,
	"notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "street" varchar(255);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "house_number" varchar(20);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "postal_code" varchar(20);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "city" varchar(255);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "country" varchar(10) DEFAULT 'DE';--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "legal_form" varchar(100);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "managing_director" varchar(255);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "trade_register" varchar(255);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "vat_id" varchar(50);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "tax_number" varchar(50);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "bank_name_1" varchar(255);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "bank_iban_1" varchar(40);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "bank_bic_1" varchar(20);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "bank_name_2" varchar(255);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "bank_iban_2" varchar(40);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "bank_bic_2" varchar(20);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "phone" varchar(100);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "email" varchar(255);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "website" varchar(500);--> statement-breakpoint
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_provider_id_ai_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."ai_providers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_chat_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."chat_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cockpit_credentials" ADD CONSTRAINT "cockpit_credentials_system_id_cockpit_systems_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."cockpit_systems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cockpit_systems" ADD CONSTRAINT "cockpit_systems_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cockpit_systems" ADD CONSTRAINT "cockpit_systems_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_images" ADD CONSTRAINT "generated_images_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_images" ADD CONSTRAINT "generated_images_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_converted_company_id_companies_id_fk" FOREIGN KEY ("converted_company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_chat_conversations_tenant_user" ON "chat_conversations" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_chat_conversations_created" ON "chat_conversations" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_chat_messages_conversation" ON "chat_messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "idx_cockpit_credentials_system" ON "cockpit_credentials" USING btree ("system_id");--> statement-breakpoint
CREATE INDEX "idx_cockpit_systems_tenant" ON "cockpit_systems" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_cockpit_systems_category" ON "cockpit_systems" USING btree ("tenant_id","category");--> statement-breakpoint
CREATE INDEX "idx_cockpit_systems_status" ON "cockpit_systems" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_generated_images_tenant" ON "generated_images" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_generated_images_category" ON "generated_images" USING btree ("tenant_id","category");--> statement-breakpoint
CREATE INDEX "idx_generated_images_created_at" ON "generated_images" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_opportunities_tenant" ON "opportunities" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_opportunities_status" ON "opportunities" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_opportunities_created_at" ON "opportunities" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_opportunities_city" ON "opportunities" USING btree ("tenant_id","city");--> statement-breakpoint
CREATE INDEX "idx_opportunities_place_id" ON "opportunities" USING btree ("tenant_id","place_id");--> statement-breakpoint
CREATE INDEX "idx_activities_type" ON "activities" USING btree ("tenant_id","type");--> statement-breakpoint
CREATE INDEX "idx_companies_created_at" ON "companies" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_leads_company_id" ON "leads" USING btree ("tenant_id","company_id");--> statement-breakpoint
CREATE INDEX "idx_leads_person_id" ON "leads" USING btree ("tenant_id","person_id");--> statement-breakpoint
CREATE INDEX "idx_leads_created_at" ON "leads" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_media_uploads_created_at" ON "media_uploads" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_persons_created_at" ON "persons" USING btree ("tenant_id","created_at");