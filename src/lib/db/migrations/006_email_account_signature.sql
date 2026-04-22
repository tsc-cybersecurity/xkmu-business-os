-- ============================================================
-- Migration 006: email_accounts.signature
--
-- Adds optional HTML signature column that gets appended to every
-- email sent from the account (idempotent).
-- ============================================================

ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS signature TEXT;
