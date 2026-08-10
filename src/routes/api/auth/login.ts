import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { buildSessionCookie, comparePassword, createSessionToken } from '@/lib/auth'

export const Route = createFileRoute('/api/auth/login')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as { password?: string }
        const password = String(body.password || '')

        if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET) {
          return Response.json({ error: 'El servidor no tiene configuradas las variables de administración.' }, { status: 500 })
        }
        if (!password || !comparePassword(password, env.ADMIN_PASSWORD)) {
          return Response.json({ error: 'Contraseña incorrecta.' }, { status: 401 })
        }

        const token = await createSessionToken(env.SESSION_SECRET)
        return Response.json(
          { authenticated: true },
          { status: 200, headers: { 'Set-Cookie': buildSessionCookie(token) } },
        )
      },
    },
  },
})
