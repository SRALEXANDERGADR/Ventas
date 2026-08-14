import { createFileRoute } from '@tanstack/react-router'
import { Policies } from '@/components/Policies'

export const Route = createFileRoute('/politicas')({
  component: Policies,
})
