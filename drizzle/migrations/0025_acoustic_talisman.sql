CREATE TABLE "grundschutz_control_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_control_id" varchar(30) NOT NULL,
	"target_control_id" varchar(30) NOT NULL,
	"rel" varchar(20) NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_grundschutz_links_source" ON "grundschutz_control_links" USING btree ("source_control_id");--> statement-breakpoint
CREATE INDEX "idx_grundschutz_links_target" ON "grundschutz_control_links" USING btree ("target_control_id");