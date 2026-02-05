CLAUDE.md - Project Instructions: xKMU Business OS

1\. Vision \& Core Objectives

• Goal: A multi-tenant web application (xKMU Business OS) for SMEs.



• Core Modules: CMS (Website/Forms), CRM, and LMS.



• Automation First: Every action must be executable via API to allow maximum automation.



• Architecture: Headless-ready with a strict separation between Service-Layer and UI.



2\. Technical Stack

• Framework: Next.js 15+ (App Router), TypeScript.



• Database: PostgreSQL (Multi-Tenant Schema).



• Infrastructure: Docker container deployment.



• Styling: Tailwind CSS with Shadcn/UI (Modern, Utility-First).



• AI Integration:



&nbsp; • Gemini (Primary, cost-effective models)



&nbsp; • OpenAI (Fallback)



&nbsp; • Ollama (Local AI integration)



• Communication: Gmail \& IMAP integration.



3\. Architecture \& Coding Styles

• Multi-Tenancy: Mandatory tenant separation (`tenant\_id`) for all tables and queries.



• Service-Layer Pattern: All business logic must reside in `src/lib/services/`.



• API-First: Every feature must have a corresponding REST endpoint in `src/app/api/v1/`.



• Server-First: Prefer React Server Components. Use Client Components only for interactivity.



• Clean Code: Use "Early Returns", functional programming patterns, and strict TypeScript types.



• Colocation: Keep components, hooks, and types close to the routes they serve (`\_components` folders).



4\. Database Schema (PostgreSQL)

• Core Tables: `tenants`, `users` (with password\_hash), `companies`, `persons`, `leads`.



• Security: All queries must filter by `tenant\_id` fetched from the session/API key.



5\. Development Roadmap

• P1 (Core): Tenant/User Management, Contact Management (Companies/Persons), AI Base Setup (Gemini/Ollama).



• P2 (Business): Products, Services, Knowledgebase, Invoices/Offers.



• P3/P4 (Communication): Mail-Sequences, Lead Management with AI-Automation.



• P5 (Features): DIN SPEC 27076 Consulting, KMU Usecase-Generator.



6\. Automation \& AI Workflows

• Automated Lead Processing:



&nbsp; 1. API Inbound -> 2. AI Research (Gemini/Ollama) -> 3. Auto-Create Entities -> 4. Status Update.



• Service Methods: Every service must be accessible via API routes for external tools (Make/Zapier).



7\. Commands

• `npm run dev` - Start development server



• `npm run build` - Build for production



• `npm run lint` - Run linter

