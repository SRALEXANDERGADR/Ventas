// Envía el correo de aviso cuando un cliente registra un pedido desde la
// tienda pública. Usa la API de Resend (https://resend.com) vía fetch, sin
// necesidad de instalar ningún paquete adicional (funciona igual que
// `src/lib/github.ts`).
//
// Requiere el secreto de Cloudflare RESEND_API_KEY. Opcionalmente
// RESEND_FROM_EMAIL (remitente). Si RESEND_API_KEY no está configurado, o si
// no hay un correo de destino guardado en el panel de admin, simplemente no
// se envía nada y el pedido se registra igual: un fallo o falta de
// configuración en el correo nunca debe romper el registro del pedido.

import { currency, shortDate } from './format'

type EmailCustomer = {
  name: string
  phone: string
  email: string
  address: string
}

type EmailItem = {
  productCode: string
  productName: string
  quantity: number
  unitPriceCents: number
  totalCents: number
}

type EmailInvoice = {
  number: string
  createdAt: string | Date
  subtotalCents: number
  discountCents: number
  totalCents: number
  paidCents: number
  notes: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildOrderEmailHtml({
  customer,
  invoice,
  items,
}: {
  customer: EmailCustomer
  invoice: EmailInvoice
  items: EmailItem[]
}): string {
  const balanceCents = Math.max(0, invoice.totalCents - invoice.paidCents)
  const rows = items
    .map(
      (item) => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #eee;color:#333;font-size:14px;">${escapeHtml(item.productName)}<br/><span style="color:#999;font-size:12px;">${escapeHtml(item.productCode)}</span></td>
          <td style="padding:10px 12px;border-bottom:1px solid #eee;color:#333;font-size:14px;text-align:center;">${item.quantity}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #eee;color:#333;font-size:14px;text-align:right;">${currency(item.unitPriceCents)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #eee;color:#333;font-size:14px;text-align:right;font-weight:600;">${currency(item.totalCents)}</td>
        </tr>`,
    )
    .join('')

  return `
  <!DOCTYPE html>
  <html lang="es">
  <body style="margin:0;padding:0;background-color:#f4f1ee;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f1ee;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">

            <tr>
              <td style="background-color:#1f1b18;padding:28px 32px;">
                <p style="margin:0;color:#e8c9a0;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Nuevo pedido</p>
                <h1 style="margin:6px 0 0;color:#ffffff;font-size:22px;">Factura ${escapeHtml(invoice.number)}</h1>
                <p style="margin:6px 0 0;color:#c9c2bb;font-size:13px;">${shortDate(invoice.createdAt)}</p>
              </td>
            </tr>

            <tr>
              <td style="padding:28px 32px 0;">
                <h2 style="margin:0 0 12px;color:#1f1b18;font-size:15px;">Datos del cliente</h2>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#faf8f6;border-radius:8px;">
                  <tr>
                    <td style="padding:14px 16px;font-size:14px;color:#333;">
                      <p style="margin:0 0 6px;"><strong>Nombre:</strong> ${escapeHtml(customer.name)}</p>
                      <p style="margin:0 0 6px;"><strong>Teléfono:</strong> ${escapeHtml(customer.phone)}</p>
                      <p style="margin:0 0 6px;"><strong>Correo:</strong> ${customer.email ? escapeHtml(customer.email) : 'No proporcionado'}</p>
                      <p style="margin:0;"><strong>Dirección:</strong> ${customer.address ? escapeHtml(customer.address) : 'No proporcionada'}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:24px 32px 0;">
                <h2 style="margin:0 0 12px;color:#1f1b18;font-size:15px;">Productos encargados</h2>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  <thead>
                    <tr>
                      <th style="padding:10px 12px;background-color:#1f1b18;color:#ffffff;font-size:12px;text-align:left;">Producto</th>
                      <th style="padding:10px 12px;background-color:#1f1b18;color:#ffffff;font-size:12px;text-align:center;">Cant.</th>
                      <th style="padding:10px 12px;background-color:#1f1b18;color:#ffffff;font-size:12px;text-align:right;">Precio</th>
                      <th style="padding:10px 12px;background-color:#1f1b18;color:#ffffff;font-size:12px;text-align:right;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rows}
                  </tbody>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:20px 32px 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:4px 0;color:#666;font-size:14px;">Subtotal</td>
                    <td style="padding:4px 0;color:#333;font-size:14px;text-align:right;">${currency(invoice.subtotalCents)}</td>
                  </tr>
                  ${
                    invoice.discountCents
                      ? `<tr>
                    <td style="padding:4px 0;color:#666;font-size:14px;">Descuento</td>
                    <td style="padding:4px 0;color:#333;font-size:14px;text-align:right;">-${currency(invoice.discountCents)}</td>
                  </tr>`
                      : ''
                  }
                  <tr>
                    <td style="padding:8px 0;color:#1f1b18;font-size:16px;font-weight:700;border-top:1px solid #eee;">Total</td>
                    <td style="padding:8px 0;color:#1f1b18;font-size:16px;font-weight:700;text-align:right;border-top:1px solid #eee;">${currency(invoice.totalCents)}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;color:#666;font-size:14px;">Pagado</td>
                    <td style="padding:4px 0;color:#333;font-size:14px;text-align:right;">${currency(invoice.paidCents)}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;color:#b34700;font-size:14px;font-weight:600;">Saldo pendiente</td>
                    <td style="padding:4px 0;color:#b34700;font-size:14px;font-weight:600;text-align:right;">${currency(balanceCents)}</td>
                  </tr>
                </table>
              </td>
            </tr>

            ${
              invoice.notes
                ? `<tr>
              <td style="padding:20px 32px 0;">
                <h2 style="margin:0 0 8px;color:#1f1b18;font-size:15px;">Notas</h2>
                <p style="margin:0;color:#555;font-size:14px;background-color:#faf8f6;padding:12px 14px;border-radius:8px;">${escapeHtml(invoice.notes)}</p>
              </td>
            </tr>`
                : ''
            }

            <tr>
              <td style="padding:28px 32px 32px;">
                <p style="margin:0;color:#999;font-size:12px;text-align:center;">Este correo se generó automáticamente cuando el cliente completó su pedido en la tienda.</p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>`
}

/** Envía el correo de aviso de pedido. Nunca lanza: si falta configuración o
 * falla el envío, solo registra un aviso en consola para no interrumpir el
 * registro del pedido del cliente. */
export async function sendOrderNotificationEmail(
  env: Env,
  {
    to,
    customer,
    invoice,
    items,
  }: {
    to: string
    customer: EmailCustomer
    invoice: EmailInvoice
    items: EmailItem[]
  },
): Promise<void> {
  if (!to) return
  if (!env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY no está configurado: no se envió el correo de aviso de pedido.')
    return
  }

  try {
    const from = env.RESEND_FROM_EMAIL || 'Cristy Beauty <onboarding@resend.dev>'
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `Nuevo pedido: ${invoice.number} — ${customer.name}`,
        html: buildOrderEmailHtml({ customer, invoice, items }),
      }),
    })

    if (!response.ok) {
      const detail = await response.text()
      console.error(`No se pudo enviar el correo de aviso de pedido (${response.status}). ${detail.slice(0, 300)}`)
    }
  } catch (caught) {
    console.error('Error enviando el correo de aviso de pedido:', caught)
  }
}
