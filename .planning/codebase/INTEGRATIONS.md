# External Integrations

**Analysis Date:** 2026-04-13

## APIs & External Services

**AI Providers:**
- Google Gemini - Text generation and analysis
  - SDK/Client: None (direct API via fetch)
  - Auth: `GOOGLE_AI_API_KEY` env var (fallback) or database-configured in `aiProviders` table
  - Provider Class: `GeminiProvider` (`src/lib/services/ai/gemini.provider.ts`)

- OpenAI - Text generation, image generation
  - SDK/Client: None (direct API via fetch)
  - Auth: `OPENAI_API_KEY` env var (fallback) or database-configured
  - Provider Classes: `OpenAIProvider` (`src/lib/services/ai/openai.provider.ts`), `ImageGenerationService` (`src/lib/services/ai/image-generation.service.ts`)

- OpenRouter - Multi-model AI access
  - SDK/Client: None (direct API via fetch)
  - Auth: Database-configured `aiProviders` table
  - Provider Class: `OpenRouterProvider` (`src/lib/services/ai/openrouter.provider.ts`)

- Deepseek - LLM provider
  - SDK/Client: None (direct API via fetch)
  - Auth: Database-configured `aiProviders` table
  - Provider Class: `DeepseekProvider` (`src/lib/services/ai/deepseek.provider.ts`)

- Kimi - LLM provider (likely Chinese-region)
  - SDK/Client: None (direct API via fetch)
  - Auth: Database-configured `aiProviders` table
  - Provider Class: `KimiProvider` (`src/lib/services/ai/kimi.provider.ts`)

- Ollama - Local LLM inference
  - SDK/Client: None (direct API via fetch)
  - Auth: None (local service, optionally auth via `OLLAMA_BASE_URL`)
  - Provider Class: `OllamaProvider` (`src/lib/services/ai/ollama.provider.ts`)
  - Config Env: `OLLAMA_BASE_URL` (default: http://localhost:11434)

- Kie.ai - Video generation
  - Provider Class: `KieProvider` (`src/lib/services/ai/kie.provider.ts`, `KieService`)
  - Auth: Database-configured `aiProviders` table
  - Implementation: `src/lib/services/ai/kie.service.ts`

**Search & Research:**
- SerpAPI - Google Maps and business search
  - SDK/Client: None (direct API via fetch)
  - Auth: `SERPAPI_KEY` env var (fallback) or database-configured in `aiProviders` table with type 'serpapi'
  - Service: `SerpApiService` (`src/lib/services/serpapi.service.ts`)
  - Used for: Lead research, opportunity discovery

- Firecrawl - Website scraping/crawling
  - SDK/Client: None (direct API via fetch)
  - Auth: Database-configured in `aiProviders` table with type 'firecrawl'
  - Service: `FirecrawlService` (`src/lib/services/firecrawl.service.ts`)
  - Base URL: `https://api.firecrawl.dev/v1`
  - Used for: Company research, website content extraction

**Image Services:**
- Unsplash - Stock photo search
  - SDK/Client: None (direct API via fetch)
  - Service: `UnsplashService` (`src/lib/services/unsplash.service.ts`)
  - Fallback: source.unsplash.com (deprecated, deprecated in 2023)
  - Used for: Blog post featured image selection

**Workflow Automation:**
- n8n - Configurable workflow/automation platform
  - SDK/Client: None (direct API via fetch)
  - Auth: `X-N8N-API-KEY` header
  - Service: `N8nService` (`src/lib/services/n8n.service.ts`)
  - Database Tables: `n8nConnections`, `n8nWorkflowLogs`
  - Config Stored: `n8nConnections` table (apiUrl, apiKey per tenant)
  - Endpoints:
    - GET/POST `/api/v1/workflows` - List/create workflows
    - GET/PUT/DELETE `/api/v1/workflows/{id}` - Workflow CRUD
    - POST `/api/v1/workflows/{id}/execute` - Run workflow
    - POST `/api/v1/workflows/{id}/activate` - Activate workflow
    - POST `/api/v1/n8n/connection` - Manage n8n connection
  - Timeout: 30 seconds per request

**Publishing & CMS:**
- WordPress REST API - Publish blog posts to external WordPress sites
  - SDK/Client: None (direct API via fetch)
  - Auth: HTTP Basic (username + app password, base64 encoded)
  - Service: `WordPressService` (`src/lib/services/wordpress.service.ts`)
  - Endpoints:
    - POST `/wp-json/wp/v2/posts` - Publish post
    - GET `/wp-json/wp/v2/settings` - Test connection
  - Timeout: 30 seconds

## Data Storage

**Databases:**
- PostgreSQL 16+ (Alpine-based in Docker)
  - Connection: `DATABASE_URL` (required, no default)
  - Client: `postgres` npm package (pure JS, serverless-compatible)
  - ORM: Drizzle ORM with TypeScript schema
  - SSL: Configurable via `DATABASE_SSL` env var (default: false for local/Docker, true recommended for remote)
  - Connection Pool: Max 20 connections, idle timeout 20s, connect timeout 10s
  - Lazy initialization: Database connection only created at runtime, not build time
  - Location: `src/lib/db/index.ts` (connection factory), `src/lib/db/schema.ts` (schema definition)

**File Storage:**
- Local filesystem only
  - Media uploads stored in filesystem (no S3/cloud provider integration)
  - Service: `MediaUploadService` (`src/lib/services/media-upload.service.ts`)
  - Image optimization: `ImageOptimizerService` (`src/lib/services/image-optimizer.service.ts`)

**Caching:**
- Redis (optional, for distributed session caching)
  - Connection: `REDIS_URL` env var (format: redis://[:password@]host:port)
  - Client: `ioredis` npm package
  - Purpose: Session caching (in-memory fallback if not configured)
  - Lazy initialization: Only connects if `REDIS_URL` set
  - Error handling: Fails open (warning logged, continues without Redis)
  - Location: `src/lib/utils/redis-client.ts`

## Authentication & Identity

**Auth Provider:**
- Custom JWT-based authentication
  - Implementation: `src/lib/auth/session.ts`
  - Token Algorithm: HS256 (HMAC SHA-256)
  - Secret: `JWT_SECRET` env var (required, min 32 characters recommended)
  - Session Duration: 7 days
  - Storage: HttpOnly secure cookie named `xkmu_session`
  - Cookie Settings: SameSite=lax, secure in production, httpOnly always

**API Key Authentication:**
- Custom API key scheme with bcryptjs hashing
  - Service: `ApiKeyService` (`src/lib/services/api-key.service.ts`)
  - Hashing: bcryptjs (stored in database, never plaintext)
  - Location: `src/lib/auth/api-key.ts`

**Password Hashing:**
- bcryptjs (salted + rounds: 12 by default)
  - Used for: User passwords, API key storage
  - Location: `src/lib/auth/`, `src/lib/db/seed.ts`

## Monitoring & Observability

**Error Tracking:**
- None detected
- Recommendation: Consider Sentry, LogRocket, or similar

**Logs:**
- Custom logger utility (`src/lib/utils/logger.ts`)
- Strategy: Console logging in development, structured logging recommended for production
- Database: Activity logs stored in `activities` table for audit trail
- Service: `ActivityService` (`src/lib/services/activity.service.ts`)

**Performance Monitoring:**
- None built-in
- CSP (Content Security Policy) headers configured in `next.config.ts` with Report-Only mode for development

## CI/CD & Deployment

**Hosting:**
- Docker-based deployments (primary)
  - Dockerfile: `docker/app/Dockerfile`
  - Compose files: `docker-compose.yml` (dev), `docker-compose.local.yml` (local dev), `docker-compose.prod.yml` (production), `docker-compose.coolify.yml` (Coolify PaaS)
  - Output: Standalone Next.js build (`output: standalone` in next.config.ts)
  - Base Image: Node.js Alpine (inferred from docker/ setup)

**CI Pipeline:**
- None explicitly detected
- Recommendation: GitHub Actions, GitLab CI, or similar

**Database Migrations:**
- Drizzle Kit (schema-first migrations)
  - Commands: `db:generate` (create migration), `db:migrate` (apply), `db:push` (apply without file)
  - Schema Location: `src/lib/db/schema.ts`
  - Migration Output: `drizzle/migrations/`
  - Seed Data: `src/lib/db/seed.ts`, `src/lib/db/seeds/` (DIN/WiBa specific seeds)

## Environment Configuration

**Required env vars:**
- `DATABASE_URL` - PostgreSQL connection string (required)
- `JWT_SECRET` - Session signing key, min 32 characters (required)
- `NEXT_PUBLIC_APP_URL` - Public application URL (recommended: set to domain)
- At least ONE AI provider key: `GOOGLE_AI_API_KEY` OR `OPENAI_API_KEY` (recommended for features)

**Optional env vars:**
- `DATABASE_SSL` - "require" or "false" (default: false for local, true for remote)
- `GOOGLE_AI_API_KEY` - Google Gemini API key
- `OPENAI_API_KEY` - OpenAI API key
- `OLLAMA_BASE_URL` - Ollama local LLM endpoint (default: http://localhost:11434)
- `REDIS_URL` - Redis connection for session caching (falls back to in-memory)
- `REDIS_PASSWORD` - Redis password
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` - Email (Gmail recommended)
- `NODE_ENV` - "development" or "production"
- `DOCKER` - Set to "true" in Docker containers (forces SSL=false)
- `COOLIFY` - Set to "true" in Coolify deployments (forces SSL=false, auto-syncs schema)
- `BACKUP_KEEP` - Number of pre-migration backups to retain (default: 10)
- `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` - Initial admin credentials (optional override)

**Docker-specific env vars:**
- `DB_PASSWORD` - PostgreSQL password for Docker
- `PGADMIN_EMAIL`, `PGADMIN_PASSWORD` - pgAdmin credentials
- `APP_PORT`, `DB_PORT` - Container port mappings (default: 3000, 5432)

**Secrets location:**
- `.env` file (NOT committed, in .gitignore)
- Coolify/Docker environment variables
- Database: Encrypted in `aiProviders` table for API keys

## Webhooks & Callbacks

**Incoming:**
- Webhook management system for custom event handling
  - Table: `webhooks` (includes url, events, secret, isActive)
  - Service: `WebhookService` (`src/lib/services/webhook.service.ts`)
  - Signing: Optional secret for request validation (HMAC-style)
  - Events: Configurable by event type (stored as array in database)

**Outgoing:**
- Webhook dispatching for internal events
  - Triggered by: Activities, document updates, email changes, workflow completions
  - Implementation: Trigger logic in services, webhook sender TBD

**n8n Workflow Callbacks:**
- n8n workflow execution tracking
  - Table: `n8nWorkflowLogs` (stores workflow execution results)
  - Service: `N8nService` logs workflow runs in database

**Email-related Webhooks:**
- IMAP sync completion tracking
  - Service: `EmailImapService` (`src/lib/services/email-imap.service.ts`)
  - Triggers on: Email account sync completion

---

*Integration audit: 2026-04-13*
