# External Integrations

**Analysis Date:** 2026-03-30

## AI Providers

The application has a pluggable AI provider system. Providers are configured per-tenant in the database via `src/lib/services/ai-provider.service.ts` and resolved dynamically in `src/lib/services/ai/ai.service.ts`.

**Google Gemini (Primary/Recommended):**
- Provider: `src/lib/services/ai/gemini.provider.ts`
- API: `https://generativelanguage.googleapis.com/v1beta/models`
- Default model: `gemini-2.5-flash`
- Available models: gemini-2.5-flash, gemini-2.5-flash-lite, gemini-2.5-pro, gemini-3-flash-preview, gemini-3-pro-preview
- Auth env var: `GOOGLE_AI_API_KEY`
- Note: Gemini 2.5 responses contain `thought: true` parts that must be filtered (see `src/lib/services/ai/gemini.provider.ts`)

**OpenAI:**
- Provider: `src/lib/services/ai/openai.provider.ts`
- API: `https://api.openai.com/v1/chat/completions`
- Default model: `gpt-4o-mini`
- Auth env var: `OPENAI_API_KEY`

**OpenRouter:**
- Provider: `src/lib/services/ai/openrouter.provider.ts`
- API: `https://openrouter.ai/api/v1/chat/completions`
- Default model: `openai/gpt-4o-mini`
- Auth: Per-tenant DB config (API key stored in `aiProviders` table)

**Deepseek:**
- Provider: `src/lib/services/ai/deepseek.provider.ts`
- API: `https://api.deepseek.com/v1/chat/completions`
- Default model: `deepseek-chat`
- Auth: Per-tenant DB config

**Kimi (Moonshot):**
- Provider: `src/lib/services/ai/kimi.provider.ts`
- API: `https://api.moonshot.cn/v1/chat/completions`
- Default model: `moonshot-v1-8k`
- Auth: Per-tenant DB config

**Ollama (Local/Self-hosted):**
- Provider: `src/lib/services/ai/ollama.provider.ts`
- API: Configurable base URL (default `http://localhost:11434`)
- Default model: `gemma3`
- Auth env vars: `OLLAMA_BASE_URL`, `OLLAMA_MODEL`
- Only registered if `OLLAMA_BASE_URL` is set

**kie.ai (Image & Video Generation):**
- Provider: `src/lib/services/ai/kie.provider.ts`
- API: `https://api.kie.ai/api/v1`
- Video models: Kling 3.0, Kling Image-to-Video
- Image models: Nano Banana 2, Flux 2, Ghibli AI, GPT-4o Image, Midjourney
- Auth env var: `KIE_API_KEY` (or per-tenant DB config)

**AI Provider Architecture:**
- Static fallback providers registered in `src/lib/services/ai/index.ts` (Gemini, OpenAI, optionally Ollama)
- DB-based providers per tenant in `aiProviders` table, managed by `src/lib/services/ai-provider.service.ts`
- AI usage logged to `aiLogs` table with tokens, duration, feature context
- AI prompt templates stored in DB, managed by `src/lib/services/ai-prompt-template.service.ts`

## AI-Powered Feature Services

These services use the AI provider system for domain-specific tasks:

- `src/lib/services/ai/lead-research.service.ts` - Lead/company/person research
- `src/lib/services/ai/website-scraper.service.ts` - AI-enhanced web scraping
- `src/lib/services/ai/idea-ai.service.ts` - Idea processing/refinement
- `src/lib/services/ai/outreach.service.ts` - Sales outreach generation
- `src/lib/services/ai/document-analysis.service.ts` - Document analysis
- `src/lib/services/ai/blog-ai.service.ts` - Blog content generation
- `src/lib/services/ai/cms-ai.service.ts` - CMS content generation
- `src/lib/services/ai/marketing-ai.service.ts` - Marketing content
- `src/lib/services/ai/social-media-ai.service.ts` - Social media content
- `src/lib/services/ai/business-intelligence-ai.service.ts` - BI analysis
- `src/lib/services/ai/marketing-agent.service.ts` - Marketing automation agent
- `src/lib/services/ai/company-actions.service.ts` - Company action suggestions
- `src/lib/services/ai/image-generation.service.ts` - Image generation
- `src/lib/services/ai/n8n-workflow-builder.service.ts` - n8n workflow generation

## Web Scraping & Search

**Firecrawl:**
- Service: `src/lib/services/firecrawl.service.ts`
- API: `https://api.firecrawl.dev/v1/scrape`
- Purpose: Website scraping with content extraction (markdown output)
- Auth: Per-tenant DB config via `AiProviderService`
- Also: `src/lib/services/firecrawl-research.service.ts` for research workflows

**SerpAPI (Google Maps):**
- Service: `src/lib/services/serpapi.service.ts`
- Purpose: Google Maps business search for lead generation
- Auth env var: `SERPAPI_KEY` (or per-tenant DB config with `providerType: 'serpapi'`)

**Unsplash:**
- Service: `src/lib/services/unsplash.service.ts`
- Purpose: Stock photo search for blog posts
- Auth env var: `UNSPLASH_ACCESS_KEY` (optional, falls back to source.unsplash.com)

## Data Storage

**PostgreSQL:**
- Driver: `postgres` (postgres.js) v3.4.8
- Connection: `src/lib/db/index.ts` - lazy-initialized, pooled (max 20 connections)
- ORM: Drizzle ORM with full schema in `src/lib/db/schema.ts` (2551 lines)
- Connection env var: `DATABASE_URL`
- SSL: Configurable via `DATABASE_SSL` (default: off for Docker)
- Multi-tenant: Most tables have `tenantId` column
- Migrations: `drizzle/migrations/` via `drizzle-kit`
- Seeds: `src/lib/db/seed.ts`, `src/lib/db/seeds/` (DIN, WIBA)

**Redis:**
- Used for session caching in Docker deployment
- Image: `redis:7-alpine` (`docker-compose.local.yml`)
- Auth env var: `REDIS_URL`, `REDIS_PASSWORD`
- Note: No Redis client code found in `src/` - appears to be used at infrastructure level only, with in-memory fallback

**File Storage:**
- Local filesystem only
- Upload directories: `/app/data/uploads/bi`, `/app/data/uploads/media`
- Env vars: `BI_UPLOAD_DIR`, `MEDIA_UPLOAD_DIR`
- Docker volume: `./data/uploads:/app/data`
- Service: `src/lib/services/media-upload.service.ts`

## Email (SMTP)

**Nodemailer:**
- Service: `src/lib/services/email.service.ts`
- Supports: SMTP and Gmail (via app password)
- Templates: `src/lib/services/email-template.service.ts`
- Newsletter: `src/lib/services/newsletter.service.ts`
- Env vars: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

## Social Media Publishing

**Direct API Integration:**
- Service: `src/lib/services/social-publishing.service.ts`
- Platforms: LinkedIn, Twitter/X, Facebook, Instagram
- Credentials stored as AI providers in DB:
  - LinkedIn: OAuth 2.0 access token + author URN
  - Twitter: OAuth 1.0a (4 keys: apiKey, apiSecret, accessToken, accessTokenSecret)
  - Facebook: Page access token + page ID
  - Instagram: Page access token + IG user ID
- Related services:
  - `src/lib/services/social-media-post.service.ts`
  - `src/lib/services/social-media-topic.service.ts`

## CMS / WordPress

**WordPress REST API:**
- Service: `src/lib/services/wordpress.service.ts`
- Purpose: Publish blog posts to external WordPress sites
- Auth: WordPress application password (Basic auth)
- Per-tenant credentials

**Built-in CMS:**
- Services: `src/lib/services/cms-page.service.ts`, `cms-block.service.ts`, `cms-navigation.service.ts`, `cms-block-template.service.ts`, `cms-block-type.service.ts`

## Workflow Automation

**n8n Integration:**
- Service: `src/lib/services/n8n.service.ts`
- Purpose: Workflow management, execution monitoring
- Connections stored per-tenant in `n8nConnections` table
- Logs stored in `n8nWorkflowLogs` table
- AI workflow builder: `src/lib/services/ai/n8n-workflow-builder.service.ts`

## Webhooks

**Outgoing Webhooks:**
- Service: `src/lib/services/webhook.service.ts`
- Stored in `webhooks` table per tenant
- HMAC signing with secret
- Event-based triggering

## Authentication & Identity

**Custom JWT Auth:**
- Library: `jose` 6.1.3 for JWT operations
- Password hashing: `bcryptjs` 3.0.3
- Auth env var: `JWT_SECRET` (min 32 characters)
- Multi-tenant: Users belong to tenants
- Roles/permissions: `src/lib/services/role.service.ts`, `src/lib/services/user.service.ts`
- API key auth: `src/lib/services/api-key.service.ts`

## Monitoring & Observability

**Logging:**
- Custom logger: `src/lib/utils/logger.ts`
- Console-based logging throughout services

**Health Check:**
- Endpoint: `/api/health` (used in Docker healthcheck)

**AI Usage Logging:**
- All AI requests logged to `aiLogs` table with provider, model, tokens, duration, feature context

**Error Tracking:**
- No external error tracking service (Sentry, etc.) detected

## CI/CD & Deployment

**Hosting:**
- Docker on Hetzner server (195.201.12.250)
- Managed via Portainer (portainer.xkmu.de)

**Domains:**
- `boss.xkmu.de` - Application
- `boss-db.xkmu.de` - pgAdmin
- `n8n.xkmu.de` - n8n workflow automation
- `portainer.xkmu.de` - Container management

**Docker Build:**
- Multi-stage Dockerfile: `docker/app/Dockerfile`
- Base: `node:20-alpine`
- Stages: base -> deps -> builder -> production
- Production entrypoint: DB wait, `drizzle-kit push` (schema sync), seed, then `node server.js`
- Includes `postgresql16-client` for pre-migration backups

**CI Pipeline:**
- No CI/CD pipeline files detected (no GitHub Actions, etc.)
- Version bumps historically done by CI (`[skip ci]` commits visible in git log)

## Environment Configuration

**Required env vars:**
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret (min 32 chars)

**Optional env vars (AI):**
- `GOOGLE_AI_API_KEY` - Gemini API key
- `OPENAI_API_KEY` - OpenAI API key
- `OLLAMA_BASE_URL` - Ollama server URL
- `OLLAMA_MODEL` - Ollama model name
- `KIE_API_KEY` - kie.ai API key
- `SERPAPI_KEY` - SerpAPI key
- `UNSPLASH_ACCESS_KEY` - Unsplash API key

**Optional env vars (Email):**
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

**Optional env vars (Infrastructure):**
- `DATABASE_SSL` - SSL mode (`require` or `false`)
- `REDIS_URL`, `REDIS_PASSWORD` - Redis connection
- `NEXT_PUBLIC_APP_URL` - Public app URL
- `NODE_ENV` - Environment (`development`/`production`)
- `BI_UPLOAD_DIR`, `MEDIA_UPLOAD_DIR` - Upload paths

**Optional env vars (Docker):**
- `DB_PASSWORD` - PostgreSQL password
- `REDIS_PASSWORD` - Redis password
- `APP_PORT` - Application port (default 3000)
- `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` - Initial admin credentials
- `PGADMIN_EMAIL`, `PGADMIN_PASSWORD` - pgAdmin credentials

**Secrets location:**
- `.env` file (gitignored)
- `.env.example` documents all variables
- `.env.docker` for Docker-specific config
- Docker Compose passes env vars to containers

---

*Integration audit: 2026-03-30*
