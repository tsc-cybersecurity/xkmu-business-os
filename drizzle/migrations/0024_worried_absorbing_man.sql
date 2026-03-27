ALTER TABLE "grundschutz_controls" ADD COLUMN "parent_control_id" varchar(30);--> statement-breakpoint
ALTER TABLE "grundschutz_controls" ADD COLUMN "guidance" text;--> statement-breakpoint
ALTER TABLE "grundschutz_controls" ADD COLUMN "modal_verb" varchar(10);--> statement-breakpoint
ALTER TABLE "grundschutz_controls" ADD COLUMN "action_word" varchar(50);--> statement-breakpoint
ALTER TABLE "grundschutz_controls" ADD COLUMN "result" text;--> statement-breakpoint
ALTER TABLE "grundschutz_controls" ADD COLUMN "result_specification" text;--> statement-breakpoint
CREATE INDEX "idx_grundschutz_controls_modal" ON "grundschutz_controls" USING btree ("modal_verb");