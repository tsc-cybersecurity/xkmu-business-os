# xKMU Business OS

Multi-tenant Business Management Platform for SMEs (Small and Medium Enterprises).

## Features

### CRM & Contact Management
- **Companies** - Full company management with legal info, banking details, AI-powered research
- **Persons** - Contact management with job titles, departments, addresses
- **Leads** - Lead pipeline with scoring, source tracking, AI research & qualification
- **Opportunities** - Sales opportunity pipeline management
- **Activities** - Timeline tracking of all interactions and outreach

### Finance & Invoicing
- **Invoices** - Invoice generation with PDF export, status tracking (draft/sent/paid/overdue)
- **Offers / Quotes** - Offer management with PDF generation and status workflow
- **Time Entries** - Time tracking with invoicing capability
- **Receipts** - Receipt management and tracking
- **Document Templates** - Reusable templates for invoices and offers

### Products & Services
- **Product Catalog** - Comprehensive product and service management
- **Product Categories** - Hierarchical category organization
- **Public Catalog** - Customer-facing product/service display

### Cybersecurity & Compliance
- **DIN SPEC 27076** - Digitalisierungs-Check for SMEs with PDF report and grant tracking (Foerdermittel)
- **BSI WiBA** - IT security assessment (257 requirements, 19 categories)
- **BSI Grundschutz++** - BSI Grundschutz Plus implementation with asset management and security controls
- **IR Playbook** - Incident response playbook management

### AI-Powered Features
- **AI Chat** - Integrated KI-Chatbot for internal use
- **Business Intelligence** - Company profiling, document analysis, research automation
- **Lead Research** - AI-powered lead enrichment and qualification scoring
- **Company Research** - Automated company intelligence gathering
- **AI Marketing Agent** - Autonomous agent for marketing task generation
- **AI Workflow Generator** - Auto-generate n8n workflows using AI
- **Image Generation** - AI-powered image generation with multiple providers
- **AI Integration** - Gemini, OpenAI, OpenRouter, Deepseek, Kimi, Ollama, Firecrawl, kie.ai

### Content & Marketing
- **CMS** - Block-based page builder with drag-and-drop, templates, and navigation management
- **Blog** - IT-News blog with SEO optimization and scheduled publishing
- **Marketing Campaigns** - Campaign planning with AI-generated task automation
- **Social Media** - Content calendar, post scheduling, AI content generation for multiple platforms
- **Newsletter** - Email newsletter campaigns with subscriber management
- **Marketing Templates** - Reusable campaign templates

### Business Operations
- **Cockpit** - Business dashboard and KPI monitoring with system integrations
- **Projects** - Project management and tracking
- **Processes** - Business process documentation and workflow management
- **Ideas** - Idea management with backlog and conversion tracking

### Automation & Integration
- **n8n Workflows** - Workflow automation with AI-powered workflow builder
- **Webhooks** - API-first automation with custom webhook support
- **Task Queue** - Asynchronous task processing with Redis-backed handlers
- **WordPress Integration** - Blog publishing to WordPress

### Administration
- **User Management** - Multi-user support with role-based access
- **Roles & Permissions** - Fine-grained CRUD permissions per module (6 default roles: Owner, Admin, Member, Viewer, IT-Auditor, Designer)
- **Settings & Configuration** - Tenant settings, email templates, API key management
- **Database Admin** - Browser-based database viewer and editor
- **Import / Export** - Full tenant data backup and restore
- **Multi-Tenant** - Secure tenant isolation at database level
- **Notifications** - In-app notification system

## Tech Stack

- **Framework**: Next.js 16 (App Router, React 19)
- **Language**: TypeScript
- **Database**: PostgreSQL with Drizzle ORM (65 tables)
- **Caching**: Redis (ioredis)
- **Styling**: Tailwind CSS 4 + shadcn/ui + Radix UI
- **Auth**: JWT-based sessions (jose + bcryptjs)
- **PDF**: jsPDF + jsPDF-AutoTable
- **Excel**: ExcelJS
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod validation
- **Email**: Nodemailer
- **Testing**: Vitest
- **Deployment**: Docker

## Deployment

### Option 1: Docker Local

```bash
# Clone repository
git clone https://github.com/tsc-cybersecurity/xkmu-business-os.git
cd xkmu-business-os

# Start with Docker Compose (includes PostgreSQL + Redis)
docker compose -f docker-compose.local.yml up -d --build

# Default Login: admin@example.com / admin123
```

### Option 2: Docker (Production with Portainer)

```bash
# Clone repository
git clone https://github.com/tsc-cybersecurity/xkmu-business-os.git
cd xkmu-business-os

# Copy environment file
cp .env.example .env
# Edit .env with your values

# Start with Docker Compose
docker compose -f docker-compose.prod.yml up -d

# Run migrations
docker exec xkmu-app npm run db:push
```

### Reverse-Proxy / Coolify

Wenn die App hinter einem NGINX-Reverse-Proxy (z. B. Coolify) läuft, muss das
Body-Limit für Onlinekurs-Video-Uploads erhöht werden — sonst bricht jeder
Upload > 1 MB mit `413 Request Entity Too Large` ab, bevor er Next.js erreicht:

```nginx
client_max_body_size 2200m;
```

Next.js selbst ist bereits in `next.config.ts` auf `2200mb` konfiguriert
(`experimental.serverActions.bodySizeLimit`).

Ablage-Verzeichnis für Course-Assets ist standardmäßig
`public/uploads/courses/` und kann via `COURSE_ASSET_DIR` env überschrieben
werden (sinnvoll für Persistent-Volumes außerhalb des Containers).

### Terminbuchung / Google Calendar

Konfiguration läuft komplett über die App — keine Env-Variablen nötig.

**Setup:**

1. In [Google Cloud Console](https://console.cloud.google.com/) Projekt anlegen, **Google Calendar API** aktivieren, OAuth-Consent-Screen konfigurieren (Scope: `https://www.googleapis.com/auth/calendar`).
2. OAuth-Client-ID erstellen (Web Application). Authorized redirect URI: `https://<deine-domain>/api/google-calendar/oauth/callback`.
3. JSON mit den Credentials herunterladen.
4. In der App: `/intern/settings/integrations/google-calendar` öffnen → JSON in das Import-Feld einfügen → „Werte übernehmen" → „Konfiguration speichern".
5. Im Profil (`/intern/settings/profile`) → Karte „Google Kalender" → „Mit Google verbinden".

**Crypto-Material:** AES-256-GCM-Schlüssel und HMAC-Secret werden bei der ersten DB-Initialisierung automatisch generiert (Migration `0040_google_calendar_config.sql`). Sie liegen in der DB und werden nicht über die UI rotiert.

**In Phase 1 implementiert:** OAuth-Flow, DB-basierte Konfiguration, Token-Verschlüsselung, Kalender-Liste, Primär-Kalender, „belegt"-Toggle, Disconnect.
**Noch nicht in Phase 1:** Buchung, Slot-Typen, Sync-Webhook, Mails — siehe Folge-Phasen.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret for JWT tokens (min 32 chars) |
| `REDIS_URL` | Recommended | Redis connection URL |
| `GOOGLE_AI_API_KEY` | Recommended | Gemini API key |
| `OPENAI_API_KEY` | Optional | OpenAI API key |
| `OPENROUTER_API_KEY` | Optional | OpenRouter API key |
| `DEEPSEEK_API_KEY` | Optional | Deepseek API key |
| `OLLAMA_BASE_URL` | Optional | Ollama URL |
| `FIRECRAWL_API_KEY` | Optional | Firecrawl web scraping API key |
| `SERPAPI_API_KEY` | Optional | SerpAPI for web research |
| `UNSPLASH_ACCESS_KEY` | Optional | Unsplash stock photos |
| `SMTP_*` | Optional | Email configuration |
| `COURSE_ASSET_DIR` | Optional | Verzeichnis für Onlinekurs-Asset-Uploads (default: `public/uploads/courses`) |

See `.env.example` for full list.

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run linter
npm run lint

# Run tests
npm run test

# Database commands
npm run db:generate  # Generate migrations
npm run db:push      # Push schema to database
npm run db:studio    # Open Drizzle Studio
```

## API Documentation

120+ API endpoints under `/api/v1/`. See `docs/APPLICATION_DOCUMENTATION.md` for the full reference.

Key endpoint groups:
- `/api/v1/auth/*` - Authentication (login, logout, session, permissions)
- `/api/v1/companies/*`, `/api/v1/persons/*`, `/api/v1/leads/*` - CRM
- `/api/v1/opportunities/*` - Sales Pipeline
- `/api/v1/documents/*` - Offers & Invoices
- `/api/v1/products/*`, `/api/v1/product-categories/*` - Product Catalog
- `/api/v1/time-entries/*`, `/api/v1/receipts/*` - Finance
- `/api/v1/din-audit/*` - DIN SPEC 27076 Audits
- `/api/v1/wiba/*` - BSI WiBA Checks
- `/api/v1/grundschutz/*` - BSI Grundschutz++
- `/api/v1/ir-playbook/*` - Incident Response
- `/api/v1/blog/*`, `/api/v1/cms/*` - Content Management
- `/api/v1/marketing/*`, `/api/v1/social-media/*` - Marketing
- `/api/v1/newsletter/*` - Newsletter Campaigns
- `/api/v1/n8n/*` - Workflow Automation
- `/api/v1/ai/*` - AI Completion & Research
- `/api/v1/users/*`, `/api/v1/roles/*` - User & Role Management
- `/api/v1/admin/database/*` - Database Administration
- `/api/v1/webhooks/*`, `/api/v1/api-keys/*` - Integration & API Keys

API authentication via:
- Session cookie (`xkmu_session`)
- API key header (`X-Api-Key`)

## License

Private - All rights reserved
