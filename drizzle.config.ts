import { defineConfig } from 'drizzle-kit'

// Note: This config is only used for migrations (drizzle-kit commands)
// It's not imported during the Next.js build process
export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    // DATABASE_URL is required only when running drizzle-kit commands
    // Not needed during Vercel build (migrations should be run separately)
    url: process.env.DATABASE_URL || 'postgresql://placeholder:placeholder@localhost:5432/placeholder',
  },
  verbose: true,
  strict: true,
})
