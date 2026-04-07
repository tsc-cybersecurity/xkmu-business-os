BEGIN;

-- CMS tables
ALTER TABLE cms_pages DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE cms_blocks DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE cms_block_templates DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE cms_navigation_items DROP COLUMN IF EXISTS tenant_id;

-- Blog table
ALTER TABLE blog_posts DROP COLUMN IF EXISTS tenant_id;

-- Drop old tenant-prefixed indexes
DROP INDEX IF EXISTS idx_cms_pages_tenant_slug;
DROP INDEX IF EXISTS idx_cms_pages_tenant_status;
DROP INDEX IF EXISTS idx_cms_blocks_tenant;
DROP INDEX IF EXISTS idx_cms_block_templates_tenant;
DROP INDEX IF EXISTS idx_cms_block_templates_tenant_type;
DROP INDEX IF EXISTS idx_cms_nav_items_tenant_location_sort;
DROP INDEX IF EXISTS idx_blog_posts_tenant_slug;
DROP INDEX IF EXISTS idx_blog_posts_tenant_status;
DROP INDEX IF EXISTS idx_blog_posts_tenant_published;
DROP INDEX IF EXISTS idx_blog_posts_tenant_category;

-- Create new indexes
CREATE INDEX IF NOT EXISTS idx_cms_pages_slug ON cms_pages(slug);
CREATE INDEX IF NOT EXISTS idx_cms_pages_status ON cms_pages(status);
CREATE INDEX IF NOT EXISTS idx_cms_block_templates_type ON cms_block_templates(block_type);
CREATE INDEX IF NOT EXISTS idx_cms_nav_items_location_sort ON cms_navigation_items(location, sort_order);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(published_at);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category);

COMMIT;
