# ============================================
# Base Stage
# ============================================
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# ============================================
# Dependencies Stage
# ============================================
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# ============================================
# Development Stage
# ============================================
FROM base AS development
RUN apk add --no-cache netcat-openbsd
COPY --from=deps /app/node_modules ./node_modules
COPY . .
COPY docker/app/entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh
ENV NODE_ENV=development
EXPOSE 3000
CMD ["/entrypoint.sh"]

# ============================================
# Builder Stage
# ============================================
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Enable standalone output for Docker/Coolify
ENV DOCKER=true
RUN npm run build

# ============================================
# Production Stage
# ============================================
FROM base AS production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache netcat-openbsd postgresql16-client
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Backup directory for pre-migration dumps
RUN mkdir -p /backups && chown nextjs:nodejs /backups

# Standalone Next.js output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Full node_modules for drizzle-kit push + tsx (schema migration & seeding at startup)
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Drizzle config + schema for migrations and seeding
COPY --from=builder --chown=nextjs:nodejs /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/db ./src/lib/db
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/types ./src/lib/types
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Writable upload directory for BI documents
RUN mkdir -p /app/data/uploads/bi && chown -R nextjs:nodejs /app/data
ENV BI_UPLOAD_DIR=/app/data/uploads/bi

# Production entrypoint (DB wait, migration, seeding, then server)
COPY --chown=nextjs:nodejs docker/app/entrypoint.prod.sh /entrypoint.prod.sh
RUN sed -i 's/\r$//' /entrypoint.prod.sh && chmod +x /entrypoint.prod.sh

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["/entrypoint.prod.sh"]
