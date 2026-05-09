-- Extensions für Agent-Memory-System
-- Manuell ausführen vor `pnpm db:push` für Phase 1

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Verifikation
SELECT extname, extversion FROM pg_extension
WHERE extname IN ('vector', 'pg_trgm');
