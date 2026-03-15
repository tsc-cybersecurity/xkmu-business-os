# AGENTS

<skills_system priority="1">

## Available Skills

<!-- SKILLS_TABLE_START -->
<usage>
When users ask you to perform tasks, check if any of the available skills below can help complete the task more effectively. Skills provide specialized capabilities and domain knowledge.

How to use skills:
- Invoke: `npx openskills read <skill-name>` (run in your shell)
  - For multiple: `npx openskills read skill-one,skill-two`
- The skill content will load with detailed instructions on how to complete the task
- Base directory provided in output for resolving bundled resources (references/, scripts/, assets/)

Usage notes:
- Only use skills listed in <available_skills> below
- Do not invoke a skill that is already loaded in your context
- Each skill invocation is stateless
</usage>

<available_skills>

<skill>
<name>add-frontmatter</name>
<description>Scan all .md files in the project and add or fix YAML frontmatter (summary + read_when) so they can be discovered by context routers like Reflex.</description>
<location>project</location>
</skill>

<skill>
<name>agent-browser</name>
<description>Browser automation CLI for AI agents. Use when the user needs to interact with websites, including navigating pages, filling forms, clicking buttons, taking screenshots, extracting data, testing web apps, or automating any browser task. Triggers include requests to "open a website", "fill out a form", "click a button", "take a screenshot", "scrape data from a page", "test this web app", "login to a site", "automate browser actions", or any task requiring programmatic web interaction.</description>
<location>project</location>
</skill>

<skill>
<name>agent-harness-construction</name>
<description>Design and optimize AI agent action spaces, tool definitions, and observation formatting for higher completion rates.</description>
<location>project</location>
</skill>

<skill>
<name>agentdb-advanced</name>
<description>"Master advanced AgentDB features including QUIC synchronization, multi-database management, custom distance metrics, hybrid search, and distributed systems integration. Use when building distributed AI systems, multi-agent coordination, or advanced vector search applications."</description>
<location>project</location>
</skill>

<skill>
<name>agentdb-learning</name>
<description>"Create and train AI learning plugins with AgentDB's 9 reinforcement learning algorithms. Includes Decision Transformer, Q-Learning, SARSA, Actor-Critic, and more. Use when building self-learning agents, implementing RL, or optimizing agent behavior through experience."</description>
<location>project</location>
</skill>

<skill>
<name>agentdb-memory-patterns</name>
<description>"Implement persistent memory patterns for AI agents using AgentDB. Includes session memory, long-term storage, pattern learning, and context management. Use when building stateful agents, chat systems, or intelligent assistants."</description>
<location>project</location>
</skill>

<skill>
<name>agentdb-optimization</name>
<description>"Optimize AgentDB performance with quantization (4-32x memory reduction), HNSW indexing (150x faster search), caching, and batch operations. Use when optimizing memory usage, improving search speed, or scaling to millions of vectors."</description>
<location>project</location>
</skill>

<skill>
<name>agentdb-vector-search</name>
<description>"Implement semantic vector search with AgentDB for intelligent document retrieval, similarity matching, and context-aware querying. Use when building RAG systems, semantic search engines, or intelligent knowledge bases."</description>
<location>project</location>
</skill>

<skill>
<name>agentic-engineering</name>
<description>Operate as an agentic engineer using eval-first execution, decomposition, and cost-aware model routing.</description>
<location>project</location>
</skill>

<skill>
<name>ai-development-guide</name>
<description>Technical decision criteria, anti-pattern detection, debugging techniques, and quality check workflow. Use when making technical decisions, detecting code smells, or performing quality assurance.</description>
<location>project</location>
</skill>

<skill>
<name>ai-first-engineering</name>
<description>Engineering operating model for teams where AI agents generate a large share of implementation output.</description>
<location>project</location>
</skill>

<skill>
<name>ai-image-generator</name>
<description>"Generate AI images using Gemini or GPT APIs directly. Covers model selection (Gemini for scenes, GPT for transparent icons), the 5-part prompting framework, API calling patterns, multi-turn editing, and quality assurance. Produces photorealistic scenes, icons, illustrations, OG images, and product shots. Use when building websites that need images, creating marketing assets, or generating visual content. Triggers: 'generate image', 'ai image', 'create hero image', 'make an icon', 'generate illustration', 'create og image', 'ai art', 'image generation'."</description>
<location>project</location>
</skill>

<skill>
<name>ai-pattern-detection</name>
<description>Detects AI-generated writing patterns and suggests authentic alternatives. Auto-applies when reviewing content, editing documents, generating text, or when user mentions writing quality, AI detection, authenticity, or natural voice.</description>
<location>project</location>
</skill>

<skill>
<name>android-clean-architecture</name>
<description>Clean Architecture patterns for Android and Kotlin Multiplatform projects — module structure, dependency rules, UseCases, Repositories, and data layer patterns.</description>
<location>project</location>
</skill>

<skill>
<name>angular-architect</name>
<description>Generates Angular 17+ standalone components, configures advanced routing with lazy loading and guards, implements NgRx state management, applies RxJS patterns, and optimizes bundle performance. Use when building Angular 17+ applications with standalone components or signals, setting up NgRx stores, establishing RxJS reactive patterns, performance tuning, or writing Angular tests for enterprise apps.</description>
<location>project</location>
</skill>

<skill>
<name>api-design</name>
<description>REST API design patterns including resource naming, status codes, pagination, filtering, error responses, versioning, and rate limiting for production APIs.</description>
<location>project</location>
</skill>

<skill>
<name>api-designer</name>
<description>Use when designing REST or GraphQL APIs, creating OpenAPI specifications, or planning API architecture. Invoke for resource modeling, versioning strategies, pagination patterns, error handling standards.</description>
<location>project</location>
</skill>

<skill>
<name>architecture-designer</name>
<description>Use when designing new high-level system architecture, reviewing existing designs, or making architectural decisions. Invoke to create architecture diagrams, write Architecture Decision Records (ADRs), evaluate technology trade-offs, design component interactions, and plan for scalability. Use for system design, architecture review, microservices structuring, ADR authoring, scalability planning, and infrastructure pattern selection — distinct from code-level design patterns or database-only design tasks.</description>
<location>project</location>
</skill>

<skill>
<name>architecture-diagram-creator</name>
<description>Create comprehensive HTML architecture diagrams showing data flows, business objectives, features, technical architecture, and deployment. Use when users request system architecture, project documentation, high-level overviews, or technical specifications.</description>
<location>project</location>
</skill>

<skill>
<name>article-writing</name>
<description>Write articles, guides, blog posts, tutorials, newsletter issues, and other long-form content in a distinctive voice derived from supplied examples or brand guidance. Use when the user wants polished written content longer than a paragraph, especially when voice consistency, structure, and credibility matter.</description>
<location>project</location>
</skill>

<skill>
<name>ast-analyzer</name>
<description>Deep Abstract Syntax Tree analysis for understanding code structure, dependencies, impact analysis, and pattern detection at the structural level across multiple programming languages</description>
<location>project</location>
</skill>

<skill>
<name>atlassian-mcp</name>
<description>Integrates with Atlassian products to manage project tracking and documentation via MCP protocol. Use when querying Jira issues with JQL filters, creating and updating tickets with custom fields, searching or editing Confluence pages with CQL, managing sprints and backlogs, setting up MCP server authentication, syncing documentation, or debugging Atlassian API integrations.</description>
<location>project</location>
</skill>

<skill>
<name>aussie-business-english</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>autonomous-development</name>
<description>Comprehensive autonomous development strategies including milestone planning, incremental implementation, auto-debugging, and continuous quality assurance for full development lifecycle management</description>
<location>project</location>
</skill>

<skill>
<name>autonomous-loops</name>
<description>"Patterns and architectures for autonomous Claude Code loops — from simple sequential pipelines to RFC-driven multi-agent DAG systems."</description>
<location>project</location>
</skill>

<skill>
<name>award-application</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>backend-patterns</name>
<description>Backend architecture patterns, API design, database optimization, and server-side best practices for Node.js, Express, and Next.js API routes.</description>
<location>project</location>
</skill>

<skill>
<name>banner-design</name>
<description>"Design banners for social media, ads, website heroes, creative assets, and print. Multiple art direction options with AI-generated visuals. Actions: design, create, generate banner. Platforms: Facebook, Twitter/X, LinkedIn, YouTube, Instagram, Google Display, website hero, print. Styles: minimalist, gradient, bold typography, photo-based, illustrated, geometric, retro, glassmorphism, 3D, neon, duotone, editorial, collage. Uses ui-ux-pro-max, frontend-design, ai-artist, ai-multimodal skills."</description>
<location>project</location>
</skill>

<skill>
<name>blueprint</name>
<description>>-</description>
<location>project</location>
</skill>

<skill>
<name>brains-trust</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>brand</name>
<description>Brand voice, visual identity, messaging frameworks, asset management, brand consistency. Activate for branded content, tone of voice, marketing assets, brand compliance, style guides.</description>
<location>project</location>
</skill>

<skill>
<name>carrier-relationship-management</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>chaos-engineer</name>
<description>Designs chaos experiments, creates failure injection frameworks, and facilitates game day exercises for distributed systems — producing runbooks, experiment manifests, rollback procedures, and post-mortem templates. Use when designing chaos experiments, implementing failure injection frameworks, or conducting game day exercises. Invoke for chaos experiments, resilience testing, blast radius control, game days, antifragile systems, fault injection, Chaos Monkey, Litmus Chaos.</description>
<location>project</location>
</skill>

<skill>
<name>claude-api</name>
<description>Anthropic Claude API patterns for Python and TypeScript. Covers Messages API, streaming, tool use, vision, extended thinking, batches, prompt caching, and Claude Agent SDK. Use when building applications with the Claude API or Anthropic SDKs.</description>
<location>project</location>
</skill>

<skill>
<name>claude-plugin-validation</name>
<description>Comprehensive validation system for Claude Code plugins to ensure compliance with official plugin development guidelines and prevent installation failures</description>
<location>project</location>
</skill>

<skill>
<name>cli-developer</name>
<description>Use when building CLI tools, implementing argument parsing, or adding interactive prompts. Invoke for parsing flags and subcommands, displaying progress bars and spinners, generating bash/zsh/fish completion scripts, CLI design, shell completions, and cross-platform terminal applications using commander, click, typer, or cobra.</description>
<location>project</location>
</skill>

<skill>
<name>clickhouse-io</name>
<description>ClickHouse database patterns, query optimization, analytics, and data engineering best practices for high-performance analytical workloads.</description>
<location>project</location>
</skill>

<skill>
<name>cloud-architect</name>
<description>Designs cloud architectures, creates migration plans, generates cost optimization recommendations, and produces disaster recovery strategies across AWS, Azure, and GCP. Use when designing cloud architectures, planning migrations, or optimizing multi-cloud deployments. Invoke for Well-Architected Framework, cost optimization, disaster recovery, landing zones, security architecture, serverless design.</description>
<location>project</location>
</skill>

<skill>
<name>cloud-forensics</name>
<description>"AWS, Azure, and GCP forensic investigation covering audit logs, IAM review, storage access, network flows, and compute instance forensics"</description>
<location>project</location>
</skill>

<skill>
<name>cloudflare-worker-builder</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>code-analysis</name>
<description>Provides methodologies, metrics, and best practices for analyzing code structure, complexity, and quality</description>
<location>project</location>
</skill>

<skill>
<name>code-auditor</name>
<description>Performs comprehensive codebase analysis covering architecture, code quality, security, performance, testing, and maintainability. Use when user wants to audit code quality, identify technical debt, find security issues, assess test coverage, or get a codebase health check.</description>
<location>project</location>
</skill>

<skill>
<name>code-documenter</name>
<description>Generates, formats, and validates technical documentation — including docstrings, OpenAPI/Swagger specs, JSDoc annotations, doc portals, and user guides. Use when adding docstrings to functions or classes, creating API documentation, building documentation sites, or writing tutorials and user guides. Invoke for OpenAPI/Swagger specs, JSDoc, doc portals, getting started guides.</description>
<location>project</location>
</skill>

<skill>
<name>code-execution</name>
<description>Execute Python code locally with marketplace API access for 90%+ token savings on bulk operations. Activates when user requests bulk operations (10+ files), complex multi-step workflows, iterative processing, or mentions efficiency/performance.</description>
<location>project</location>
</skill>

<skill>
<name>code-refactor</name>
<description>Perform bulk code refactoring operations like renaming variables/functions across files, replacing patterns, and updating API calls. Use when users request renaming identifiers, replacing deprecated code patterns, updating method calls, or making consistent changes across multiple locations.</description>
<location>project</location>
</skill>

<skill>
<name>code-reviewer</name>
<description>Analyzes code diffs and files to identify bugs, security vulnerabilities (SQL injection, XSS, insecure deserialization), code smells, N+1 queries, naming issues, and architectural concerns, then produces a structured review report with prioritized, actionable feedback. Use when reviewing pull requests, conducting code quality audits, identifying refactoring opportunities, or checking for security issues. Invoke for PR reviews, code quality checks, refactoring suggestions, review code, code quality. Complements specialized skills (security-reviewer, test-master) by providing broad-scope review across correctness, performance, maintainability, and test coverage in a single pass.</description>
<location>project</location>
</skill>

<skill>
<name>code-transfer</name>
<description>Transfer code between files with line-based precision. Use when users request copying code from one location to another, moving functions or classes between files, extracting code blocks, or inserting code at specific line numbers.</description>
<location>project</location>
</skill>

<skill>
<name>codebase-analysis</name>
<description>Systematically analyze codebase structure, complexity, dependencies, and architectural patterns to understand project organization</description>
<location>project</location>
</skill>

<skill>
<name>codebase-documenter</name>
<description>Generates comprehensive documentation explaining how a codebase works, including architecture, key components, data flow, and development guidelines. Use when user wants to understand unfamiliar code, create onboarding docs, document architecture, or explain how the system works.</description>
<location>project</location>
</skill>

<skill>
<name>coding-principles</name>
<description>Language-agnostic coding principles for maintainability, readability, and quality. Use when implementing features, refactoring code, or reviewing code quality.</description>
<location>project</location>
</skill>

<skill>
<name>coding-standards</name>
<description>Universal coding standards, best practices, and patterns for TypeScript, JavaScript, React, and Node.js development.</description>
<location>project</location>
</skill>

<skill>
<name>color-palette</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>compose-multiplatform-patterns</name>
<description>Compose Multiplatform and Jetpack Compose patterns for KMP projects — state management, navigation, theming, performance, and platform-specific UI.</description>
<location>project</location>
</skill>

<skill>
<name>configure-ecc</name>
<description>Interactive installer for Everything Claude Code — guides users through selecting and installing skills and rules to user-level or project-level directories, verifies paths, and optionally optimizes installed files.</description>
<location>project</location>
</skill>

<skill>
<name>container-forensics</name>
<description>"Docker, containerd/CRI-O, and Kubernetes forensic investigation covering container inventory (docker and crictl), privilege checks, image verification, layer analysis (dive), escape detection, eBPF runtime monitoring (Falco, Tetragon, Tracee), K8s RBAC audit, etcd security audit, and API server audit log analysis"</description>
<location>project</location>
</skill>

<skill>
<name>content-engine</name>
<description>Create platform-native content systems for X, LinkedIn, TikTok, YouTube, newsletters, and repurposed multi-platform campaigns. Use when the user wants social posts, threads, scripts, content calendars, or one source asset adapted cleanly across platforms.</description>
<location>project</location>
</skill>

<skill>
<name>content-hash-cache-pattern</name>
<description>Cache expensive file processing results using SHA-256 content hashes — path-independent, auto-invalidating, with service layer separation.</description>
<location>project</location>
</skill>

<skill>
<name>contextual-pattern-learning</name>
<description>Advanced contextual pattern recognition with project fingerprinting, semantic similarity analysis, and cross-domain pattern matching for enhanced learning capabilities</description>
<location>project</location>
</skill>

<skill>
<name>continuous-agent-loop</name>
<description>Patterns for continuous autonomous agent loops with quality gates, evals, and recovery controls.</description>
<location>project</location>
</skill>

<skill>
<name>continuous-learning</name>
<description>Automatically extract reusable patterns from Claude Code sessions and save them as learned skills for future use.</description>
<location>project</location>
</skill>

<skill>
<name>continuous-learning-v2</name>
<description>Instinct-based learning system that observes sessions via hooks, creates atomic instincts with confidence scoring, and evolves them into skills/commands/agents. v2.1 adds project-scoped instincts to prevent cross-project contamination.</description>
<location>project</location>
</skill>

<skill>
<name>conversation-analyzer</name>
<description>Analyzes your Claude Code conversation history to identify patterns, common mistakes, and opportunities for workflow improvement. Use when user wants to understand usage patterns, optimize workflow, identify automation opportunities, or check if they're following best practices.</description>
<location>project</location>
</skill>

<skill>
<name>cortex-mine</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>cortex-query</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>cost-aware-llm-pipeline</name>
<description>Cost optimization patterns for LLM API usage — model routing by task complexity, budget tracking, retry logic, and prompt caching.</description>
<location>project</location>
</skill>

<skill>
<name>cpp-coding-standards</name>
<description>C++ coding standards based on the C++ Core Guidelines (isocpp.github.io). Use when writing, reviewing, or refactoring C++ code to enforce modern, safe, and idiomatic practices.</description>
<location>project</location>
</skill>

<skill>
<name>cpp-pro</name>
<description>Writes, optimizes, and debugs C++ applications using modern C++20/23 features, template metaprogramming, and high-performance systems techniques. Use when building or refactoring C++ code requiring concepts, ranges, coroutines, SIMD optimization, or careful memory management — or when addressing performance bottlenecks, concurrency issues, and build system configuration with CMake.</description>
<location>project</location>
</skill>

<skill>
<name>cpp-testing</name>
<description>Use only when writing/updating/fixing C++ tests, configuring GoogleTest/CTest, diagnosing failing or flaky tests, or adding coverage/sanitizers.</description>
<location>project</location>
</skill>

<skill>
<name>create-docs</name>
<description>Create or update .meridian/docs/ knowledge files for a module or directory. Produces reference docs with frontmatter for context routing.</description>
<location>project</location>
</skill>

<skill>
<name>cross-task-learner</name>
<description>Enable Ralph loops to learn from similar past tasks and share patterns across loops</description>
<location>project</location>
</skill>

<skill>
<name>crosspost</name>
<description>Multi-platform content distribution across X, LinkedIn, Threads, and Bluesky. Adapts content per platform using content-engine patterns. Never posts identical content cross-platform. Use when the user wants to distribute content across social platforms.</description>
<location>project</location>
</skill>

<skill>
<name>csharp-developer</name>
<description>"Use when building C# applications with .NET 8+, ASP.NET Core APIs, or Blazor web apps. Builds REST APIs using minimal or controller-based routing, configures database access with Entity Framework Core, implements async patterns and cancellation, structures applications with CQRS via MediatR, and scaffolds Blazor components with state management. Invoke for C#, .NET, ASP.NET Core, Blazor, Entity Framework, EF Core, Minimal API, MAUI, SignalR."</description>
<location>project</location>
</skill>

<skill>
<name>customs-trade-compliance</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>d1-drizzle-schema</name>
<description>"Generate Drizzle ORM schemas for Cloudflare D1 databases with correct D1-specific patterns. Produces schema files, migration commands, type exports, and DATABASE_SCHEMA.md documentation. Handles D1 quirks: foreign keys always enforced, no native BOOLEAN/DATETIME types, 100 bound parameter limit, JSON stored as TEXT. Use when creating a new database, adding tables, or scaffolding a D1 data layer."</description>
<location>project</location>
</skill>

<skill>
<name>d1-migration</name>
<description>"Cloudflare D1 migration workflow: generate with Drizzle, inspect SQL for gotchas, apply to local and remote, fix stuck migrations, handle partial failures. Use when running migrations, fixing migration errors, or setting up D1 schemas."</description>
<location>project</location>
</skill>

<skill>
<name>dashboard-creator</name>
<description>Create HTML dashboards with KPI metric cards, bar/pie/line charts, progress indicators, and data visualizations. Use when users request dashboards, metrics displays, KPI visualizations, data charts, or monitoring interfaces.</description>
<location>project</location>
</skill>

<skill>
<name>database-migrations</name>
<description>Database migration best practices for schema changes, data migrations, rollbacks, and zero-downtime deployments across PostgreSQL, MySQL, and common ORMs (Prisma, Drizzle, Django, TypeORM, golang-migrate).</description>
<location>project</location>
</skill>

<skill>
<name>database-optimizer</name>
<description>Optimizes database queries and improves performance across PostgreSQL and MySQL systems. Use when investigating slow queries, analyzing execution plans, or optimizing database performance. Invoke for index design, query rewrites, configuration tuning, partitioning strategies, lock contention resolution.</description>
<location>project</location>
</skill>

<skill>
<name>db-seed</name>
<description>"Generate database seed scripts with realistic sample data. Reads Drizzle schemas or SQL migrations, respects foreign key ordering, produces idempotent TypeScript or SQL seed files. Handles D1 batch limits, unique constraints, and domain-appropriate data. Use when populating dev/demo/test databases. Triggers: 'seed database', 'seed data', 'sample data', 'populate database', 'db seed', 'test data', 'demo data', 'generate fixtures'."</description>
<location>project</location>
</skill>

<skill>
<name>debugging-wizard</name>
<description>Parses error messages, traces execution flow through stack traces, correlates log entries to identify failure points, and applies systematic hypothesis-driven methodology to isolate and resolve bugs. Use when investigating errors, analyzing stack traces, finding root causes of unexpected behavior, troubleshooting crashes, or performing log analysis, error investigation, or root cause analysis.</description>
<location>project</location>
</skill>

<skill>
<name>decision-frameworks</name>
<description>Decision-making methodologies, scoring frameworks, and planning strategies for Group 2 agents in four-tier architecture</description>
<location>project</location>
</skill>

<skill>
<name>deep-research</name>
<description>Multi-source deep research using firecrawl and exa MCPs. Searches the web, synthesizes findings, and delivers cited reports with source attribution. Use when the user wants thorough research on any topic with evidence and citations.</description>
<location>project</location>
</skill>

<skill>
<name>deployment-patterns</name>
<description>Deployment workflows, CI/CD pipeline patterns, Docker containerization, health checks, rollback strategies, and production readiness checklists for web applications.</description>
<location>project</location>
</skill>

<skill>
<name>design</name>
<description>"Comprehensive design skill: brand identity, design tokens, UI styling, logo generation (55 styles, Gemini AI), corporate identity program (50 deliverables, CIP mockups), HTML presentations (Chart.js), banner design (22 styles, social/ads/web/print), icon design (15 styles, SVG, Gemini 3.1 Pro), social photos (HTML→screenshot, multi-platform). Actions: design logo, create CIP, generate mockups, build slides, design banner, generate icon, create social photos, social media images, brand identity, design system. Platforms: Facebook, Twitter, LinkedIn, YouTube, Instagram, Pinterest, TikTok, Threads, Google Ads."</description>
<location>project</location>
</skill>

<skill>
<name>design-system</name>
<description>Token architecture, component specifications, and slide generation. Three-layer tokens (primitive→semantic→component), CSS variables, spacing/typography scales, component specs, strategic slide creation. Use for design tokens, systematic design, brand-compliant presentations.</description>
<location>project</location>
</skill>

<skill>
<name>dev-session</name>
<description>"Manage long development sessions with structured progress tracking. Creates SESSION.md files for multi-session handoff, checkpoints progress with WIP commits, and captures learnings to CLAUDE.md. Trigger with 'start session', 'checkpoint', 'wrap session', 'resume session', or 'context getting full'."</description>
<location>project</location>
</skill>

<skill>
<name>devops-engineer</name>
<description>Creates Dockerfiles, configures CI/CD pipelines, writes Kubernetes manifests, and generates Terraform/Pulumi infrastructure templates. Handles deployment automation, GitOps configuration, incident response runbooks, and internal developer platform tooling. Use when setting up CI/CD pipelines, containerizing applications, managing infrastructure as code, deploying to Kubernetes clusters, configuring cloud platforms, automating releases, or responding to production incidents. Invoke for pipelines, Docker, Kubernetes, GitOps, Terraform, GitHub Actions, on-call, or platform engineering.</description>
<location>project</location>
</skill>

<skill>
<name>django-expert</name>
<description>"Use when building Django web applications or REST APIs with Django REST Framework. Invoke when working with settings.py, models.py, manage.py, or any Django project file. Creates Django models with proper indexes, optimizes ORM queries using select_related/prefetch_related, builds DRF serializers and viewsets, and configures JWT authentication. Trigger terms: Django, DRF, Django REST Framework, Django ORM, Django model, serializer, viewset, Python web."</description>
<location>project</location>
</skill>

<skill>
<name>django-patterns</name>
<description>Django architecture patterns, REST API design with DRF, ORM best practices, caching, signals, middleware, and production-grade Django apps.</description>
<location>project</location>
</skill>

<skill>
<name>django-security</name>
<description>Django security best practices, authentication, authorization, CSRF protection, SQL injection prevention, XSS prevention, and secure deployment configurations.</description>
<location>project</location>
</skill>

<skill>
<name>django-tdd</name>
<description>Django testing strategies with pytest-django, TDD methodology, factory_boy, mocking, coverage, and testing Django REST Framework APIs.</description>
<location>project</location>
</skill>

<skill>
<name>django-verification</name>
<description>"Verification loop for Django projects: migrations, linting, tests with coverage, security scans, and deployment readiness checks before release or PR."</description>
<location>project</location>
</skill>

<skill>
<name>dmux-workflows</name>
<description>Multi-agent orchestration using dmux (tmux pane manager for AI agents). Patterns for parallel agent workflows across Claude Code, Codex, OpenCode, and other harnesses. Use when running multiple agent sessions in parallel or coordinating multi-agent development workflows.</description>
<location>project</location>
</skill>

<skill>
<name>doc-scraper</name>
<description>Scrape documentation websites into organized reference files. Use when converting docs sites to searchable references or building Claude skills.</description>
<location>project</location>
</skill>

<skill>
<name>doc-splitter</name>
<description>Split large documentation (10K+ pages) into focused sub-skills with intelligent routing. Use for massive doc sites like Godot, AWS, or MSDN.</description>
<location>project</location>
</skill>

<skill>
<name>docker-patterns</name>
<description>Docker and Docker Compose patterns for local development, container security, networking, volume strategies, and multi-service orchestration.</description>
<location>project</location>
</skill>

<skill>
<name>documentation-best-practices</name>
<description>Provides templates, standards, and best practices for writing clear, comprehensive technical documentation</description>
<location>project</location>
</skill>

<skill>
<name>documentation-criteria</name>
<description>Documentation creation criteria including PRD, ADR, Design Doc, and Work Plan requirements with templates. Use when creating or reviewing technical documents, or determining which documents are required.</description>
<location>project</location>
</skill>

<skill>
<name>dotnet-core-expert</name>
<description>Use when building .NET 8 applications with minimal APIs, clean architecture, or cloud-native microservices. Invoke for Entity Framework Core, CQRS with MediatR, JWT authentication, AOT compilation.</description>
<location>project</location>
</skill>

<skill>
<name>e2e-testing</name>
<description>Playwright E2E testing patterns, Page Object Model, configuration, CI/CD integration, artifact management, and flaky test strategies.</description>
<location>project</location>
</skill>

<skill>
<name>elevenlabs-agents</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>embedded-systems</name>
<description>Use when developing firmware for microcontrollers, implementing RTOS applications, or optimizing power consumption. Invoke for STM32, ESP32, FreeRTOS, bare-metal, power optimization, real-time systems, configure peripherals, write interrupt handlers, implement DMA transfers, debug timing issues.</description>
<location>project</location>
</skill>

<skill>
<name>energy-procurement</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>ensemble-solving</name>
<description>Generate multiple diverse solutions in parallel and select the best. Use for architecture decisions, code generation with multiple valid approaches, or creative tasks where exploring alternatives improves quality.</description>
<location>project</location>
</skill>

<skill>
<name>enterprise-agent-ops</name>
<description>Operate long-lived agent workloads with observability, security boundaries, and lifecycle management.</description>
<location>project</location>
</skill>

<skill>
<name>error-audit</name>
<description>Audit code for silent error swallowing, fallbacks to degraded alternatives, backwards compatibility shims, and UI that fails to show errors to the user. Finds and fixes all occurrences in the specified scope.</description>
<location>project</location>
</skill>

<skill>
<name>eslint-checker</name>
<description>Run ESLint for JavaScript/TypeScript code quality and style enforcement. Use for static analysis and auto-fixing.</description>
<location>project</location>
</skill>

<skill>
<name>eval-harness</name>
<description>Formal evaluation framework for Claude Code sessions implementing eval-driven development (EDD) principles</description>
<location>project</location>
</skill>

<skill>
<name>evidence-preservation</name>
<description>"Chain of custody and evidence preservation procedures covering log collection, hash verification, custody documentation, and evidence packaging per RFC 3227"</description>
<location>project</location>
</skill>

<skill>
<name>exa-search</name>
<description>Neural search via Exa MCP for web, code, and company research. Use when the user needs web search, code examples, company intel, people lookup, or AI-powered deep research with Exa's neural search engine.</description>
<location>project</location>
</skill>

<skill>
<name>EXPERT_NEXTJS_DEV</name>
<description>Senior Next.js 15 expert with 15+ years experience. Generate production-ready code with strict TypeScript typing, professional JSDoc, solid architecture patterns, complete test coverage, security best practices, and performance optimization. Use for any code generation, features, refactoring, debugging, or architecture decisions in this SaaS project.</description>
<location>project</location>
</skill>

<skill>
<name>fal-ai-media</name>
<description>Unified media generation via fal.ai MCP — image, video, and audio. Covers text-to-image (Nano Banana), text/image-to-video (Seedance, Kling, Veo 3), text-to-speech (CSM-1B), and video-to-audio (ThinkSound). Use when the user wants to generate images, videos, or audio with AI.</description>
<location>project</location>
</skill>

<skill>
<name>fastapi-expert</name>
<description>"Use when building high-performance async Python APIs with FastAPI and Pydantic V2. Invoke to create REST endpoints, define Pydantic models, implement authentication flows, set up async SQLAlchemy database operations, add JWT authentication, build WebSocket endpoints, or generate OpenAPI documentation. Trigger terms: FastAPI, Pydantic, async Python, Python API, REST API Python, SQLAlchemy async, JWT authentication, OpenAPI, Swagger Python."</description>
<location>project</location>
</skill>

<skill>
<name>favicon-gen</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>feature-forge</name>
<description>Conducts structured requirements workshops to produce feature specifications, user stories, EARS-format functional requirements, acceptance criteria, and implementation checklists. Use when defining new features, gathering requirements, or writing specifications. Invoke for feature definition, requirements gathering, user stories, EARS format specs, PRDs, acceptance criteria, or requirement matrices.</description>
<location>project</location>
</skill>

<skill>
<name>feature-planning</name>
<description>Break down feature requests into detailed, implementable plans with clear tasks. Use when user requests a new feature, enhancement, or complex change.</description>
<location>project</location>
</skill>

<skill>
<name>file-operations</name>
<description>Analyze files and get detailed metadata including size, line counts, modification times, and content statistics. Use when users request file information, statistics, or analysis without modifying files.</description>
<location>project</location>
</skill>

<skill>
<name>fine-tuning-expert</name>
<description>"Use when fine-tuning LLMs, training custom models, or adapting foundation models for specific tasks. Invoke for configuring LoRA/QLoRA adapters, preparing JSONL training datasets, setting hyperparameters for fine-tuning runs, adapter training, transfer learning, finetuning with Hugging Face PEFT, OpenAI fine-tuning, instruction tuning, RLHF, DPO, or quantizing and deploying fine-tuned models. Trigger terms include: LoRA, QLoRA, PEFT, finetuning, fine-tuning, adapter tuning, LLM training, model training, custom model."</description>
<location>project</location>
</skill>

<skill>
<name>flaky-detect</name>
<description>Identify flaky tests from CI history and test execution patterns. Use when debugging intermittent test failures, auditing test reliability, or improving CI stability.</description>
<location>project</location>
</skill>

<skill>
<name>flaky-fix</name>
<description>Suggest and apply fixes for flaky tests based on detected patterns. Use after flaky-detect identifies unreliable tests that need repair.</description>
<location>project</location>
</skill>

<skill>
<name>flow-nexus-neural</name>
<description>Train and deploy neural networks in distributed E2B sandboxes with Flow Nexus</description>
<location>project</location>
</skill>

<skill>
<name>flow-nexus-platform</name>
<description>Comprehensive Flow Nexus platform management - authentication, sandboxes, app deployment, payments, and challenges</description>
<location>project</location>
</skill>

<skill>
<name>flow-nexus-swarm</name>
<description>Cloud-based AI swarm deployment and event-driven workflow automation with Flow Nexus platform</description>
<location>project</location>
</skill>

<skill>
<name>flowchart-creator</name>
<description>Create HTML flowcharts and process diagrams with decision trees, color-coded stages, arrows, and swimlanes. Use when users request flowcharts, process diagrams, workflow visualizations, or decision trees.</description>
<location>project</location>
</skill>

<skill>
<name>flutter-expert</name>
<description>Use when building cross-platform applications with Flutter 3+ and Dart. Invoke for widget development, Riverpod/Bloc state management, GoRouter navigation, platform-specific implementations, performance optimization.</description>
<location>project</location>
</skill>

<skill>
<name>foundation-models-on-device</name>
<description>Apple FoundationModels framework for on-device LLM — text generation, guided generation with @Generable, tool calling, and snapshot streaming in iOS 26+.</description>
<location>project</location>
</skill>

<skill>
<name>frontend-aesthetics</name>
<description>Distinctive frontend design principles for avoiding generic AI defaults, implementing thoughtful typography/color/animations, and creating polished user experiences based on Claude Code design research</description>
<location>project</location>
</skill>

<skill>
<name>frontend-ai-guide</name>
<description>Frontend-specific technical decision criteria, anti-patterns, debugging techniques, and quality check workflow. Use when making frontend technical decisions or performing quality assurance.</description>
<location>project</location>
</skill>

<skill>
<name>frontend-design</name>
<description>Create distinctive, production-grade frontend interfaces with exceptional design quality. Use when building web components, pages, or applications that need creative, polished aesthetics.</description>
<location>project</location>
</skill>

<skill>
<name>frontend-patterns</name>
<description>Frontend development patterns for React, Next.js, state management, performance optimization, and UI best practices.</description>
<location>project</location>
</skill>

<skill>
<name>frontend-slides</name>
<description>Create stunning, animation-rich HTML presentations from scratch or by converting PowerPoint files. Use when the user wants to build a presentation, convert a PPT/PPTX to web, or create slides for a talk/pitch. Helps non-designers discover their aesthetic through visual exploration rather than abstract choices.</description>
<location>project</location>
</skill>

<skill>
<name>fullstack-guardian</name>
<description>Builds security-focused full-stack web applications by implementing integrated frontend and backend components with layered security at every level. Covers the complete stack from database to UI, enforcing auth, input validation, output encoding, and parameterized queries across all layers. Use when implementing features across frontend and backend, building REST APIs with corresponding UI, connecting frontend components to backend endpoints, creating end-to-end data flows from database to UI, or implementing CRUD operations with UI forms. Distinct from frontend-only, backend-only, or API-only skills in that it simultaneously addresses all three perspectives—Frontend, Backend, and Security—within a single implementation workflow. Invoke for full-stack feature work, web app development, authenticated API routes with views, microservices, real-time features, monorepo architecture, or technology selection decisions.</description>
<location>project</location>
</skill>

<skill>
<name>fullstack-validation</name>
<description>Comprehensive validation methodology for multi-component applications including backend, frontend, database, and infrastructure</description>
<location>project</location>
</skill>

<skill>
<name>game-developer</name>
<description>"Use when building game systems, implementing Unity/Unreal Engine features, or optimizing game performance. Invoke to implement ECS architecture, configure physics systems and colliders, set up multiplayer networking with lag compensation, optimize frame rates to 60+ FPS targets, develop shaders, or apply game design patterns such as object pooling and state machines. Trigger keywords: Unity, Unreal Engine, game development, ECS architecture, game physics, multiplayer networking, game optimization, shader programming, game AI."</description>
<location>project</location>
</skill>

<skill>
<name>generate-factory</name>
<description>Auto-generate test data factories from schemas, types, or models. Use when creating test data infrastructure, setting up fixtures, or reducing test setup boilerplate.</description>
<location>project</location>
</skill>

<skill>
<name>git-automation</name>
<description>Advanced Git operations automation including intelligent branching, commit optimization, release workflows, and repository health management</description>
<location>project</location>
</skill>

<skill>
<name>git-pushing</name>
<description>Stage, commit, and push git changes with conventional commit messages. Use when user wants to commit and push changes, mentions pushing to remote, or asks to save and push their work. Also activates when user says "push changes", "commit and push", "push this", "push to github", or similar git workflow requests.</description>
<location>project</location>
</skill>

<skill>
<name>git-workflow</name>
<description>Git best practices for commits, branches, pull requests, and collaboration workflows following Conventional Commits and GitFlow patterns</description>
<location>project</location>
</skill>

<skill>
<name>github-code-review</name>
<description>Comprehensive GitHub code review with AI-powered swarm coordination</description>
<location>project</location>
</skill>

<skill>
<name>github-multi-repo</name>
<description>Multi-repository coordination, synchronization, and architecture management with AI swarm orchestration</description>
<location>project</location>
</skill>

<skill>
<name>github-project-management</name>
<description>Comprehensive GitHub project management with swarm-coordinated issue tracking, project board automation, and sprint planning</description>
<location>project</location>
</skill>

<skill>
<name>github-release</name>
<description>"Prepare and publish GitHub releases. Sanitizes code for public release (secrets scan, personal artifacts, LICENSE/README validation), creates version tags, and publishes via gh CLI. Trigger with 'release', 'publish', 'open source', 'prepare for release', 'create release', or 'github release'."</description>
<location>project</location>
</skill>

<skill>
<name>github-release-management</name>
<description>Comprehensive GitHub release orchestration with AI swarm coordination for automated versioning, testing, deployment, and rollback management</description>
<location>project</location>
</skill>

<skill>
<name>github-workflow-automation</name>
<description>Advanced GitHub Actions workflow automation with AI swarm coordination, intelligent CI/CD pipelines, and comprehensive repository management</description>
<location>project</location>
</skill>

<skill>
<name>golang-patterns</name>
<description>Idiomatic Go patterns, best practices, and conventions for building robust, efficient, and maintainable Go applications.</description>
<location>project</location>
</skill>

<skill>
<name>golang-pro</name>
<description>Implements concurrent Go patterns using goroutines and channels, designs and builds microservices with gRPC or REST, optimizes Go application performance with pprof, and enforces idiomatic Go with generics, interfaces, and robust error handling. Use when building Go applications requiring concurrent programming, microservices architecture, or high-performance systems. Invoke for goroutines, channels, Go generics, gRPC integration, CLI tools, benchmarks, or table-driven testing.</description>
<location>project</location>
</skill>

<skill>
<name>golang-testing</name>
<description>Go testing patterns including table-driven tests, subtests, benchmarks, fuzzing, and test coverage. Follows TDD methodology with idiomatic Go practices.</description>
<location>project</location>
</skill>

<skill>
<name>google-apps-script</name>
<description>"Build Google Apps Script automation for Sheets and Workspace apps. Produces scripts with custom menus, triggers, dialogs, email automation, PDF export, and external API integration."</description>
<location>project</location>
</skill>

<skill>
<name>google-chat-messages</name>
<description>"Send Google Chat messages via webhook — text, rich cards (cardsV2), threaded replies. Includes TypeScript types, card builder utility, and widget reference."</description>
<location>project</location>
</skill>

<skill>
<name>graphql-architect</name>
<description>Use when designing GraphQL schemas, implementing Apollo Federation, or building real-time subscriptions. Invoke for schema design, resolvers with DataLoader, query optimization, federation directives.</description>
<location>project</location>
</skill>

<skill>
<name>group-collaboration</name>
<description>Best practices for inter-group communication, knowledge sharing, and collaborative workflows in four-tier architecture</description>
<location>project</location>
</skill>

<skill>
<name>gui-design-principles</name>
<description>Comprehensive design principles and best practices for creating beautiful, functional GUI applications including dashboards, web apps, and mobile apps</description>
<location>project</location>
</skill>

<skill>
<name>gws-install</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>gws-setup</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>hive-mind-advanced</name>
<description>Advanced Hive Mind collective intelligence system for queen-led multi-agent coordination with consensus mechanisms and persistent memory</description>
<location>project</location>
</skill>

<skill>
<name>hono-api-scaffolder</name>
<description>"Scaffold Hono API routes for Cloudflare Workers. Produces route files, middleware, typed bindings, Zod validation, error handling, and API_ENDPOINTS.md documentation. Use after a project is set up with cloudflare-worker-builder or vite-flare-starter, when you need to add API routes, create endpoints, or generate API documentation."</description>
<location>project</location>
</skill>

<skill>
<name>hooks-automation</name>
<description>Automated coordination, formatting, and learning from Claude Code operations using intelligent hooks with MCP integration. Includes pre/post task hooks, session management, Git integration, memory coordination, and neural pattern training for enhanced development workflows.</description>
<location>project</location>
</skill>

<skill>
<name>icon-set-generator</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>image-processing</name>
<description>"Process images for web development — resize, crop, trim whitespace, convert formats (PNG/WebP/JPG), optimise file size, generate thumbnails, create OG card images. Uses Pillow (Python) — no ImageMagick needed. Trigger with 'resize image', 'convert to webp', 'trim logo', 'optimise images', 'make thumbnail', 'create OG image', 'crop whitespace', 'process image', or 'image too large'."</description>
<location>project</location>
</skill>

<skill>
<name>implementation-approach</name>
<description>Implementation strategy selection framework. Use when planning implementation strategy, selecting development approach, or defining verification criteria.</description>
<location>project</location>
</skill>

<skill>
<name>integration-e2e-testing</name>
<description>Integration and E2E test design principles, ROI calculation, test skeleton specification, and review criteria. Use when designing integration tests, E2E tests, or reviewing test quality.</description>
<location>project</location>
</skill>

<skill>
<name>integrity-validation</name>
<description>Pre/post-operation validation to detect missing components and prevent future issues</description>
<location>project</location>
</skill>

<skill>
<name>inventory-demand-planning</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>investor-materials</name>
<description>Create and update pitch decks, one-pagers, investor memos, accelerator applications, financial models, and fundraising materials. Use when the user needs investor-facing documents, projections, use-of-funds tables, milestone plans, or materials that must stay internally consistent across multiple fundraising assets.</description>
<location>project</location>
</skill>

<skill>
<name>investor-outreach</name>
<description>Draft cold emails, warm intro blurbs, follow-ups, update emails, and investor communications for fundraising. Use when the user wants outreach to angels, VCs, strategic investors, or accelerators and needs concise, personalized, investor-facing messaging.</description>
<location>project</location>
</skill>

<skill>
<name>ioc-extraction</name>
<description>"Extract, classify, deduplicate, and enrich IOCs from investigation artifacts; map to STIX 2.1 observables"</description>
<location>project</location>
</skill>

<skill>
<name>issue-driven-ralph</name>
<description>Orchestrates issue-driven Ralph loops that post cycle status to issue threads and incorporate human feedback in each cycle.</description>
<location>project</location>
</skill>

<skill>
<name>iterative-retrieval</name>
<description>Pattern for progressively refining context retrieval to solve the subagent context problem</description>
<location>project</location>
</skill>

<skill>
<name>java-architect</name>
<description>Use when building, configuring, or debugging enterprise Java applications with Spring Boot 3.x, microservices, or reactive programming. Invoke to implement WebFlux endpoints, optimize JPA queries and database performance, configure Spring Security with OAuth2/JWT, or resolve authentication issues and async processing challenges in cloud-native Spring applications.</description>
<location>project</location>
</skill>

<skill>
<name>java-coding-standards</name>
<description>"Java coding standards for Spring Boot services: naming, immutability, Optional usage, streams, exceptions, generics, and project layout."</description>
<location>project</location>
</skill>

<skill>
<name>javascript-pro</name>
<description>Writes, debugs, and refactors JavaScript code using modern ES2023+ features, async/await patterns, ESM module systems, and Node.js APIs. Use when building vanilla JavaScript applications, implementing Promise-based async flows, optimising browser or Node.js performance, working with Web Workers or Fetch API, or reviewing .js/.mjs/.cjs files for correctness and best practices.</description>
<location>project</location>
</skill>

<skill>
<name>jpa-patterns</name>
<description>JPA/Hibernate patterns for entity design, relationships, query optimization, transactions, auditing, indexing, pagination, and pooling in Spring Boot.</description>
<location>project</location>
</skill>

<skill>
<name>kotlin-coroutines-flows</name>
<description>Kotlin Coroutines and Flow patterns for Android and KMP — structured concurrency, Flow operators, StateFlow, error handling, and testing.</description>
<location>project</location>
</skill>

<skill>
<name>kotlin-exposed-patterns</name>
<description>JetBrains Exposed ORM patterns including DSL queries, DAO pattern, transactions, HikariCP connection pooling, Flyway migrations, and repository pattern.</description>
<location>project</location>
</skill>

<skill>
<name>kotlin-ktor-patterns</name>
<description>Ktor server patterns including routing DSL, plugins, authentication, Koin DI, kotlinx.serialization, WebSockets, and testApplication testing.</description>
<location>project</location>
</skill>

<skill>
<name>kotlin-patterns</name>
<description>Idiomatic Kotlin patterns, best practices, and conventions for building robust, efficient, and maintainable Kotlin applications with coroutines, null safety, and DSL builders.</description>
<location>project</location>
</skill>

<skill>
<name>kotlin-specialist</name>
<description>Provides idiomatic Kotlin implementation patterns including coroutine concurrency, Flow stream handling, multiplatform architecture, Compose UI construction, Ktor server setup, and type-safe DSL design. Use when building Kotlin applications requiring coroutines, multiplatform development, or Android with Compose. Invoke for Flow API, KMP projects, Ktor servers, DSL design, sealed classes, suspend function, Android Kotlin, Kotlin Multiplatform.</description>
<location>project</location>
</skill>

<skill>
<name>kotlin-testing</name>
<description>Kotlin testing patterns with Kotest, MockK, coroutine testing, property-based testing, and Kover coverage. Follows TDD methodology with idiomatic Kotlin practices.</description>
<location>project</location>
</skill>

<skill>
<name>kubernetes-specialist</name>
<description>Use when deploying or managing Kubernetes workloads. Invoke to create deployment manifests, configure pod security policies, set up service accounts, define network isolation rules, debug pod crashes, analyze resource limits, inspect container logs, or right-size workloads. Use for Helm charts, RBAC policies, NetworkPolicies, storage configuration, performance optimization, GitOps pipelines, and multi-cluster management.</description>
<location>project</location>
</skill>

<skill>
<name>landing-page</name>
<description>"Generate a complete, deployable landing page from a brief. Produces a single self-contained HTML file with Tailwind CSS (via CDN), responsive design, dark mode, semantic HTML, and OG meta tags. Sections: hero with CTA, features, social proof, pricing (optional), FAQ, footer. Use when building a marketing page, product launch page, coming soon page, or any standalone landing page. Triggers: 'landing page', 'create a page', 'marketing page', 'launch page', 'coming soon page', 'one-page site'."</description>
<location>project</location>
</skill>

<skill>
<name>laravel-specialist</name>
<description>Build and configure Laravel 10+ applications, including creating Eloquent models and relationships, implementing Sanctum authentication, configuring Horizon queues, designing RESTful APIs with API resources, and building reactive interfaces with Livewire. Use when creating Laravel models, setting up queue workers, implementing Sanctum auth flows, building Livewire components, optimising Eloquent queries, or writing Pest/PHPUnit tests for Laravel features.</description>
<location>project</location>
</skill>

<skill>
<name>legacy-modernizer</name>
<description>Designs incremental migration strategies, identifies service boundaries, produces dependency maps and migration roadmaps, and generates API facade designs for aging codebases. Use when modernizing legacy systems, implementing strangler fig pattern or branch by abstraction, decomposing monoliths, upgrading frameworks or languages, or reducing technical debt without disrupting business operations.</description>
<location>project</location>
</skill>

<skill>
<name>linux-forensics</name>
<description>"Generalized Linux incident response and forensic analysis covering Debian/Ubuntu, RHEL/CentOS/Rocky, and SUSE families"</description>
<location>project</location>
</skill>

<skill>
<name>liquid-glass-design</name>
<description>iOS 26 Liquid Glass design system — dynamic glass material with blur, reflection, and interactive morphing for SwiftUI, UIKit, and WidgetKit.</description>
<location>project</location>
</skill>

<skill>
<name>llms-txt-support</name>
<description>Detect and use llms.txt files for LLM-optimized documentation. Use when checking if a site has LLM-ready docs before scraping.</description>
<location>project</location>
</skill>

<skill>
<name>log-analysis</name>
<description>"Multi-source log correlation across auth.log, syslog, journald, application logs, and web access logs with pattern detection for brute force, privilege escalation, and lateral movement"</description>
<location>project</location>
</skill>

<skill>
<name>logistics-exception-management</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>market-research</name>
<description>Conduct market research, competitive analysis, investor due diligence, and industry intelligence with source attribution and decision-oriented summaries. Use when the user wants market sizing, competitor comparisons, fund research, technology scans, or research that informs business decisions.</description>
<location>project</location>
</skill>

<skill>
<name>mcp-builder</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>mcp-developer</name>
<description>Use when building, debugging, or extending MCP servers or clients that connect AI systems with external tools and data sources. Invoke to implement tool handlers, configure resource providers, set up stdio/HTTP/SSE transport layers, validate schemas with Zod or Pydantic, debug protocol compliance issues, or scaffold complete MCP server/client projects using TypeScript or Python SDKs.</description>
<location>project</location>
</skill>

<skill>
<name>memory-forensics</name>
<description>"Volatility 3 memory forensics workflows covering acquisition with LiME and WinPmem, and structured analysis using Volatility 3 plugin reference"</description>
<location>project</location>
</skill>

<skill>
<name>microservices-architect</name>
<description>Designs distributed system architectures, decomposes monoliths into bounded-context services, recommends communication patterns, and produces service boundary diagrams and resilience strategies. Use when designing distributed systems, decomposing monoliths, or implementing microservices patterns — including service boundaries, DDD, saga patterns, event sourcing, CQRS, service mesh, or distributed tracing.</description>
<location>project</location>
</skill>

<skill>
<name>ml-pipeline</name>
<description>"Designs and implements production-grade ML pipeline infrastructure: configures experiment tracking with MLflow or Weights & Biases, creates Kubeflow or Airflow DAGs for training orchestration, builds feature store schemas with Feast, deploys model registries, and automates retraining and validation workflows. Use when building ML pipelines, orchestrating training workflows, automating model lifecycle, implementing feature stores, managing experiment tracking systems, setting up DVC for data versioning, tuning hyperparameters, or configuring MLOps tooling like Kubeflow, Airflow, MLflow, or Prefect."</description>
<location>project</location>
</skill>

<skill>
<name>model-detection</name>
<description>Universal model detection and capability assessment for optimal cross-model compatibility</description>
<location>project</location>
</skill>

<skill>
<name>monitoring-expert</name>
<description>Configures monitoring systems, implements structured logging pipelines, creates Prometheus/Grafana dashboards, defines alerting rules, and instruments distributed tracing. Implements Prometheus/Grafana stacks, conducts load testing, performs application profiling, and plans infrastructure capacity. Use when setting up application monitoring, adding observability to services, debugging production issues with logs/metrics/traces, running load tests with k6 or Artillery, profiling CPU/memory bottlenecks, or forecasting capacity needs.</description>
<location>project</location>
</skill>

<skill>
<name>mutation-test</name>
<description>Run mutation testing to validate test quality beyond code coverage. Use when assessing test effectiveness, finding weak tests, or validating test suite quality.</description>
<location>project</location>
</skill>

<skill>
<name>nanoclaw-repl</name>
<description>Operate and extend NanoClaw v2, ECC's zero-dependency session-aware REPL built on claude -p.</description>
<location>project</location>
</skill>

<skill>
<name>nestjs-expert</name>
<description>Creates and configures NestJS modules, controllers, services, DTOs, guards, and interceptors for enterprise-grade TypeScript backend applications. Use when building NestJS REST APIs or GraphQL services, implementing dependency injection, scaffolding modular architecture, adding JWT/Passport authentication, integrating TypeORM or Prisma, or working with .module.ts, .controller.ts, and .service.ts files. Invoke for guards, interceptors, pipes, validation, Swagger documentation, and unit/E2E testing in NestJS projects.</description>
<location>project</location>
</skill>

<skill>
<name>nextjs-advanced-routing</name>
<description>Guide for advanced Next.js App Router patterns including Route Handlers, Parallel Routes, Intercepting Routes, Server Actions, error boundaries, draft mode, and streaming with Suspense. CRITICAL for server actions (action.ts, actions.ts files, 'use server' directive), setting cookies from client components, and form handling. Use when requirements involve server actions, form submissions, cookies, mutations, API routes, `route.ts`, parallel routes, intercepting routes, or streaming. Essential for separating server actions from client components.</description>
<location>project</location>
</skill>

<skill>
<name>nextjs-anti-patterns</name>
<description>Identify and fix common Next.js App Router anti-patterns and mistakes. Use when reviewing code for Next.js best practices, debugging performance issues, migrating from Pages Router patterns, or preventing common pitfalls. Activates for code review, performance optimization, or detecting inappropriate useEffect/useState usage. CRITICAL: For browser detection, keep the logic in the user-facing component (or a composed helper that it renders) rather than isolating it in unused files.</description>
<location>project</location>
</skill>

<skill>
<name>nextjs-app-router-fundamentals</name>
<description>Guide for working with Next.js App Router (Next.js 13+). Use when migrating from Pages Router to App Router, creating layouts, implementing routing, handling metadata, or building Next.js 13+ applications. Activates for App Router migration, layout creation, routing patterns, or Next.js 13+ development tasks.</description>
<location>project</location>
</skill>

<skill>
<name>nextjs-client-cookie-pattern</name>
<description>Pattern for client components calling server actions to set cookies in Next.js. Covers the two-file pattern of a client component with user interaction (onClick, form submission) that calls a server action to modify cookies. Use when building features like authentication, preferences, or session management where client-side triggers need to set/modify server-side cookies.</description>
<location>project</location>
</skill>

<skill>
<name>nextjs-developer</name>
<description>"Use when building Next.js 14+ applications with App Router, server components, or server actions. Invoke to configure route handlers, implement middleware, set up API routes, add streaming SSR, write generateMetadata for SEO, scaffold loading.tsx/error.tsx boundaries, or deploy to Vercel. Triggers on: Next.js, Next.js 14, App Router, RSC, use server, Server Components, Server Actions, React Server Components, generateMetadata, loading.tsx, Next.js deployment, Vercel, Next.js performance."</description>
<location>project</location>
</skill>

<skill>
<name>nextjs-dynamic-routes-params</name>
<description>Guide for Next.js App Router dynamic routes and pathname parameters. Use when building pages that depend on URL segments (IDs, slugs, nested paths), accessing the `params` prop, or fetching resources by identifier. Helps avoid over-nesting by defaulting to the simplest route structure (e.g., `app/[id]` instead of `app/products/[id]` unless the URL calls for it).</description>
<location>project</location>
</skill>

<skill>
<name>nextjs-optimization</name>
<description>Optimize Next.js 15 applications for performance, Core Web Vitals, and production best practices using App Router patterns</description>
<location>project</location>
</skill>

<skill>
<name>nextjs-pathname-id-fetch</name>
<description>Focused pattern for fetching data using URL parameters in Next.js. Covers creating dynamic routes ([id], [slug]) and accessing route parameters in server components to fetch data from APIs. Use when building pages that display individual items (product pages, blog posts, user profiles) based on a URL parameter. Complements nextjs-dynamic-routes-params with a simplified, common-case pattern.</description>
<location>project</location>
</skill>

<skill>
<name>nextjs-server-client-components</name>
<description>Guide for choosing between Server Components and Client Components in Next.js App Router. CRITICAL for useSearchParams (requires Suspense + 'use client'), navigation (Link, redirect, useRouter), cookies/headers access, and 'use client' directive. Activates when prompt mentions useSearchParams, Suspense, navigation, routing, Link component, redirect, pathname, searchParams, cookies, headers, async components, or 'use client'. Essential for avoiding mixing server/client APIs.</description>
<location>project</location>
</skill>

<skill>
<name>nextjs-server-navigation</name>
<description>Guide for implementing navigation in Next.js Server Components using Link component and redirect() function. Covers the difference between server and client navigation methods. Use when adding links, redirects, or navigation logic in server components without converting them to client components unnecessarily.</description>
<location>project</location>
</skill>

<skill>
<name>nextjs-use-search-params-suspense</name>
<description>Pattern for using useSearchParams hook with Suspense boundary in Next.js. Covers the required combination of 'use client' directive and Suspense wrapper when accessing URL query parameters in client components. Use when building search interfaces, filters, pagination, or any feature that needs to read/manipulate URL query parameters client-side.</description>
<location>project</location>
</skill>

<skill>
<name>nutrient-document-processing</name>
<description>Process, convert, OCR, extract, redact, sign, and fill documents using the Nutrient DWS API. Works with PDFs, DOCX, XLSX, PPTX, HTML, and images.</description>
<location>project</location>
</skill>

<skill>
<name>nz-business-english</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>observability-audit</name>
<description>Audit code for observability gaps — debug logs left in, errors caught without being logged, missing context on log entries, untracked slow operations. Uses the app's existing observability tooling exclusively.</description>
<location>project</location>
</skill>

<skill>
<name>pair-programming</name>
<description>AI-assisted pair programming with multiple modes (driver/navigator/switch), real-time verification, quality monitoring, and comprehensive testing. Supports TDD, debugging, refactoring, and learning sessions. Features automatic role switching, continuous code review, security scanning, and performance optimization with truth-score verification.</description>
<location>project</location>
</skill>

<skill>
<name>pandas-pro</name>
<description>Performs pandas DataFrame operations for data analysis, manipulation, and transformation. Use when working with pandas DataFrames, data cleaning, aggregation, merging, or time series analysis. Invoke for data manipulation tasks such as joining DataFrames on multiple keys, pivoting tables, resampling time series, handling NaN values with interpolation or forward-fill, groupby aggregations, type conversion, or performance optimization of large datasets.</description>
<location>project</location>
</skill>

<skill>
<name>pattern-learning</name>
<description>Enables autonomous pattern recognition, storage, and retrieval at project level with self-learning capabilities for continuous improvement</description>
<location>project</location>
</skill>

<skill>
<name>pdf-extractor</name>
<description>Extract text, tables, and images from PDF files. Use when converting PDF documentation, manuals, or reports to searchable text.</description>
<location>project</location>
</skill>

<skill>
<name>performance-analysis</name>
<description>Comprehensive performance analysis, bottleneck detection, and optimization recommendations for Claude Flow swarms</description>
<location>project</location>
</skill>

<skill>
<name>performance-scaling</name>
<description>Cross-model performance optimization and scaling configurations for autonomous agents</description>
<location>project</location>
</skill>

<skill>
<name>perl-patterns</name>
<description>Modern Perl 5.36+ idioms, best practices, and conventions for building robust, maintainable Perl applications.</description>
<location>project</location>
</skill>

<skill>
<name>perl-security</name>
<description>Comprehensive Perl security covering taint mode, input validation, safe process execution, DBI parameterized queries, web security (XSS/SQLi/CSRF), and perlcritic security policies.</description>
<location>project</location>
</skill>

<skill>
<name>perl-testing</name>
<description>Perl testing patterns using Test2::V0, Test::More, prove runner, mocking, coverage with Devel::Cover, and TDD methodology.</description>
<location>project</location>
</skill>

<skill>
<name>php-pro</name>
<description>Use when building PHP applications with modern PHP 8.3+ features, Laravel, or Symfony frameworks. Invokes strict typing, PHPStan level 9, async patterns with Swoole, and PSR standards. Creates controllers, configures middleware, generates migrations, writes PHPUnit/Pest tests, defines typed DTOs and value objects, sets up dependency injection, and scaffolds REST/GraphQL APIs. Use when working with Eloquent, Doctrine, Composer, Psalm, ReactPHP, or any PHP API development.</description>
<location>project</location>
</skill>

<skill>
<name>plankton-code-quality</name>
<description>"Write-time code quality enforcement using Plankton — auto-formatting, linting, and Claude-powered fixes on every file edit via hooks."</description>
<location>project</location>
</skill>

<skill>
<name>planning</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>playwright-expert</name>
<description>"Use when writing E2E tests with Playwright, setting up test infrastructure, or debugging flaky browser tests. Invoke to write test scripts, create page objects, configure test fixtures, set up reporters, add CI integration, implement API mocking, or perform visual regression testing. Trigger terms: Playwright, E2E test, end-to-end, browser testing, automation, UI testing, visual testing, Page Object Model, test flakiness."</description>
<location>project</location>
</skill>

<skill>
<name>postgres-patterns</name>
<description>PostgreSQL database patterns for query optimization, schema design, indexing, and security. Based on Supabase best practices.</description>
<location>project</location>
</skill>

<skill>
<name>postgres-pro</name>
<description>Use when optimizing PostgreSQL queries, configuring replication, or implementing advanced database features. Invoke for EXPLAIN analysis, JSONB operations, extension usage, VACUUM tuning, performance monitoring.</description>
<location>project</location>
</skill>

<skill>
<name>pr-reviewer</name>
<description>Review GitHub pull requests for code quality, security, and best practices. Use for automated PR feedback and approval workflows.</description>
<location>project</location>
</skill>

<skill>
<name>predictive-skill-loading</name>
<description>Anticipates and pre-loads optimal skills before task execution based on pattern matching and historical success rates</description>
<location>project</location>
</skill>

<skill>
<name>production-scheduling</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>project-bootstrapper</name>
<description>Sets up new projects or improves existing projects with development best practices, tooling, documentation, and workflow automation. Use when user wants to start a new project, improve project structure, add development tooling, or establish professional workflows.</description>
<location>project</location>
</skill>

<skill>
<name>project-docs</name>
<description>"Generate project documentation from codebase analysis — ARCHITECTURE.md, API_ENDPOINTS.md, DATABASE_SCHEMA.md. Reads source code, schema files, routes, and config to produce accurate, structured docs. Use when starting a project, onboarding contributors, or when docs are missing or stale. Triggers: 'generate docs', 'document architecture', 'create api docs', 'document schema', 'project documentation', 'write architecture doc'."</description>
<location>project</location>
</skill>

<skill>
<name>project-guidelines-example</name>
<description>"Example project-specific skill template based on a real production application."</description>
<location>project</location>
</skill>

<skill>
<name>project-health</name>
<description>"All-in-one project configuration and health management. Sets up new projects (settings.local.json, CLAUDE.md, .gitignore), audits existing projects (permissions, context quality, MCP coverage, leaked secrets, stale docs), tidies accumulated cruft, captures session learnings, and adds permission presets. Uses sub-agents for heavy analysis to keep main context clean. Trigger with 'project health', 'check project', 'setup project', 'kickoff', 'bootstrap', 'tidy permissions', 'clean settings', 'capture learnings', 'audit context', 'add python permissions', or 'init project'."</description>
<location>project</location>
</skill>

<skill>
<name>prompt-engineer</name>
<description>Writes, refactors, and evaluates prompts for LLMs — generating optimized prompt templates, structured output schemas, evaluation rubrics, and test suites. Use when designing prompts for new LLM applications, refactoring existing prompts for better accuracy or token efficiency, implementing chain-of-thought or few-shot learning, creating system prompts with personas and guardrails, building JSON/function-calling schemas, or developing prompt evaluation frameworks to measure and improve model performance.</description>
<location>project</location>
</skill>

<skill>
<name>prompt-optimizer</name>
<description>>-</description>
<location>project</location>
</skill>

<skill>
<name>proposal-writer</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>pytest-runner</name>
<description>Execute Python tests with pytest, supporting fixtures, markers, coverage, and parallel execution. Use for Python test automation.</description>
<location>project</location>
</skill>

<skill>
<name>python-patterns</name>
<description>Pythonic idioms, PEP 8 standards, type hints, and best practices for building robust, efficient, and maintainable Python applications.</description>
<location>project</location>
</skill>

<skill>
<name>python-pro</name>
<description>Use when building Python 3.11+ applications requiring type safety, async programming, or robust error handling. Generates type-annotated Python code, configures mypy in strict mode, writes pytest test suites with fixtures and mocking, and validates code with black and ruff. Invoke for type hints, async/await patterns, dataclasses, dependency injection, logging configuration, and structured error handling.</description>
<location>project</location>
</skill>

<skill>
<name>python-testing</name>
<description>Python testing strategies using pytest, TDD methodology, fixtures, mocking, parametrization, and coverage requirements.</description>
<location>project</location>
</skill>

<skill>
<name>quality-checker</name>
<description>Validate skill quality, completeness, and adherence to standards. Use before packaging to ensure skill meets quality requirements.</description>
<location>project</location>
</skill>

<skill>
<name>quality-gates</name>
<description>Run comprehensive quality checks including linting, type checking, tests, and security audits before commits or deployments</description>
<location>project</location>
</skill>

<skill>
<name>quality-nonconformance</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>quality-standards</name>
<description>Defines code quality benchmarks, standards compliance, and best practices for maintaining high-quality codebases</description>
<location>project</location>
</skill>

<skill>
<name>rag-architect</name>
<description>Designs and implements production-grade RAG systems by chunking documents, generating embeddings, configuring vector stores, building hybrid search pipelines, applying reranking, and evaluating retrieval quality. Use when building RAG systems, vector databases, or knowledge-grounded AI applications requiring semantic search, document retrieval, context augmentation, similarity search, or embedding-based indexing.</description>
<location>project</location>
</skill>

<skill>
<name>rails-expert</name>
<description>Rails 7+ specialist that optimizes Active Record queries with includes/eager_load, implements Turbo Frames and Turbo Streams for partial page updates, configures Action Cable for WebSocket connections, sets up Sidekiq workers for background job processing, and writes comprehensive RSpec test suites. Use when building Rails 7+ web applications with Hotwire, real-time features, or background job processing. Invoke for Active Record optimization, Turbo Frames/Streams, Action Cable, Sidekiq, RSpec Rails.</description>
<location>project</location>
</skill>

<skill>
<name>ralph-loop</name>
<description>Detect requests for iterative AI task loops and invoke the Ralph command</description>
<location>project</location>
</skill>

<skill>
<name>ralphinho-rfc-pipeline</name>
<description>RFC-driven multi-agent DAG execution pattern with quality gates, merge queues, and work unit orchestration.</description>
<location>project</location>
</skill>

<skill>
<name>react-expert</name>
<description>Use when building React 18+ applications in .jsx or .tsx files, Next.js App Router projects, or create-react-app setups. Creates components, implements custom hooks, debugs rendering issues, migrates class components to functional, and implements state management. Invoke for Server Components, Suspense boundaries, useActionState forms, performance optimization, or React 19 features.</description>
<location>project</location>
</skill>

<skill>
<name>react-native-expert</name>
<description>Builds, optimizes, and debugs cross-platform mobile applications with React Native and Expo. Implements navigation hierarchies (tabs, stacks, drawers), configures native modules, optimizes FlatList rendering with memo and useCallback, and handles platform-specific code for iOS and Android. Use when building a React Native or Expo mobile app, setting up navigation, integrating native modules, improving scroll performance, handling SafeArea or keyboard input, or configuring Expo SDK projects.</description>
<location>project</location>
</skill>

<skill>
<name>reasoningbank-agentdb</name>
<description>"Implement ReasoningBank adaptive learning with AgentDB's 150x faster vector database. Includes trajectory tracking, verdict judgment, memory distillation, and pattern recognition. Use when building self-learning agents, optimizing decision-making, or implementing experience replay systems."</description>
<location>project</location>
</skill>

<skill>
<name>reasoningbank-intelligence</name>
<description>"Implement adaptive learning with ReasoningBank for pattern recognition, strategy optimization, and continuous improvement. Use when building self-learning agents, optimizing workflows, or implementing meta-cognitive systems."</description>
<location>project</location>
</skill>

<skill>
<name>recipe-add-integration-tests</name>
<description>Add integration/E2E tests to existing backend codebase using Design Doc</description>
<location>project</location>
</skill>

<skill>
<name>recipe-build</name>
<description>Execute decomposed tasks in autonomous execution mode</description>
<location>project</location>
</skill>

<skill>
<name>recipe-design</name>
<description>Execute from requirement analysis to design document creation</description>
<location>project</location>
</skill>

<skill>
<name>recipe-diagnose</name>
<description>Investigate problem, verify findings, and derive solutions</description>
<location>project</location>
</skill>

<skill>
<name>recipe-front-build</name>
<description>Execute frontend implementation in autonomous execution mode</description>
<location>project</location>
</skill>

<skill>
<name>recipe-front-design</name>
<description>Execute from requirement analysis to frontend design document creation</description>
<location>project</location>
</skill>

<skill>
<name>recipe-front-plan</name>
<description>Create frontend work plan from design document and obtain plan approval</description>
<location>project</location>
</skill>

<skill>
<name>recipe-front-review</name>
<description>Design Doc compliance validation with optional auto-fixes</description>
<location>project</location>
</skill>

<skill>
<name>recipe-fullstack-build</name>
<description>Execute decomposed fullstack tasks with layer-aware agent routing</description>
<location>project</location>
</skill>

<skill>
<name>recipe-fullstack-implement</name>
<description>Orchestrate full-cycle implementation across backend and frontend layers</description>
<location>project</location>
</skill>

<skill>
<name>recipe-implement</name>
<description>Orchestrate the complete implementation lifecycle from requirements to deployment</description>
<location>project</location>
</skill>

<skill>
<name>recipe-plan</name>
<description>Create work plan from design document and obtain plan approval</description>
<location>project</location>
</skill>

<skill>
<name>recipe-reverse-engineer</name>
<description>Generate PRD and Design Docs from existing codebase through discovery, generation, verification, and review workflow</description>
<location>project</location>
</skill>

<skill>
<name>recipe-review</name>
<description>Design Doc compliance validation with optional auto-fixes</description>
<location>project</location>
</skill>

<skill>
<name>recipe-task</name>
<description>Execute tasks following appropriate rules with rule-advisor metacognition</description>
<location>project</location>
</skill>

<skill>
<name>recipe-update-doc</name>
<description>Update existing design documents (Design Doc / PRD / ADR) with review</description>
<location>project</location>
</skill>

<skill>
<name>regex-vs-llm-structured-text</name>
<description>Decision framework for choosing between regex and LLM when parsing structured text — start with regex, add LLM only for low-confidence edge cases.</description>
<location>project</location>
</skill>

<skill>
<name>repo-analyzer</name>
<description>Analyze GitHub repositories for structure, documentation, dependencies, and contribution patterns. Use for codebase understanding and health assessment.</description>
<location>project</location>
</skill>

<skill>
<name>responsiveness-check</name>
<description>"Test website responsiveness across viewport widths using browser automation. Resizes a single session through breakpoints, screenshots each width, and detects layout transitions (column changes, nav switches, overflow). Produces comparison reports showing exactly where layouts break. Trigger with 'responsiveness check', 'check responsive', 'breakpoint test', 'viewport test', 'responsive sweep', 'check breakpoints', or 'test at mobile'."</description>
<location>project</location>
</skill>

<skill>
<name>resume-cover-letter</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>returns-reverse-logistics</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>review-implementing</name>
<description>Process and implement code review feedback systematically. Use when user provides reviewer comments, PR feedback, code review notes, or asks to implement suggestions from reviews.</description>
<location>project</location>
</skill>

<skill>
<name>rlm-mode</name>
<description>Detect requests for recursive decomposition and large-scale operations that benefit from RLM processing</description>
<location>project</location>
</skill>

<skill>
<name>rust-engineer</name>
<description>Writes, reviews, and debugs idiomatic Rust code with memory safety and zero-cost abstractions. Implements ownership patterns, manages lifetimes, designs trait hierarchies, builds async applications with tokio, and structures error handling with Result/Option. Use when building Rust applications, solving ownership or borrowing issues, designing trait-based APIs, implementing async/await concurrency, creating FFI bindings, or optimizing for performance and memory safety. Invoke for Rust, Cargo, ownership, borrowing, lifetimes, async Rust, tokio, zero-cost abstractions, memory safety, systems programming.</description>
<location>project</location>
</skill>

<skill>
<name>salesforce-developer</name>
<description>Writes and debugs Apex code, builds Lightning Web Components, optimizes SOQL queries, implements triggers, batch jobs, platform events, and integrations on the Salesforce platform. Use when developing Salesforce applications, customizing CRM workflows, managing governor limits, bulk processing, or setting up Salesforce DX and CI/CD pipelines.</description>
<location>project</location>
</skill>

<skill>
<name>search-first</name>
<description>Research-before-coding workflow. Search for existing tools, libraries, and patterns before writing custom code. Invokes the researcher agent.</description>
<location>project</location>
</skill>

<skill>
<name>secure-code-guardian</name>
<description>Use when implementing authentication/authorization, securing user input, or preventing OWASP Top 10 vulnerabilities — including custom security implementations such as hashing passwords with bcrypt/argon2, sanitizing SQL queries with parameterized statements, configuring CORS/CSP headers, validating input with Zod, and setting up JWT tokens. Invoke for authentication, authorization, input validation, encryption, OWASP Top 10 prevention, secure session management, and security hardening. For pre-built OAuth/SSO integrations or standalone security audits, consider a more specialized skill.</description>
<location>project</location>
</skill>

<skill>
<name>security-patterns</name>
<description>Comprehensive OWASP security guidelines, secure coding patterns, vulnerability prevention strategies, and remediation best practices for building secure applications</description>
<location>project</location>
</skill>

<skill>
<name>security-review</name>
<description>Use this skill when adding authentication, handling user input, working with secrets, creating API endpoints, or implementing payment/sensitive features. Provides comprehensive security checklist and patterns.</description>
<location>project</location>
</skill>

<skill>
<name>security-reviewer</name>
<description>Identifies security vulnerabilities, generates structured audit reports with severity ratings, and provides actionable remediation guidance. Use when conducting security audits, reviewing code for vulnerabilities, or analyzing infrastructure security. Invoke for SAST scans, penetration testing, DevSecOps practices, cloud security reviews, dependency audits, secrets scanning, or compliance checks. Produces vulnerability reports, prioritized recommendations, and compliance checklists.</description>
<location>project</location>
</skill>

<skill>
<name>security-scan</name>
<description>Scan your Claude Code configuration (.claude/ directory) for security vulnerabilities, misconfigurations, and injection risks using AgentShield. Checks CLAUDE.md, settings.json, MCP servers, hooks, and agent definitions.</description>
<location>project</location>
</skill>

<skill>
<name>seo-local-business</name>
<description>"Generate complete SEO setup for local business websites — HTML head tags, JSON-LD LocalBusiness schema, robots.txt, sitemap.xml. Australian-optimised with +61 phone, ABN, suburb patterns."</description>
<location>project</location>
</skill>

<skill>
<name>shadcn-ui</name>
<description>"Install and configure shadcn/ui components for React projects. Guides component selection, installation order, dependency management, customisation with semantic tokens, and common UI recipes (forms, data tables, navigation, modals). Use after tailwind-theme-builder has set up the theme infrastructure, when adding components, building forms, creating data tables, or setting up navigation."</description>
<location>project</location>
</skill>

<skill>
<name>shopify-content</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>shopify-expert</name>
<description>Builds and debugs Shopify themes (.liquid files, theme.json, sections), develops custom Shopify apps (shopify.app.toml, OAuth, webhooks), and implements Storefront API integrations for headless storefronts. Use when building or customizing Shopify themes, creating Hydrogen or custom React storefronts, developing Shopify apps, implementing checkout UI extensions or Shopify Functions, optimizing performance, or integrating third-party services. Invoke for Liquid templating, Storefront API, app development, checkout customization, Shopify Plus features, App Bridge, Polaris, or Shopify CLI workflows.</description>
<location>project</location>
</skill>

<skill>
<name>shopify-products</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>shopify-setup</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>sigma-hunting</name>
<description>"Apply Sigma rules against log sources for threat hunting; convert rules to Elasticsearch, Splunk, and grep queries"</description>
<location>project</location>
</skill>

<skill>
<name>skill-builder</name>
<description>"Create new Claude Code Skills with proper YAML frontmatter, progressive disclosure structure, and complete directory organization. Use when you need to build custom skills for specific workflows, generate skill templates, or understand the Claude Skills specification."</description>
<location>project</location>
</skill>

<skill>
<name>skill-enhancer</name>
<description>AI-powered enhancement of skill SKILL.md files. Use to transform basic templates into comprehensive, high-quality skill documentation.</description>
<location>project</location>
</skill>

<skill>
<name>skill-packager</name>
<description>Package skills into uploadable ZIP files for Claude. Use after skill-builder/skill-enhancer to create final upload package.</description>
<location>project</location>
</skill>

<skill>
<name>skill-stocktake</name>
<description>"Use when auditing Claude skills and commands for quality. Supports Quick Scan (changed skills only) and Full Stocktake modes with sequential subagent batch evaluation."</description>
<location>project</location>
</skill>

<skill>
<name>slides</name>
<description>Create strategic HTML presentations with Chart.js, design tokens, responsive layouts, copywriting formulas, and contextual slide strategies.</description>
<location>project</location>
</skill>

<skill>
<name>social-media-posts</name>
<description>"Create platform-specific social media posts for LinkedIn, Facebook, Instagram, and Reddit. Handles character limits, hashtag strategies, hook placement, and image specs per platform. Works from scratch, from existing content (blog, newsletter, announcement), or as a multi-platform campaign. Produces copy-paste-ready posts. Triggers: 'social media post', 'linkedin post', 'facebook post', 'instagram caption', 'reddit post', 'social posts', 'post to social', 'repurpose for social', 'social media campaign'."</description>
<location>project</location>
</skill>

<skill>
<name>source-unifier</name>
<description>Merge multiple documentation sources (docs, GitHub, PDF) with conflict detection. Use when combining docs + code for complete skill coverage.</description>
<location>project</location>
</skill>

<skill>
<name>sparc-methodology</name>
<description>SPARC (Specification, Pseudocode, Architecture, Refinement, Completion) comprehensive development methodology with multi-agent orchestration</description>
<location>project</location>
</skill>

<skill>
<name>spark-engineer</name>
<description>Use when writing Spark jobs, debugging performance issues, or configuring cluster settings for Apache Spark applications, distributed data processing pipelines, or big data workloads. Invoke to write DataFrame transformations, optimize Spark SQL queries, implement RDD pipelines, tune shuffle operations, configure executor memory, process .parquet files, handle data partitioning, or build structured streaming analytics.</description>
<location>project</location>
</skill>

<skill>
<name>spec-miner</name>
<description>"Reverse-engineering specialist that extracts specifications from existing codebases. Use when working with legacy or undocumented systems, inherited projects, or old codebases with no documentation. Invoke to map code dependencies, generate API documentation from source, identify undocumented business logic, figure out what code does, or create architecture documentation from implementation. Trigger phrases: reverse engineer, old codebase, no docs, no documentation, figure out how this works, inherited project, legacy analysis, code archaeology, undocumented features."</description>
<location>project</location>
</skill>

<skill>
<name>spring-boot-engineer</name>
<description>Generates Spring Boot 3.x configurations, creates REST controllers, implements Spring Security 6 authentication flows, sets up Spring Data JPA repositories, and configures reactive WebFlux endpoints. Use when building Spring Boot 3.x applications, microservices, or reactive Java applications; invoke for Spring Data JPA, Spring Security 6, WebFlux, Spring Cloud integration, Java REST API design, or Microservices Java architecture.</description>
<location>project</location>
</skill>

<skill>
<name>springboot-patterns</name>
<description>Spring Boot architecture patterns, REST API design, layered services, data access, caching, async processing, and logging. Use for Java Spring Boot backend work.</description>
<location>project</location>
</skill>

<skill>
<name>springboot-security</name>
<description>Spring Security best practices for authn/authz, validation, CSRF, secrets, headers, rate limiting, and dependency security in Java Spring Boot services.</description>
<location>project</location>
</skill>

<skill>
<name>springboot-tdd</name>
<description>Test-driven development for Spring Boot using JUnit 5, Mockito, MockMvc, Testcontainers, and JaCoCo. Use when adding features, fixing bugs, or refactoring.</description>
<location>project</location>
</skill>

<skill>
<name>springboot-verification</name>
<description>"Verification loop for Spring Boot projects: build, static analysis, tests with coverage, security scans, and diff review before release or PR."</description>
<location>project</location>
</skill>

<skill>
<name>sql-pro</name>
<description>Optimizes SQL queries, designs database schemas, and troubleshoots performance issues. Use when a user asks why their query is slow, needs help writing complex joins or aggregations, mentions database performance issues, or wants to design or migrate a schema. Invoke for complex queries, window functions, CTEs, indexing strategies, query plan analysis, covering index creation, recursive queries, EXPLAIN/ANALYZE interpretation, before/after query benchmarking, or migrating queries between database dialects (PostgreSQL, MySQL, SQL Server, Oracle).</description>
<location>project</location>
</skill>

<skill>
<name>sre-engineer</name>
<description>Defines service level objectives, creates error budget policies, designs incident response procedures, develops capacity models, and produces monitoring configurations and automation scripts for production systems. Use when defining SLIs/SLOs, managing error budgets, building reliable systems at scale, incident management, chaos engineering, toil reduction, or capacity planning.</description>
<location>project</location>
</skill>

<skill>
<name>strategic-compact</name>
<description>Suggests manual context compaction at logical intervals to preserve context through task phases rather than arbitrary auto-compaction.</description>
<location>project</location>
</skill>

<skill>
<name>strategy-document</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>stream-chain</name>
<description>Stream-JSON chaining for multi-agent pipelines, data transformation, and sequential workflows</description>
<location>project</location>
</skill>

<skill>
<name>subagents-orchestration-guide</name>
<description>Guides subagent coordination through implementation workflows. Use when orchestrating multiple agents, managing workflow phases, or determining autonomous execution mode.</description>
<location>project</location>
</skill>

<skill>
<name>supply-chain-forensics</name>
<description>"SBOM analysis, build pipeline forensics, and dependency verification covering package integrity, build reproducibility, and CI/CD pipeline tampering"</description>
<location>project</location>
</skill>

<skill>
<name>swarm-advanced</name>
<description>Advanced swarm orchestration patterns for research, development, testing, and complex distributed workflows</description>
<location>project</location>
</skill>

<skill>
<name>swarm-orchestration</name>
<description>"Orchestrate multi-agent swarms with agentic-flow for parallel task execution, dynamic topology, and intelligent coordination. Use when scaling beyond single agents, implementing complex workflows, or building distributed AI systems."</description>
<location>project</location>
</skill>

<skill>
<name>swift-actor-persistence</name>
<description>Thread-safe data persistence in Swift using actors — in-memory cache with file-backed storage, eliminating data races by design.</description>
<location>project</location>
</skill>

<skill>
<name>swift-concurrency-6-2</name>
<description>Swift 6.2 Approachable Concurrency — single-threaded by default, @concurrent for explicit background offloading, isolated conformances for main actor types.</description>
<location>project</location>
</skill>

<skill>
<name>swift-expert</name>
<description>Builds iOS/macOS/watchOS/tvOS applications, implements SwiftUI views and state management, designs protocol-oriented architectures, handles async/await concurrency, implements actors for thread safety, and debugs Swift-specific issues. Use when building iOS/macOS applications with Swift 5.9+, SwiftUI, or async/await concurrency. Invoke for protocol-oriented programming, SwiftUI state management, actors, server-side Swift, UIKit integration, Combine, or Vapor.</description>
<location>project</location>
</skill>

<skill>
<name>swift-protocol-di-testing</name>
<description>Protocol-based dependency injection for testable Swift code — mock file system, network, and external APIs using focused protocols and Swift Testing.</description>
<location>project</location>
</skill>

<skill>
<name>swiftui-patterns</name>
<description>SwiftUI architecture patterns, state management with @Observable, view composition, navigation, performance optimization, and modern iOS/macOS UI best practices.</description>
<location>project</location>
</skill>

<skill>
<name>tailwind-theme-builder</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>tanstack-start</name>
<description>"Build a full-stack TanStack Start app on Cloudflare Workers from scratch — SSR, file-based routing, server functions, D1+Drizzle, better-auth, Tailwind v4+shadcn/ui. No template repo — Claude generates every file fresh per project."</description>
<location>project</location>
</skill>

<skill>
<name>target-profiling</name>
<description>"Research and build a target system profile via SSH — discovers OS, services, users, network baseline, and security stack"</description>
<location>project</location>
</skill>

<skill>
<name>task-analyzer</name>
<description>Performs metacognitive task analysis and skill selection. Use when determining task complexity, selecting appropriate skills, or estimating work scale.</description>
<location>project</location>
</skill>

<skill>
<name>tdd-enforce</name>
<description>Configure TDD enforcement via pre-commit hooks and CI coverage gates. Use when setting up test-first development workflow, adding coverage gates, or enforcing TDD practices.</description>
<location>project</location>
</skill>

<skill>
<name>tdd-workflow</name>
<description>Use this skill when writing new features, fixing bugs, or refactoring code. Enforces test-driven development with 80%+ coverage including unit, integration, and E2E tests.</description>
<location>project</location>
</skill>

<skill>
<name>team-update</name>
<description>"Post project updates to team chat, gather feedback, triage responses, and plan next steps. Adapts to available tools (chat, git, issues, tasks). First run discovers tools and saves a playbook; subsequent runs execute from the playbook. Trigger with 'team update', 'post update', 'sync with team', 'standup', 'check team chat', 'feedback loop', 'project update', 'what did the team say'."</description>
<location>project</location>
</skill>

<skill>
<name>technical-doc-creator</name>
<description>Create HTML technical documentation with code blocks, API workflows, system architecture diagrams, and syntax highlighting. Use when users request technical documentation, API docs, API references, code examples, or developer documentation.</description>
<location>project</location>
</skill>

<skill>
<name>terraform-engineer</name>
<description>Use when implementing infrastructure as code with Terraform across AWS, Azure, or GCP. Invoke for module development (create reusable modules, manage module versioning), state management (migrate backends, import existing resources, resolve state conflicts), provider configuration, multi-environment workflows, and infrastructure testing.</description>
<location>project</location>
</skill>

<skill>
<name>test-fixing</name>
<description>Run tests and systematically fix all failing tests using smart error grouping. Use when user asks to fix failing tests, mentions test failures, runs test suite and failures occur, or requests to make tests pass.</description>
<location>project</location>
</skill>

<skill>
<name>test-implement</name>
<description>Test implementation patterns and conventions. Use when implementing unit tests, integration tests, or E2E tests, including RTL+Vitest+MSW component testing and Playwright E2E testing.</description>
<location>project</location>
</skill>

<skill>
<name>test-master</name>
<description>Generates test files, creates mocking strategies, analyzes code coverage, designs test architectures, and produces test plans and defect reports across functional, performance, and security testing disciplines. Use when writing unit tests, integration tests, or E2E tests; creating test strategies or automation frameworks; analyzing coverage gaps; performance testing with k6 or Artillery; security testing with OWASP methods; debugging flaky tests; or working on QA, regression, test automation, quality gates, shift-left testing, or test maintenance.</description>
<location>project</location>
</skill>

<skill>
<name>test-sync</name>
<description>Detect orphaned tests, obsolete assertions, and test-code misalignment. Use for test suite maintenance, cleanup, and traceability validation.</description>
<location>project</location>
</skill>

<skill>
<name>testing-principles</name>
<description>Language-agnostic testing principles including TDD, test quality, coverage standards, and test design patterns. Use when writing tests, designing test strategies, or reviewing test quality.</description>
<location>project</location>
</skill>

<skill>
<name>testing-strategies</name>
<description>Provides test design patterns, coverage strategies, and best practices for comprehensive test suite development</description>
<location>project</location>
</skill>

<skill>
<name>testing-strategy</name>
<description>Comprehensive testing strategy using Vitest for unit/integration tests and Playwright for E2E tests with best practices and coverage targets</description>
<location>project</location>
</skill>

<skill>
<name>the-fool</name>
<description>Use when challenging ideas, plans, decisions, or proposals using structured critical reasoning. Invoke to play devil's advocate, run a pre-mortem, red team, or audit evidence and assumptions.</description>
<location>project</location>
</skill>

<skill>
<name>timeline-creator</name>
<description>Create HTML timelines and project roadmaps with Gantt charts, milestones, phase groupings, and progress indicators. Use when users request timelines, roadmaps, Gantt charts, project schedules, or milestone visualizations.</description>
<location>project</location>
</skill>

<skill>
<name>typescript-pro</name>
<description>Implements advanced TypeScript type systems, creates custom type guards, utility types, and branded types, and configures tRPC for end-to-end type safety. Use when building TypeScript applications requiring advanced generics, conditional or mapped types, discriminated unions, monorepo setup, or full-stack type safety with tRPC.</description>
<location>project</location>
</skill>

<skill>
<name>typescript-rules</name>
<description>React/TypeScript frontend development rules including type safety, component design, state management, and error handling. Use when implementing React components, TypeScript code, or frontend features.</description>
<location>project</location>
</skill>

<skill>
<name>uat-mode</name>
<description>Detect requests for UAT generation, execution, or reporting and invoke the appropriate UAT command</description>
<location>project</location>
</skill>

<skill>
<name>ui-styling</name>
<description>Create beautiful, accessible user interfaces with shadcn/ui components (built on Radix UI + Tailwind), Tailwind CSS utility-first styling, and canvas-based visual designs. Use when building user interfaces, implementing design systems, creating responsive layouts, adding accessible components (dialogs, dropdowns, forms, tables), customizing themes and colors, implementing dark mode, generating visual designs and posters, or establishing consistent styling patterns across applications.</description>
<location>project</location>
</skill>

<skill>
<name>ui-ux-pro-max</name>
<description>"UI/UX design intelligence for web and mobile. Includes 50+ styles, 161 color palettes, 57 font pairings, 161 product types, 99 UX guidelines, and 25 chart types across 10 stacks (React, Next.js, Vue, Svelte, SwiftUI, React Native, Flutter, Tailwind, shadcn/ui, and HTML/CSS). Actions: plan, build, create, design, implement, review, fix, improve, optimize, enhance, refactor, and check UI/UX code. Projects: website, landing page, dashboard, admin panel, e-commerce, SaaS, portfolio, blog, and mobile app. Elements: button, modal, navbar, sidebar, card, table, form, and chart. Styles: glassmorphism, claymorphism, minimalism, brutalism, neumorphism, bento grid, dark mode, responsive, skeuomorphism, and flat design. Topics: color systems, accessibility, animation, layout, typography, font pairing, spacing, interaction states, shadow, and gradient. Integrations: shadcn/ui MCP for component search and examples."</description>
<location>project</location>
</skill>

<skill>
<name>uk-business-english</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>us-business-english</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>ux-audit</name>
<description>"Dogfood web apps — browse as a real user, notice friction, document findings. Adopts a user persona, tracks emotional friction (trust, anxiety, confusion), counts click efficiency, tests resilience (mid-form navigation, back button, refresh), and asks 'would I come back?'. Produces ranked audit reports. Trigger with 'ux audit', 'dogfood this', 'ux walkthrough', 'qa test', 'test the app', or 'check all pages'."</description>
<location>project</location>
</skill>

<skill>
<name>ux-states-audit</name>
<description>Audit UI code for missing loading states, empty states, and error states. Every async operation and data-driven UI must handle all three. Finds gaps and implements the missing states using the app's existing patterns.</description>
<location>project</location>
</skill>

<skill>
<name>validation-standards</name>
<description>Tool usage requirements, failure patterns, consistency checks, and validation methodologies for Claude Code operations</description>
<location>project</location>
</skill>

<skill>
<name>venv-manager</name>
<description>Create, manage, and validate Python virtual environments. Use for project isolation and dependency management.</description>
<location>project</location>
</skill>

<skill>
<name>vercel-ai-sdk</name>
<description>Guide for Vercel AI SDK v5 implementation patterns including generateText, streamText, useChat hook, tool calling, embeddings, and MCP integration. Use when implementing AI chat interfaces, streaming responses, tool/function calling, text embeddings, or working with convertToModelMessages and toUIMessageStreamResponse. Activates for AI SDK integration, useChat hook usage, message streaming, or tool calling tasks.</description>
<location>project</location>
</skill>

<skill>
<name>verification-loop</name>
<description>"A comprehensive verification system for Claude Code sessions."</description>
<location>project</location>
</skill>

<skill>
<name>verification-quality</name>
<description>"Comprehensive truth scoring, code quality verification, and automatic rollback system with 0.95 accuracy threshold for ensuring high-quality agent outputs and codebase reliability."</description>
<location>project</location>
</skill>

<skill>
<name>video-editing</name>
<description>AI-assisted video editing workflows for cutting, structuring, and augmenting real footage. Covers the full pipeline from raw capture through FFmpeg, Remotion, ElevenLabs, fal.ai, and final polish in Descript or CapCut. Use when the user wants to edit video, cut footage, create vlogs, or build video content.</description>
<location>project</location>
</skill>

<skill>
<name>videodb</name>
<description>See, Understand, Act on video and audio. See- ingest from local files, URLs, RTSP/live feeds, or live record desktop; return realtime context and playable stream links. Understand- extract frames, build visual/semantic/temporal indexes, and search moments with timestamps and auto-clips. Act- transcode and normalize (codec, fps, resolution, aspect ratio), perform timeline edits (subtitles, text/image overlays, branding, audio overlays, dubbing, translation), generate media assets (image, audio, video), and create real time alerts for events from live streams or desktop capture.</description>
<location>project</location>
</skill>

<skill>
<name>visa-doc-translate</name>
<description>Translate visa application documents (images) to English and create a bilingual PDF with original and translation</description>
<location>project</location>
</skill>

<skill>
<name>vite-flare-starter</name>
<description>"Scaffold a full-stack Cloudflare app from vite-flare-starter — React 19, Hono, D1+Drizzle, better-auth, Tailwind v4+shadcn/ui, TanStack Query, R2, Workers AI. Run setup.sh to clone, configure, and deploy."</description>
<location>project</location>
</skill>

<skill>
<name>vitest-runner</name>
<description>Execute JavaScript/TypeScript tests with Vitest, supporting coverage, watch mode, and parallel execution. Use for JS/TS test automation.</description>
<location>project</location>
</skill>

<skill>
<name>voice-apply</name>
<description>Applies a voice profile to transform content. Use when user asks to write in a specific voice, match a tone, apply a style, or transform content to sound like a particular voice profile.</description>
<location>project</location>
</skill>

<skill>
<name>vue-expert</name>
<description>Builds Vue 3 components with Composition API patterns, configures Nuxt 3 SSR/SSG projects, sets up Pinia stores, scaffolds Quasar/Capacitor mobile apps, implements PWA features, and optimises Vite builds. Use when creating Vue 3 applications with Composition API, writing reusable composables, managing state with Pinia, building hybrid mobile apps with Quasar or Capacitor, configuring service workers, or tuning Vite configuration and TypeScript integration.</description>
<location>project</location>
</skill>

<skill>
<name>vue-expert-js</name>
<description>Creates Vue 3 components, builds vanilla JS composables, configures Vite projects, and sets up routing and state management using JavaScript only — no TypeScript. Generates JSDoc-typed code with @typedef, @param, and @returns annotations for full type coverage without a TS compiler. Use when building Vue 3 applications with JavaScript only (no TypeScript), when projects require JSDoc-based type hints, when migrating from Vue 2 Options API to Composition API in JS, or when teams prefer vanilla JavaScript, .mjs modules, or need quick prototypes without TypeScript setup.</description>
<location>project</location>
</skill>

<skill>
<name>web-artifacts-builder</name>
<description>Modern web development patterns using React + Tailwind CSS + shadcn/ui for building production-quality, accessible, and performant web applications</description>
<location>project</location>
</skill>

<skill>
<name>web-search-fallback</name>
<description>Autonomous agent-based web search fallback for when WebSearch API fails or hits limits</description>
<location>project</location>
</skill>

<skill>
<name>web-validation</name>
<description>Comprehensive web page validation with authentication, screenshot capture, mobile testing, and enhanced error detection</description>
<location>project</location>
</skill>

<skill>
<name>websocket-engineer</name>
<description>Use when building real-time communication systems with WebSockets or Socket.IO. Invoke for bidirectional messaging, horizontal scaling with Redis, presence tracking, room management.</description>
<location>project</location>
</skill>

<skill>
<name>wordpress-content</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>wordpress-elementor</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>wordpress-pro</name>
<description>Develops custom WordPress themes and plugins, creates and registers Gutenberg blocks and block patterns, configures WooCommerce stores, implements WordPress REST API endpoints, applies security hardening (nonces, sanitization, escaping, capability checks), and optimizes performance through caching and query tuning. Use when building WordPress themes, writing plugins, customizing Gutenberg blocks, extending WooCommerce, working with ACF, using the WordPress REST API, applying hooks and filters, or improving WordPress performance and security.</description>
<location>project</location>
</skill>

<skill>
<name>wordpress-setup</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>x-api</name>
<description>X/Twitter API integration for posting tweets, threads, reading timelines, search, and analytics. Covers OAuth auth patterns, rate limits, and platform-native content posting. Use when the user wants to interact with X programmatically.</description>
<location>project</location>
</skill>

</available_skills>
<!-- SKILLS_TABLE_END -->

</skills_system>
