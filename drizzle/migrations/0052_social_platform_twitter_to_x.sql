-- Phase 2B: rename platform 'twitter' → 'x' in social_media_posts
UPDATE social_media_posts SET platform = 'x' WHERE platform = 'twitter';
