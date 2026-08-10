import { createFileRoute } from '@tanstack/react-router'
import { Storefront } from '@/components/Storefront'

export const Route = createFileRoute('/')({
  component: Storefront,
})
