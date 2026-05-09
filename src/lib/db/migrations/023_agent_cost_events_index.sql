-- =============================================
-- 023: Agent-System Phase 8 — Performance-Index
-- =============================================
-- B-Tree-Index auf occurred_at descending fuer "last 7/30 days"-Aggregat-Queries.

CREATE INDEX IF NOT EXISTS idx_agent_cost_events_occurred_desc
  ON agent_cost_events (occurred_at DESC);
