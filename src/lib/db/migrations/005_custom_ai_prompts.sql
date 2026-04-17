-- ============================================================
-- Migration 005: custom_ai_prompts
--
-- User-defined AI prompts, executable per company and callable
-- from workflows. Idempotent.
-- ============================================================

CREATE TABLE IF NOT EXISTS custom_ai_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'custom',
  icon VARCHAR(50) DEFAULT 'Sparkles',
  color VARCHAR(20) DEFAULT 'indigo',
  system_prompt TEXT,
  user_prompt TEXT NOT NULL,
  context_config JSONB DEFAULT '{}'::jsonb,
  activity_type VARCHAR(20) DEFAULT 'note',
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_ai_prompts_active ON custom_ai_prompts(is_active);
CREATE INDEX IF NOT EXISTS idx_custom_ai_prompts_category ON custom_ai_prompts(category);
