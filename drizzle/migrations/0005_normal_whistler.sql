CREATE TABLE "blog_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"excerpt" text,
	"content" text,
	"featured_image" varchar(500),
	"featured_image_alt" varchar(255),
	"seo_title" varchar(70),
	"seo_description" varchar(160),
	"seo_keywords" varchar(255),
	"tags" text[] DEFAULT '{}',
	"category" varchar(100),
	"status" varchar(20) DEFAULT 'draft',
	"published_at" timestamp with time zone,
	"source" varchar(20) DEFAULT 'manual',
	"ai_metadata" jsonb,
	"author_id" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cms_block_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"block_type" varchar(50) NOT NULL,
	"content" jsonb DEFAULT '{}'::jsonb,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"is_system" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cms_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"block_type" varchar(50) NOT NULL,
	"sort_order" integer DEFAULT 0,
	"content" jsonb DEFAULT '{}'::jsonb,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"is_visible" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cms_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"slug" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"seo_title" varchar(70),
	"seo_description" varchar(160),
	"seo_keywords" varchar(255),
	"og_image" varchar(500),
	"status" varchar(20) DEFAULT 'draft',
	"published_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "din_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"requirement_id" integer NOT NULL,
	"status" varchar(20) NOT NULL,
	"justification" text,
	"answered_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "din_audit_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"client_company_id" uuid,
	"consultant_id" uuid,
	"reviewer_id" uuid,
	"status" varchar(20) DEFAULT 'draft',
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "din_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"purpose" text,
	"url" varchar(500),
	"region" varchar(100) NOT NULL,
	"min_employees" integer,
	"max_employees" integer
);
--> statement-breakpoint
CREATE TABLE "din_requirements" (
	"id" integer PRIMARY KEY NOT NULL,
	"number" varchar(10) NOT NULL,
	"group_number" varchar(10),
	"component_number" integer,
	"type" varchar(10) NOT NULL,
	"topic_area" integer NOT NULL,
	"official_anforderung_text" text NOT NULL,
	"question_text" text NOT NULL,
	"recommendation_text" text,
	"is_status_question" boolean DEFAULT false,
	"depends_on" integer,
	"points" integer
);
--> statement-breakpoint
CREATE TABLE "media_uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"filename" varchar(255) NOT NULL,
	"original_name" varchar(255) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"size_bytes" integer NOT NULL,
	"path" varchar(500) NOT NULL,
	"alt" varchar(255),
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_block_templates" ADD CONSTRAINT "cms_block_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_blocks" ADD CONSTRAINT "cms_blocks_page_id_cms_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."cms_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_blocks" ADD CONSTRAINT "cms_blocks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_pages" ADD CONSTRAINT "cms_pages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_pages" ADD CONSTRAINT "cms_pages_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "din_answers" ADD CONSTRAINT "din_answers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "din_answers" ADD CONSTRAINT "din_answers_session_id_din_audit_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."din_audit_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "din_answers" ADD CONSTRAINT "din_answers_requirement_id_din_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."din_requirements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "din_audit_sessions" ADD CONSTRAINT "din_audit_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "din_audit_sessions" ADD CONSTRAINT "din_audit_sessions_client_company_id_companies_id_fk" FOREIGN KEY ("client_company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "din_audit_sessions" ADD CONSTRAINT "din_audit_sessions_consultant_id_users_id_fk" FOREIGN KEY ("consultant_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "din_audit_sessions" ADD CONSTRAINT "din_audit_sessions_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_uploads" ADD CONSTRAINT "media_uploads_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_uploads" ADD CONSTRAINT "media_uploads_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_blog_posts_tenant_slug" ON "blog_posts" USING btree ("tenant_id","slug");--> statement-breakpoint
CREATE INDEX "idx_blog_posts_tenant_status" ON "blog_posts" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_blog_posts_tenant_published" ON "blog_posts" USING btree ("tenant_id","published_at");--> statement-breakpoint
CREATE INDEX "idx_blog_posts_tenant_category" ON "blog_posts" USING btree ("tenant_id","category");--> statement-breakpoint
CREATE INDEX "idx_cms_block_templates_tenant" ON "cms_block_templates" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_cms_block_templates_tenant_type" ON "cms_block_templates" USING btree ("tenant_id","block_type");--> statement-breakpoint
CREATE INDEX "idx_cms_blocks_page_sort" ON "cms_blocks" USING btree ("page_id","sort_order");--> statement-breakpoint
CREATE INDEX "idx_cms_blocks_tenant" ON "cms_blocks" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_cms_pages_tenant_slug" ON "cms_pages" USING btree ("tenant_id","slug");--> statement-breakpoint
CREATE INDEX "idx_cms_pages_tenant_status" ON "cms_pages" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_din_answers_session" ON "din_answers" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_din_answers_tenant_session" ON "din_answers" USING btree ("tenant_id","session_id");--> statement-breakpoint
CREATE INDEX "idx_din_audit_sessions_tenant" ON "din_audit_sessions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_din_audit_sessions_status" ON "din_audit_sessions" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_din_audit_sessions_client" ON "din_audit_sessions" USING btree ("tenant_id","client_company_id");--> statement-breakpoint
CREATE INDEX "idx_din_grants_region" ON "din_grants" USING btree ("region");--> statement-breakpoint
CREATE INDEX "idx_media_uploads_tenant" ON "media_uploads" USING btree ("tenant_id");