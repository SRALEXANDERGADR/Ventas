import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { and, asc, desc, eq, inArray, or } from 'drizzle-orm'
import { db } from '../../../db/index.js'
import { customers, invoiceItems, invoices, payments, products } from '../../../db/schema.js'
import { isAuthenticated } from '@/lib/auth'

const json = (data: unknown, status = 200) => Response.json(data, { status })
const error = (message: string, status = 400) => json({ error: message }, status)

const seedProducts = [
  { code: 'CH-001', name: 'Champú Botánico', category: 'Cabello', description: 'Limpieza suave con romero y sábila para uso diario.', priceCents: 48500, stock: 24, featured: true, imageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=900&q=85' },
  { code: 'AC-002', name: 'Acondicionador Nutritivo', category: 'Cabello', description: 'Fórmula cremosa que desenreda y devuelve el brillo natural.', priceCents: 52500, stock: 18, featured: true, imageUrl: 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?auto=format&fit=crop&w=900&q=85' },
  { code: 'CR-003', name: 'Crema Corporal Seda', category: 'Cuerpo', description: 'Hidratación profunda con una textura ligera y aroma limpio.', priceCents: 65000, stock: 15, featured: false, imageUrl: 'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?auto=format&fit=crop&w=900&q=85' },
  { code: 'SE-004', name: 'Sérum Luminosidad', category: 'Rostro', description: 'Concentrado facial para una apariencia uniforme y radiante.', priceCents: 89000, stock: 9, featured: true, imageUrl: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=900&q=85' },
]

async function ensureProducts() {
  const existing = await db.select({ id: products.id }).from(products).limit(1)
  if (!existing.length) await db.insert(products).values(seedProducts).onConflictDoNothing()
}

async function requireAdmin(request: Request): Promise<boolean> {
  if (!env.SESSION_SECRET) return false
  return isAuthenticated(request, env.SESSION_SECRET)
}

async function listInvoices() {
  const invoiceRows = await db
    .select({ invoice: invoices, customerName: customers.name, customerPhone: customers.phone })
    .from(invoices)
    .innerJoin(customers, eq(invoices.customerId, customers.id))
    .orderBy(desc(invoices.createdAt))
  const ids = invoiceRows.map(({ invoice }) => invoice.id)
  const itemRows = ids.length ? await db.select().from(invoiceItems).where(inArray(invoiceItems.invoiceId, ids)).orderBy(asc(invoiceItems.id)) : []
  const paymentRows = ids.length ? await db.select().from(payments).where(inArray(payments.invoiceId, ids)).orderBy(desc(payments.createdAt)) : []
  return invoiceRows.map(({ invoice, customerName, customerPhone }) => ({
    ...invoice,
    customerName,
    customerPhone,
    balanceCents: Math.max(0, invoice.totalCents - invoice.paidCents),
    status: invoice.paidCents >= invoice.totalCents ? 'paid' : invoice.dueDate && invoice.dueDate < new Date() ? 'overdue' : invoice.paidCents > 0 ? 'partial' : 'pending',
    items: itemRows.filter((item) => item.invoiceId === invoice.id),
    payments: paymentRows.filter((payment) => payment.invoiceId === invoice.id),
  }))
}

async function createInvoice(body: Record<string, unknown>, publicOrder = false) {
  const rawItems = Array.isArray(body.items) ? body.items : []
  if (!rawItems.length) return error('Agrega al menos un producto a la factura.')

  let customerId = Number(body.customerId || 0)
  if (publicOrder) {
    const customerData = body.customer as Record<string, unknown> | undefined
    const name = String(customerData?.name || '').trim()
    const phone = String(customerData?.phone || '').trim()
    if (!name || !phone) return error('Nombre y teléfono son obligatorios.')
    const [existing] = await db.select().from(customers).where(or(eq(customers.phone, phone), and(eq(customers.email, String(customerData?.email || '')), eq(customers.name, name)))).limit(1)
    if (existing) {
      customerId = existing.id
      await db.update(customers).set({ name, email: String(customerData?.email || ''), address: String(customerData?.address || ''), updatedAt: new Date() }).where(eq(customers.id, existing.id))
    } else {
      const [created] = await db.insert(customers).values({ name, phone, email: String(customerData?.email || ''), address: String(customerData?.address || '') }).returning()
      customerId = created.id
    }
  }

  if (!customerId) return error('Selecciona un cliente.')
  const normalized = rawItems.map((item) => ({ productId: Number((item as Record<string, unknown>).productId), quantity: Math.max(1, Number((item as Record<string, unknown>).quantity) || 1) }))
  const productRows = await db.select().from(products).where(inArray(products.id, normalized.map((item) => item.productId)))
  if (productRows.length !== normalized.length) return error('Uno de los productos ya no está disponible.')

  const detailedItems = normalized.map((item) => {
    const product = productRows.find((row) => row.id === item.productId)!
    if (!product.active || product.stock < item.quantity) throw new Error(`Stock insuficiente para ${product.name}.`)
    return { product, quantity: item.quantity, totalCents: product.priceCents * item.quantity }
  })
  const subtotalCents = detailedItems.reduce((sum, item) => sum + item.totalCents, 0)
  const discountCents = Math.min(subtotalCents, Math.max(0, Number(body.discountCents) || 0))
  const totalCents = subtotalCents - discountCents
  const paidCents = Math.min(totalCents, Math.max(0, Number(body.paidCents) || 0))
  const status = paidCents >= totalCents ? 'paid' : paidCents > 0 ? 'partial' : 'pending'
  const number = `FAC-${Date.now().toString().slice(-9)}`
  const dueDateValue = body.dueDate ? new Date(String(body.dueDate)) : null
  const [invoice] = await db.insert(invoices).values({ number, customerId, subtotalCents, discountCents, totalCents, paidCents, status, notes: String(body.notes || ''), dueDate: dueDateValue }).returning()
  await db.insert(invoiceItems).values(detailedItems.map(({ product, quantity, totalCents: lineTotal }) => ({ invoiceId: invoice.id, productId: product.id, productCode: product.code, productName: product.name, quantity, unitPriceCents: product.priceCents, totalCents: lineTotal })))
  if (paidCents > 0) await db.insert(payments).values({ invoiceId: invoice.id, amountCents: paidCents, method: String(body.method || 'Efectivo'), note: 'Pago inicial' })
  await Promise.all(detailedItems.map(({ product, quantity }) => db.update(products).set({ stock: product.stock - quantity, updatedAt: new Date() }).where(eq(products.id, product.id))))
  return json({ invoice: { ...invoice, customerId }, message: publicOrder ? 'Pedido registrado correctamente.' : 'Factura creada correctamente.' }, 201)
}

async function handleApi(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 })
  const resource = new URL(request.url).pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean)
  const name = resource[0] || ''
  const id = Number(resource[1] || 0)

  try {
    if (name === 'products' && request.method === 'GET') {
      await ensureProducts()
      const rows = await db.select().from(products).orderBy(desc(products.featured), asc(products.name))
      return json(rows)
    }
    if (name === 'orders' && request.method === 'POST') return createInvoice((await request.json()) as Record<string, unknown>, true)

    const authorized = await requireAdmin(request)
    if (!authorized) return error('Esta cuenta no tiene permisos de administración.', 403)

    if (name === 'dashboard' && request.method === 'GET') {
      await ensureProducts()
      const productRows = await db.select().from(products).orderBy(asc(products.name))
      const customerRows = await db.select().from(customers).orderBy(asc(customers.name))
      const invoiceRows = await listInvoices()
      const enrichedCustomers = customerRows.map((customer) => {
        const related = invoiceRows.filter((invoice) => invoice.customerId === customer.id)
        return { ...customer, balanceCents: related.reduce((sum, invoice) => sum + invoice.balanceCents, 0), invoiceCount: related.length }
      })
      return json({
        products: productRows,
        customers: enrichedCustomers,
        invoices: invoiceRows,
        metrics: {
          salesCents: invoiceRows.reduce((sum, invoice) => sum + invoice.totalCents, 0),
          receivableCents: invoiceRows.reduce((sum, invoice) => sum + invoice.balanceCents, 0),
          paidInvoices: invoiceRows.filter((invoice) => invoice.status === 'paid').length,
          lowStock: productRows.filter((product) => product.active && product.stock <= 5).length,
        },
      })
    }

    if (name === 'products' && request.method === 'POST') {
      const body = (await request.json()) as Record<string, unknown>
      const [created] = await db.insert(products).values({ code: String(body.code || '').trim().toUpperCase(), name: String(body.name || '').trim(), category: String(body.category || 'Cuidado personal'), description: String(body.description || ''), priceCents: Math.max(0, Number(body.priceCents) || 0), stock: Math.max(0, Number(body.stock) || 0), imageUrl: String(body.imageUrl || ''), featured: Boolean(body.featured), active: body.active !== false }).returning()
      return json(created, 201)
    }
    if (name === 'products' && id && request.method === 'PATCH') {
      const body = (await request.json()) as Record<string, unknown>
      const [updated] = await db.update(products).set({ code: String(body.code).trim().toUpperCase(), name: String(body.name).trim(), category: String(body.category), description: String(body.description || ''), priceCents: Number(body.priceCents), stock: Number(body.stock), imageUrl: String(body.imageUrl || ''), featured: Boolean(body.featured), active: Boolean(body.active), updatedAt: new Date() }).where(eq(products.id, id)).returning()
      return json(updated)
    }
    if (name === 'products' && id && request.method === 'DELETE') {
      await db.update(products).set({ active: false, updatedAt: new Date() }).where(eq(products.id, id))
      return json({ ok: true })
    }

    if (name === 'customers' && request.method === 'POST') {
      const body = (await request.json()) as Record<string, unknown>
      const [created] = await db.insert(customers).values({ name: String(body.name || '').trim(), phone: String(body.phone || '').trim(), email: String(body.email || ''), address: String(body.address || ''), notes: String(body.notes || '') }).returning()
      return json(created, 201)
    }
    if (name === 'customers' && id && request.method === 'PATCH') {
      const body = (await request.json()) as Record<string, unknown>
      const [updated] = await db.update(customers).set({ name: String(body.name || '').trim(), phone: String(body.phone || '').trim(), email: String(body.email || ''), address: String(body.address || ''), notes: String(body.notes || ''), updatedAt: new Date() }).where(eq(customers.id, id)).returning()
      return json(updated)
    }

    if (name === 'invoices' && request.method === 'POST') return createInvoice((await request.json()) as Record<string, unknown>)
    if (name === 'invoices' && id && resource[2] === 'payments' && request.method === 'POST') {
      const body = (await request.json()) as Record<string, unknown>
      const amountCents = Math.max(1, Number(body.amountCents) || 0)
      const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1)
      if (!invoice) return error('Factura no encontrada.', 404)
      const remaining = Math.max(0, invoice.totalCents - invoice.paidCents)
      const applied = Math.min(remaining, amountCents)
      if (!applied) return error('Esta factura ya está saldada.')
      await db.insert(payments).values({ invoiceId: id, amountCents: applied, method: String(body.method || 'Efectivo'), note: String(body.note || '') })
      const paidCents = invoice.paidCents + applied
      await db.update(invoices).set({ paidCents, status: paidCents >= invoice.totalCents ? 'paid' : 'partial', updatedAt: new Date() }).where(eq(invoices.id, id))
      return json({ ok: true, paidCents })
    }

    return error('Ruta no encontrada.', 404)
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : 'Ocurrió un error inesperado.'
    if (message.toLowerCase().includes('unique')) return error('El código del producto ya existe.', 409)
    return error(message, 500)
  }
}

export const Route = createFileRoute('/api/$')({
  server: {
    handlers: {
      GET: ({ request }) => handleApi(request),
      POST: ({ request }) => handleApi(request),
      PATCH: ({ request }) => handleApi(request),
      DELETE: ({ request }) => handleApi(request),
      OPTIONS: ({ request }) => handleApi(request),
    },
  },
})
