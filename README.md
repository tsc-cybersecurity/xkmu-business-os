# xKMU Business OS

Multi-tenant Business Management Platform for SMEs (Small and Medium Enterprises).

## Features

- **CRM Module**: Companies, Persons, Leads management
- **Finance**: Offers, Invoices with PDF generation
- **AI Lab**: Idea processing with AI-powered analysis
- **AI Integration**: Gemini, OpenAI, OpenRouter, Deepseek, Kimi, Ollama, Firecrawl, kie.ai
- **DIN SPEC 27076**: Digitalisierungs-Check for SMEs with PDF report
- **BSI WiBA**: IT security assessment (257 requirements, 19 categories)
- **CMS & Blog**: Block-based CMS with SEO and navigation management
- **Marketing**: Campaign management with AI-generated tasks
- **Social Media**: Content planning, AI-generated posts
- **n8n Integration**: Workflow automation with AI workflow generator
- **Business Intelligence**: Company profiling and document analysis
- **Activity Timeline**: Track all interactions and outreach
- **Webhook Support**: API-first automation
- **Database Admin**: Browser-based database viewer and editor
- **Import/Export**: Full tenant data backup and restore
- **Multi-Tenant**: Secure tenant isolation

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Styling**: Tailwind CSS + shadcn/ui
- **Auth**: JWT-based sessions
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
| `SMTP_*` | Optional | Email configuration |

See `.env.example` for full list.

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run linter
npm run lint

# Database commands
npm run db:generate  # Generate migrations
npm run db:push      # Push schema to database
npm run db:studio    # Open Drizzle Studio
```

## API Documentation

120+ API endpoints under `/api/v1/`. See `docs/APPLICATION_DOCUMENTATION.md` for the full reference.

Key endpoint groups:
- `/api/v1/auth/*` - Authentication (login, logout, session)
- `/api/v1/companies/*`, `/api/v1/persons/*`, `/api/v1/leads/*` - CRM
- `/api/v1/documents/*` - Offers & Invoices
- `/api/v1/din/*` - DIN SPEC 27076 Audits
- `/api/v1/wiba/*` - BSI WiBA Checks
- `/api/v1/blog/*`, `/api/v1/cms/*` - Content Management
- `/api/v1/marketing/*`, `/api/v1/social-media/*` - Marketing
- `/api/v1/n8n/*` - Workflow Automation
- `/api/v1/ai/*` - AI Completion & Research
- `/api/v1/admin/database/*` - Database Administration

API authentication via:
- Session cookie (`xkmu_session`)
- API key header (`X-Api-Key`)

## License

Private - All rights reserved
