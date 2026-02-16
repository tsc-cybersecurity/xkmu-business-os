CREATE TABLE "business_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"filename" varchar(255) NOT NULL,
	"original_name" varchar(255) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"size_bytes" integer NOT NULL,
	"extracted_text" text,
	"extraction_status" varchar(20) DEFAULT 'pending',
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "business_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"company_name" varchar(255),
	"industry" varchar(100),
	"business_model" text,
	"swot_analysis" jsonb,
	"market_analysis" text,
	"financial_summary" text,
	"key_metrics" jsonb,
	"recommendations" text,
	"raw_analysis" text,
	"analyzed_document_ids" text[] DEFAULT '{}',
	"last_analyzed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cms_block_type_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"icon" varchar(50),
	"category" varchar(50),
	"fields" jsonb DEFAULT '[]'::jsonb,
	"default_content" jsonb DEFAULT '{}'::jsonb,
	"default_settings" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "cms_block_type_definitions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "cms_navigation_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"location" varchar(20) NOT NULL,
	"label" varchar(100) NOT NULL,
	"href" varchar(500) NOT NULL,
	"page_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"open_in_new_tab" boolean DEFAULT false,
	"is_visible" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "marketing_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"type" varchar(30) NOT NULL,
	"status" varchar(20) DEFAULT 'draft',
	"target_audience" text,
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "marketing_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"type" varchar(20) NOT NULL,
	"recipient_email" varchar(255),
	"recipient_name" varchar(255),
	"recipient_company" varchar(255),
	"person_id" uuid,
	"company_id" uuid,
	"subject" varchar(255),
	"content" text,
	"scheduled_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"status" varchar(20) DEFAULT 'draft',
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "marketing_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(20) NOT NULL,
	"subject" varchar(255),
	"content" text NOT NULL,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "social_media_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"topic_id" uuid,
	"platform" varchar(30) NOT NULL,
	"title" varchar(255),
	"content" text NOT NULL,
	"hashtags" text[] DEFAULT '{}',
	"image_url" varchar(500),
	"scheduled_at" timestamp with time zone,
	"posted_at" timestamp with time zone,
	"status" varchar(20) DEFAULT 'draft',
	"ai_generated" boolean DEFAULT false,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "social_media_topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"color" varchar(7) DEFAULT '#3b82f6',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "cms_pages" ADD COLUMN "published_blocks" jsonb;--> statement-breakpoint
ALTER TABLE "cms_pages" ADD COLUMN "published_title" varchar(255);--> statement-breakpoint
ALTER TABLE "cms_pages" ADD COLUMN "published_seo_title" varchar(70);--> statement-breakpoint
ALTER TABLE "cms_pages" ADD COLUMN "published_seo_description" varchar(160);--> statement-breakpoint
ALTER TABLE "cms_pages" ADD COLUMN "published_seo_keywords" varchar(255);--> statement-breakpoint
ALTER TABLE "cms_pages" ADD COLUMN "has_draft_changes" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "business_documents" ADD CONSTRAINT "business_documents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_documents" ADD CONSTRAINT "business_documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_navigation_items" ADD CONSTRAINT "cms_navigation_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_navigation_items" ADD CONSTRAINT "cms_navigation_items_page_id_cms_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."cms_pages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_campaigns" ADD CONSTRAINT "marketing_campaigns_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_campaigns" ADD CONSTRAINT "marketing_campaigns_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_tasks" ADD CONSTRAINT "marketing_tasks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_tasks" ADD CONSTRAINT "marketing_tasks_campaign_id_marketing_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."marketing_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_tasks" ADD CONSTRAINT "marketing_tasks_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_tasks" ADD CONSTRAINT "marketing_tasks_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_templates" ADD CONSTRAINT "marketing_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_media_posts" ADD CONSTRAINT "social_media_posts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_media_posts" ADD CONSTRAINT "social_media_posts_topic_id_social_media_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."social_media_topics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_media_posts" ADD CONSTRAINT "social_media_posts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_media_topics" ADD CONSTRAINT "social_media_topics_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_business_documents_tenant" ON "business_documents" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_business_documents_status" ON "business_documents" USING btree ("tenant_id","extraction_status");--> statement-breakpoint
CREATE INDEX "idx_business_profiles_tenant" ON "business_profiles" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_cms_block_type_defs_slug" ON "cms_block_type_definitions" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_cms_block_type_defs_active" ON "cms_block_type_definitions" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_cms_nav_items_tenant_location_sort" ON "cms_navigation_items" USING btree ("tenant_id","location","sort_order");--> statement-breakpoint
CREATE INDEX "idx_marketing_campaigns_tenant" ON "marketing_campaigns" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_marketing_campaigns_status" ON "marketing_campaigns" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_marketing_campaigns_type" ON "marketing_campaigns" USING btree ("tenant_id","type");--> statement-breakpoint
CREATE INDEX "idx_marketing_tasks_tenant" ON "marketing_tasks" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_marketing_tasks_campaign" ON "marketing_tasks" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "idx_marketing_tasks_status" ON "marketing_tasks" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_marketing_tasks_scheduled" ON "marketing_tasks" USING btree ("tenant_id","scheduled_at");--> statement-breakpoint
CREATE INDEX "idx_marketing_templates_tenant" ON "marketing_templates" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_marketing_templates_type" ON "marketing_templates" USING btree ("tenant_id","type");--> statement-breakpoint
CREATE INDEX "idx_social_media_posts_tenant" ON "social_media_posts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_social_media_posts_platform" ON "social_media_posts" USING btree ("tenant_id","platform");--> statement-breakpoint
CREATE INDEX "idx_social_media_posts_status" ON "social_media_posts" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_social_media_posts_scheduled" ON "social_media_posts" USING btree ("tenant_id","scheduled_at");--> statement-breakpoint
CREATE INDEX "idx_social_media_posts_topic" ON "social_media_posts" USING btree ("tenant_id","topic_id");--> statement-breakpoint
CREATE INDEX "idx_social_media_topics_tenant" ON "social_media_topics" USING btree ("tenant_id");