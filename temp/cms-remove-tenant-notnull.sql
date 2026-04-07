BEGIN;

ALTER TABLE cms_pages ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE cms_blocks ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE cms_block_templates ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE cms_navigation_items ALTER COLUMN tenant_id DROP NOT NULL;

COMMIT;
