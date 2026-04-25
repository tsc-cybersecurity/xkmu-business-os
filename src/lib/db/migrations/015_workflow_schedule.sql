-- Migration: 015_workflow_schedule
-- Description: Add schedule column to workflows table for scheduled triggers
-- Created: 2026-04-25

ALTER TABLE workflows ADD COLUMN schedule jsonb;
