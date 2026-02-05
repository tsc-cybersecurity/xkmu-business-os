# xKMU Business OS

Multi-tenant Business Management Platform for SMEs (Small and Medium Enterprises).

## Features

- **CRM Module**: Companies, Persons, Leads management
- **AI Lab**: Idea processing with AI-powered analysis
- **AI Integration**: Gemini, OpenAI (Ollama for local dev)
- **Activity Timeline**: Track all interactions and outreach
- **Webhook Support**: API-first automation
- **Multi-Tenant**: Secure tenant isolation

## Tech Stack

- **Framework**: Next.js 15+ (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Styling**: Tailwind CSS + shadcn/ui
- **Auth**: JWT-based sessions

## Deployment Options

### Option 1: Vercel (Recommended)

1. **Fork/Clone** this repository
2. **Import to Vercel**: [vercel.com/new](https://vercel.com/new)
3. **Add Database**:
   - Go to Storage > Create Database > Postgres
   - Or use [Neon](https://neon.tech) / [Supabase](https://supabase.com)
4. **Configure Environment Variables**:
   ```
   DATABASE_URL=your-postgresql-url
   JWT_SECRET=your-secret-min-32-chars
   GOOGLE_AI_API_KEY=your-gemini-api-key  (optional)
   ```
5. **Run Database Migration** (see below)
6. **Deploy**

### Option 2: Docker (Self-Hosted)

```bash
# Clone repository
git clone https://github.com/tsc-cybersecurity/xkmu-business-os.git
cd xkmu-business-os

# Copy environment file
cp .env.example .env
# Edit .env with your values

# Start with Docker Compose
docker-compose up -d

# Run migrations
docker exec xkmu-app npm run db:push
```

## Database Setup

After deployment, run the database migration:

```bash
# For Vercel/Cloud deployment (run locally with cloud DB URL)
DATABASE_URL="your-cloud-db-url" npm run db:push

# For Docker
docker exec xkmu-app npm run db:push
```

### Seed Initial Data

```bash
# Create initial admin user and tenant
curl -X POST https://your-app.vercel.app/api/v1/ai-prompt-templates/seed
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret for JWT tokens (min 32 chars) |
| `GOOGLE_AI_API_KEY` | Recommended | Gemini API key |
| `OPENAI_API_KEY` | Optional | OpenAI API key |
| `OLLAMA_BASE_URL` | Optional | Local Ollama URL (not for Vercel) |
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

All API endpoints are available under `/api/v1/`:

- `POST /api/v1/auth/login` - Login
- `GET /api/v1/companies` - List companies
- `POST /api/v1/leads` - Create lead
- `POST /api/v1/ideas/[id]/convert` - Convert idea to lead
- `POST /api/v1/ai/completion` - AI completion

API authentication via:
- Session cookie (`xkmu_session`)
- API key header (`X-Api-Key`)

## License

Private - All rights reserved
