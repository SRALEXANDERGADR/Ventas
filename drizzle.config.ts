import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './db/schema.ts',
  out: './db/migrations',
  dbCredentials: {
    // drizzle-kit corre en Node (fuera de Cloudflare Workers), por lo que
    // aquí sí se lee de process.env. Define DATABASE_URL en un archivo
    // .env local (no lo subas a git) apuntando a tu base de datos de Neon.
    url: process.env.DATABASE_URL as string,
  },
})
