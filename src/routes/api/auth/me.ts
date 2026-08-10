import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { isAuthenticated } from '@/lib/auth'

export const Route = createFileRoute('/api/auth/me')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authenticated = env.SESSION_SECRET ? await isAuthenticated(request, env.SESSION_SECRET) : false
        return Response.json({ authenticated })
      },
    },
  },
})
