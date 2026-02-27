# xKMU Business OS

Multi-tenant Business Management Platform for SMEs (Small and Medium Enterprises).

## Features

- **CRM Module**: Companies, Persons, Leads management
- **AI Lab**: Idea processing with AI-powered analysis
- **AI Integration**: Gemini, OpenAI, OpenRouter, Deepseek, Kimi, Ollama
- **Activity Timeline**: Track all interactions and outreach
- **Webhook Support**: API-first automation
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

### Option 2: Coolify (Self-Hosted)

[Coolify](https://coolify.io) is an open-source, self-hostable platform.

1. **In Coolify Dashboard**:
   - Create new Project > Add Resource > Docker Compose
   - Git Repository: `https://github.com/tsc-cybersecurity/xkmu-business-os`
   - Docker Compose File: `docker-compose.coolify.yml`

2. **Set Environment Variables** in Coolify UI:
   ```
   DB_PASSWORD=your-strong-database-password
   JWT_SECRET=your-secret-min-32-chars
   GOOGLE_AI_API_KEY=your-gemini-api-key  (optional)
   ```

3. **Deploy** - Coolify handles SSL, domains, and container management

### Option 3: Docker (Manual Production)

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
| `GOOGLE_AI_API_KEY` | Recommended | Gemini API key |
| `OPENAI_API_KEY` | Optional | OpenAI API key |
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
