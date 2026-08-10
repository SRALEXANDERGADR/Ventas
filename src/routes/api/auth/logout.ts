import { createFileRoute } from '@tanstack/react-router'
import { buildClearedSessionCookie } from '@/lib/auth'

export const Route = createFileRoute('/api/auth/logout')({
  server: {
    handlers: {
      POST: async () => {
        return Response.json({ ok: true }, { status: 200, headers: { 'Set-Cookie': buildClearedSessionCookie() } })
      },
    },
  },
})
