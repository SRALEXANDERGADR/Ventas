// Tipado mínimo de las variables/secretos de Cloudflare Workers usados por la app.
// Cuando ejecutes `pnpm cf-typegen` (o `npm run cf-typegen`), Wrangler generará
// `worker-configuration.d.ts` con el tipado completo a partir de `wrangler.jsonc`
// y este archivo puede eliminarse si prefieres depender solo del generado.
interface Env {
  DATABASE_URL: string
  ADMIN_PASSWORD: string
  SESSION_SECRET: string
}

declare module 'cloudflare:workers' {
  export const env: Env
}
