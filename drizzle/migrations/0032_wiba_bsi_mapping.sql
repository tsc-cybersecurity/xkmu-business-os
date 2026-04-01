ALTER TABLE wiba_requirements
  ADD COLUMN IF NOT EXISTS bsi_bausteine TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS bsi_anforderungen TEXT[] DEFAULT '{}';
