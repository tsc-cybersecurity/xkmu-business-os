BEGIN;
ALTER TABLE cms_pages DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE cms_blocks DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE cms_block_templates DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE cms_navigation_items DROP COLUMN IF EXISTS tenant_id;

-- Recreate indexes without tenant_id
DROP INDEX IF EXISTS idx_cms_pages_tenant_slug;
DROP INDEX IF EXISTS idx_cms_pages_tenant_status;
DROP INDEX IF EXISTS idx_cms_blocks_tenant;
DROP INDEX IF EXISTS idx_cms_block_templates_tenant;
DROP INDEX IF EXISTS idx_cms_block_templates_tenant_type;
DROP INDEX IF EXISTS idx_cms_nav_items_tenant_location_sort;

CREATE INDEX IF NOT EXISTS idx_cms_pages_slug ON cms_pages(slug);
CREATE INDEX IF NOT EXISTS idx_cms_pages_status ON cms_pages(status);
CREATE INDEX IF NOT EXISTS idx_cms_block_templates_type ON cms_block_templates(block_type);
CREATE INDEX IF NOT EXISTS idx_cms_nav_items_location_sort ON cms_navigation_items(location, sort_order);
COMMIT;
