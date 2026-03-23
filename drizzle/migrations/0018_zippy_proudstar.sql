CREATE TABLE "newsletter_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"subject" varchar(500),
	"body_html" text,
	"status" varchar(20) DEFAULT 'draft',
	"sent_at" timestamp with time zone,
	"stats" jsonb DEFAULT '{}'::jsonb,
	"segment_tags" text[] DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "newsletter_subscribers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255),
	"tags" text[] DEFAULT '{}',
	"status" varchar(20) DEFAULT 'active',
	"subscribed_at" timestamp with time zone DEFAULT now(),
	"unsubscribed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "newsletter_campaigns" ADD CONSTRAINT "newsletter_campaigns_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_subscribers" ADD CONSTRAINT "newsletter_subscribers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_newsletter_campaigns_tenant" ON "newsletter_campaigns" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_newsletter_subs_tenant" ON "newsletter_subscribers" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_newsletter_subs_tenant_email" ON "newsletter_subscribers" USING btree ("tenant_id","email");