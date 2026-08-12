import { Link } from '@tanstack/react-router'
import {
  ArrowLeft,
  Banknote,
  Boxes,
  Check,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Download,
  Eye,
  FileEdit,
  FilePlus2,
  LayoutDashboard,
  LogOut,
  PackagePlus,
  Pencil,
  Plus,
  ReceiptText,
  Search,
  Share2,
  ShoppingBag,
  Sparkles,
  Trash2,
  TrendingUp,
  UserPlus,
  Users,
  WalletCards,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { currency, shortDate } from '@/lib/format'
import { CONTENT_FIELD_GROUPS, DEFAULT_SITE_CONTENT } from '@/lib/site-content'
import type { Customer, DashboardData, Invoice, Product, SiteContent } from '@/types'

type Tab = 'resumen' | 'productos' | 'clientes' | 'facturas' | 'contenido'
type ProductDraft = Omit<Product, 'id'>
type CustomerDraft = Pick<Customer, 'name' | 'phone' | 'email' | 'address' | 'notes'>
type InvoiceLine = { productId: number; quantity: number }

const emptyProduct: ProductDraft = { code: '', name: '', category: 'Cabello', description: '', priceCents: 0, stock: 0, imageUrl: '', featured: false, active: true }
const emptyCustomer: CustomerDraft = { name: '', phone: '', email: '', address: '', notes: '' }

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', ...options?.headers } })
  const result = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(result.error || 'No pudimos completar la operación.')
  return result
}

export function AdminPanel() {
  const [authenticated, setAuthenticated] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<Tab>('resumen')
  const [query, setQuery] = useState('')
  const [notice, setNotice] = useState('')
  const [productModal, setProductModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [productDraft, setProductDraft] = useState<ProductDraft>(emptyProduct)
  const [imageMode, setImageMode] = useState<'url' | 'file'>('url')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [customerModal, setCustomerModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [customerDraft, setCustomerDraft] = useState<CustomerDraft>(emptyCustomer)
  const [invoiceModal, setInvoiceModal] = useState(false)
  const [invoiceCustomerId, setInvoiceCustomerId] = useState(0)
  const [invoiceLines, setInvoiceLines] = useState<InvoiceLine[]>([{ productId: 0, quantity: 1 }])
  const [invoicePaid, setInvoicePaid] = useState(0)
  const [invoiceDueDate, setInvoiceDueDate] = useState('')
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null)
  const [paymentAmount, setPaymentAmount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('Efectivo')
  const [paymentError, setPaymentError] = useState('')
  const [saving, setSaving] = useState(false)
  const [content, setContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT)
  const [contentDraft, setContentDraft] = useState<SiteContent>(DEFAULT_SITE_CONTENT)
  const [contentLoading, setContentLoading] = useState(false)
  const [contentSaving, setContentSaving] = useState(false)

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    try {
      setData(await api<DashboardData>('/api/dashboard'))
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : 'No pudimos cargar el panel.')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadContent = useCallback(async () => {
    setContentLoading(true)
    try {
      const loaded = await api<SiteContent>('/api/content')
      setContent(loaded)
      setContentDraft(loaded)
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : 'No pudimos cargar el contenido del sitio.')
    } finally {
      setContentLoading(false)
    }
  }, [])

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const result = await api<{ authenticated: boolean }>('/api/auth/me')
        setAuthenticated(result.authenticated)
      } catch {
        setAuthenticated(false)
      } finally {
        setAuthLoading(false)
      }
    }
    void initializeAuth()
  }, [])

  useEffect(() => {
    if (authenticated) {
      void loadDashboard()
      void loadContent()
    }
  }, [authenticated, loadDashboard, loadContent])

  const saveContent = async (event: FormEvent) => {
    event.preventDefault()
    setContentSaving(true)
    try {
      const updated = await api<SiteContent>('/api/content', { method: 'PATCH', body: JSON.stringify(contentDraft) })
      setContent(updated)
      setContentDraft(updated)
      setNotice('Contenido del sitio actualizado.')
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : 'No pudimos guardar el contenido.')
    } finally {
      setContentSaving(false)
    }
  }

  const contentChanged = useMemo(
    () => CONTENT_FIELD_GROUPS.some((group) => group.fields.some((field) => (contentDraft[field.key] ?? '') !== (content[field.key] ?? ''))),
    [content, contentDraft],
  )

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault()
    setAuthLoading(true)
    setAuthError('')
    try {
      await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ password }) })
      setPassword('')
      setAuthenticated(true)
    } catch {
      setAuthError('Contraseña incorrecta. Verifica tus datos.')
    } finally {
      setAuthLoading(false)
    }
  }

  const signOut = async () => {
    await api('/api/auth/logout', { method: 'POST' })
    setAuthenticated(false)
    setData(null)
  }

  const openProduct = (product?: Product) => {
    setEditingProduct(product || null)
    setProductDraft(product ? { code: product.code, name: product.name, category: product.category, description: product.description, priceCents: product.priceCents, stock: product.stock, imageUrl: product.imageUrl, featured: product.featured, active: product.active } : emptyProduct)
    setImageMode('url')
    setProductModal(true)
  }

  const handleImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) { setNotice('El archivo debe ser una imagen.'); return }
    if (file.size > 8 * 1024 * 1024) { setNotice('La imagen no puede superar 8 MB.'); return }
    setUploadingImage(true)
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(file)
      })
      const result = await api<{ url: string }>('/api/upload', { method: 'POST', body: JSON.stringify({ filename: file.name, dataUrl }) })
      setProductDraft((draft) => ({ ...draft, imageUrl: result.url }))
      setNotice('Imagen subida correctamente.')
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : 'No pudimos subir la imagen.')
    } finally {
      setUploadingImage(false)
    }
  }

  const saveProduct = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      await api(editingProduct ? `/api/products/${editingProduct.id}` : '/api/products', { method: editingProduct ? 'PATCH' : 'POST', body: JSON.stringify(productDraft) })
      setProductModal(false)
      setNotice(editingProduct ? 'Producto actualizado.' : 'Producto agregado al catálogo.')
      await loadDashboard()
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : 'No pudimos guardar el producto.')
    } finally {
      setSaving(false)
    }
  }

  const removeProduct = async (product: Product) => {
    if (!window.confirm(`¿Ocultar ${product.name} del catálogo?`)) return
    await api(`/api/products/${product.id}`, { method: 'DELETE' })
    setNotice('Producto retirado del catálogo.')
    await loadDashboard()
  }

  const openCustomer = (customer?: Customer) => {
    setEditingCustomer(customer || null)
    setCustomerDraft(customer ? { name: customer.name, phone: customer.phone, email: customer.email, address: customer.address, notes: customer.notes } : emptyCustomer)
    setCustomerModal(true)
  }

  const saveCustomer = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      await api(editingCustomer ? `/api/customers/${editingCustomer.id}` : '/api/customers', { method: editingCustomer ? 'PATCH' : 'POST', body: JSON.stringify(customerDraft) })
      setCustomerModal(false)
      setNotice(editingCustomer ? 'Cliente actualizado.' : 'Cliente registrado.')
      await loadDashboard()
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : 'No pudimos guardar el cliente.')
    } finally {
      setSaving(false)
    }
  }

  const createInvoice = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      await api('/api/invoices', { method: 'POST', body: JSON.stringify({ customerId: invoiceCustomerId, items: invoiceLines.filter((line) => line.productId), paidCents: invoicePaid, dueDate: invoiceDueDate || null }) })
      setInvoiceModal(false)
      setInvoiceLines([{ productId: 0, quantity: 1 }])
      setInvoicePaid(0)
      setNotice('Factura creada y existencias actualizadas.')
      await loadDashboard()
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : 'No pudimos crear la factura.')
    } finally {
      setSaving(false)
    }
  }

  const deleteInvoice = async (invoice: Invoice) => {
    if (!window.confirm(`¿Eliminar la factura ${invoice.number} de ${invoice.customerName}? Esta acción no se puede deshacer.`)) return
    setSaving(true)
    try {
      await api(`/api/invoices/${invoice.id}`, { method: 'DELETE' })
      setSelectedInvoice(null)
      setNotice('Factura eliminada.')
      await loadDashboard()
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : 'No pudimos eliminar la factura.')
    } finally {
      setSaving(false)
    }
  }

  const buildInvoiceText = (invoice: Invoice) => {
    const lines = invoice.items.map((item) => `• ${item.quantity}x ${item.productName} — ${currency(item.totalCents)}`).join('\n')
    return [
      `*Factura ${invoice.number}*`,
      `Cliente: ${invoice.customerName}`,
      `Fecha: ${shortDate(invoice.createdAt)}`,
      '',
      lines,
      '',
      `Subtotal: ${currency(invoice.subtotalCents)}`,
      invoice.discountCents ? `Descuento: -${currency(invoice.discountCents)}` : '',
      `*Total: ${currency(invoice.totalCents)}*`,
      `Abonado: ${currency(invoice.paidCents)}`,
      `*Saldo pendiente: ${currency(invoice.balanceCents)}*`,
      '',
      'Gestión Aura',
    ].filter(Boolean).join('\n')
  }

  const shareInvoice = async (invoice: Invoice) => {
    const text = buildInvoiceText(invoice)
    if (navigator.share) {
      try {
        await navigator.share({ title: `Factura ${invoice.number}`, text })
        return
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === 'AbortError') return
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const printInvoice = (invoice: Invoice) => {
    const win = window.open('', '_blank')
    if (!win) { setNotice('Permite las ventanas emergentes para descargar la factura.'); return }
    const rows = invoice.items.map((item) => `<tr><td>${item.productCode}</td><td>${item.productName}</td><td class="c">${item.quantity}</td><td class="r">${currency(item.unitPriceCents)}</td><td class="r">${currency(item.totalCents)}</td></tr>`).join('')
    const paymentRows = invoice.payments.map((payment) => `<tr><td>${shortDate(payment.createdAt)}</td><td>${payment.method}</td><td class="r">${currency(payment.amountCents)}</td></tr>`).join('')
    win.document.write(`<!doctype html><html><head><meta charset="utf-8" /><title>${invoice.number}</title><style>
      body{font-family:Georgia,'Times New Roman',serif;color:#2c2c22;padding:32px;max-width:640px;margin:0 auto}
      h1{font-size:1.6rem;margin:18px 0 4px}
      .muted{color:#78786a;font-size:.85rem}
      .brand{letter-spacing:.1em;text-transform:uppercase;font-size:.75rem;color:#5b6b4e;font-weight:bold}
      table{width:100%;border-collapse:collapse;margin-top:18px}
      th,td{padding:8px 6px;border-bottom:1px solid #e4e0d3;font-size:.85rem;text-align:left}
      th{text-transform:uppercase;font-size:.65rem;letter-spacing:.05em;color:#78786a}
      .c{text-align:center}.r{text-align:right}
      .totals{margin-top:6px}
      .totals td{border:none;padding:4px 6px}
      .totals .grand td{font-weight:bold;font-size:1.05rem;border-top:2px solid #2c2c22;padding-top:8px}
      @media print{body{padding:0}}
    </style></head><body>
      <div class="brand">Gestión Aura</div>
      <h1>Factura ${invoice.number}</h1>
      <p class="muted">Fecha: ${shortDate(invoice.createdAt)}${invoice.dueDate ? ' · Vence: ' + shortDate(invoice.dueDate) : ''}</p>
      <p><strong>Cliente:</strong> ${invoice.customerName}<br/><span class="muted">${invoice.customerPhone || ''}</span></p>
      <table><thead><tr><th>Código</th><th>Producto</th><th class="c">Cant.</th><th class="r">Precio</th><th class="r">Total</th></tr></thead><tbody>${rows}</tbody></table>
      <table class="totals">
        <tr><td>Subtotal</td><td class="r">${currency(invoice.subtotalCents)}</td></tr>
        ${invoice.discountCents ? `<tr><td>Descuento</td><td class="r">-${currency(invoice.discountCents)}</td></tr>` : ''}
        <tr class="grand"><td>Total</td><td class="r">${currency(invoice.totalCents)}</td></tr>
        <tr><td>Abonado</td><td class="r">${currency(invoice.paidCents)}</td></tr>
        <tr><td>Saldo</td><td class="r">${currency(invoice.balanceCents)}</td></tr>
      </table>
      ${invoice.payments.length ? `<h3>Historial de pagos</h3><table><thead><tr><th>Fecha</th><th>Método</th><th class="r">Monto</th></tr></thead><tbody>${paymentRows}</tbody></table>` : ''}
      ${invoice.notes ? `<p class="muted">Notas: ${invoice.notes}</p>` : ''}
    </body></html>`)
    win.document.close()
    win.focus()
    win.print()
  }

  const registerPayment = async (event: FormEvent) => {
    event.preventDefault()
    if (!paymentInvoice) return
    setSaving(true)
    setPaymentError('')
    try {
      await api(`/api/invoices/${paymentInvoice.id}/payments`, { method: 'POST', body: JSON.stringify({ amountCents: paymentAmount, method: paymentMethod }) })
      setPaymentInvoice(null)
      setNotice('Abono registrado. El saldo se actualizó.')
      await loadDashboard()
    } catch (caught) {
      const message = caught instanceof Error && caught.message ? caught.message : 'No pudimos registrar el abono.'
      setPaymentError(message)
      setNotice(message)
    } finally {
      setSaving(false)
    }
  }

  const filteredProducts = useMemo(() => data?.products.filter((product) => `${product.name} ${product.code} ${product.category}`.toLowerCase().includes(query.toLowerCase())) || [], [data, query])
  const filteredCustomers = useMemo(() => data?.customers.filter((customer) => `${customer.name} ${customer.phone} ${customer.email}`.toLowerCase().includes(query.toLowerCase())) || [], [data, query])
  const filteredInvoices = useMemo(() => data?.invoices.filter((invoice) => `${invoice.number} ${invoice.customerName} ${invoice.customerPhone}`.toLowerCase().includes(query.toLowerCase())) || [], [data, query])
  const invoiceDraftTotal = invoiceLines.reduce((sum, line) => sum + (data?.products.find((product) => product.id === line.productId)?.priceCents || 0) * line.quantity, 0)

  if (authLoading) return <div className="admin-loading"><span className="brand-mark"><Sparkles /></span><p>Preparando tu espacio…</p></div>

  if (!authenticated) return <main className="login-page">
    <Link to="/" className="back-store"><ArrowLeft size={17} /> Volver a la tienda</Link>
    <section className="login-art"><div className="login-brand"><span className="brand-mark"><Sparkles /></span><span><strong>Aura</strong><small>gestión comercial</small></span></div><div><span className="eyebrow">Todo bajo control</span><h1>Tu negocio,<br /><em>más claro.</em></h1><p>Productos, clientes, ventas y cobros reunidos en un solo lugar.</p></div><div className="login-quote">“Saber qué se vendió y qué falta por cobrar cambia la forma de trabajar.”</div></section>
    <section className="login-form-wrap"><form className="login-form" onSubmit={handleLogin}><span className="login-icon"><ClipboardList /></span><small>Acceso privado</small><h2>Bienvenida de nuevo</h2><p>Ingresa con la contraseña autorizada para administrar la tienda.</p><label>Contraseña<input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" /></label>{authError && <p className="form-error">{authError}</p>}<button className="primary-button full" disabled={authLoading}>Entrar al panel <ArrowLeft className="rotate-180" size={18} /></button><div className="security-note"><Check size={15} /> Acceso protegido por sesión firmada</div></form></section>
  </main>

  return <main className="admin-shell">
    <aside className="admin-sidebar">
      <div className="login-brand sidebar-brand"><span className="brand-mark"><Sparkles /></span><span><strong>Aura</strong><small>administración</small></span></div>
      <nav>
        <button className={tab === 'resumen' ? 'active' : ''} onClick={() => { setTab('resumen'); setQuery('') }}><LayoutDashboard /> Resumen</button>
        <button className={tab === 'productos' ? 'active' : ''} onClick={() => { setTab('productos'); setQuery('') }}><Boxes /> Productos</button>
        <button className={tab === 'clientes' ? 'active' : ''} onClick={() => { setTab('clientes'); setQuery('') }}><Users /> Clientes</button>
        <button className={tab === 'facturas' ? 'active' : ''} onClick={() => { setTab('facturas'); setQuery('') }}><ReceiptText /> Facturas</button>
        <button className={tab === 'contenido' ? 'active' : ''} onClick={() => { setTab('contenido'); setQuery('') }}><FileEdit /> Contenido</button>
      </nav>
      <div className="sidebar-footer"><Link to="/"><ShoppingBag /> Ver tienda</Link><button onClick={signOut}><LogOut /> Cerrar sesión</button><div><span>A</span><p><strong>Administración</strong><small>Aura Esenciales</small></p></div></div>
    </aside>
    <section className="admin-main">
      <header className="admin-header"><div><span className="eyebrow">Panel de control</span><h1>{tab === 'resumen' ? 'Buenos días.' : tab.charAt(0).toUpperCase() + tab.slice(1)}</h1></div><div className="admin-date"><span>{new Intl.DateTimeFormat('es-DO', { weekday: 'long' }).format(new Date())}</span><strong>{new Intl.DateTimeFormat('es-DO', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date())}</strong></div></header>
      {notice && <button className="notice" onClick={() => setNotice('')}><Check /> {notice}<X /></button>}
      {loading && !data ? <div className="dashboard-skeleton"><div /><div /><div /><div /></div> : null}

      {data && tab === 'resumen' && <>
        <section className="metric-grid">
          <article className="metric-card accent"><span><TrendingUp /></span><small>Ventas registradas</small><strong>{currency(data.metrics.salesCents)}</strong><p>Histórico de facturación</p></article>
          <article className="metric-card"><span><WalletCards /></span><small>Por cobrar</small><strong>{currency(data.metrics.receivableCents)}</strong><p>{data.invoices.filter((invoice) => invoice.balanceCents > 0).length} facturas pendientes</p></article>
          <article className="metric-card"><span><CircleDollarSign /></span><small>Facturas saldadas</small><strong>{data.metrics.paidInvoices}</strong><p>Pagadas por completo</p></article>
          <article className="metric-card"><span><Boxes /></span><small>Stock bajo</small><strong>{data.metrics.lowStock}</strong><p>Productos con 5 o menos</p></article>
        </section>
        <section className="quick-actions"><button onClick={() => openProduct()}><span><PackagePlus /></span><div><strong>Nuevo producto</strong><small>Agregar con código único</small></div><ChevronRight /></button><button onClick={() => openCustomer()}><span><UserPlus /></span><div><strong>Nuevo cliente</strong><small>Crear su perfil</small></div><ChevronRight /></button><button onClick={() => setInvoiceModal(true)}><span><FilePlus2 /></span><div><strong>Nueva factura</strong><small>Registrar una venta</small></div><ChevronRight /></button></section>
        <section className="dashboard-columns">
          <div className="panel-card"><div className="panel-title"><div><small>Actividad reciente</small><h2>Últimas facturas</h2></div><button onClick={() => setTab('facturas')}>Ver todas <ChevronRight /></button></div><div className="invoice-list">{data.invoices.slice(0, 5).map((invoice) => <button key={invoice.id} onClick={() => setSelectedInvoice(invoice)}><span className="invoice-icon"><ReceiptText /></span><span><strong>{invoice.customerName}</strong><small>{invoice.number} · {shortDate(invoice.createdAt)}</small></span><b>{currency(invoice.totalCents)}</b><StatusBadge invoice={invoice} /></button>)}{!data.invoices.length && <Empty message="Todavía no hay facturas." />}</div></div>
          <div className="panel-card"><div className="panel-title"><div><small>Seguimiento</small><h2>Saldos pendientes</h2></div></div><div className="debt-list">{data.customers.filter((customer) => customer.balanceCents > 0).sort((a, b) => b.balanceCents - a.balanceCents).slice(0, 5).map((customer) => <div key={customer.id}><span>{customer.name.charAt(0)}</span><p><strong>{customer.name}</strong><small>{customer.invoiceCount} factura(s)</small></p><b>{currency(customer.balanceCents)}</b></div>)}{!data.customers.some((customer) => customer.balanceCents > 0) && <Empty message="No hay saldos pendientes." />}</div></div>
        </section>
      </>}

      {data && tab !== 'resumen' && tab !== 'contenido' && <section className="management-page">
        <div className="management-toolbar"><label className="search-field"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Buscar en ${tab}…`} /></label>{tab === 'productos' && <button className="primary-button" onClick={() => openProduct()}><Plus /> Nuevo producto</button>}{tab === 'clientes' && <button className="primary-button" onClick={() => openCustomer()}><Plus /> Nuevo cliente</button>}{tab === 'facturas' && <button className="primary-button" onClick={() => setInvoiceModal(true)}><Plus /> Nueva factura</button>}</div>
        {tab === 'productos' && <div className="data-card"><table><thead><tr><th>Producto</th><th>Código</th><th>Categoría</th><th>Precio</th><th>Inventario</th><th>Estado</th><th /></tr></thead><tbody>{filteredProducts.map((product) => <tr key={product.id}><td><div className="table-product"><img src={product.imageUrl || '/product-placeholder.svg'} alt="" /><strong>{product.name}</strong></div></td><td><code>{product.code}</code></td><td>{product.category}</td><td><strong>{currency(product.priceCents)}</strong></td><td><span className={product.stock <= 5 ? 'stock-low' : ''}>{product.stock} unidades</span></td><td><span className={`simple-status ${product.active ? 'ok' : 'off'}`}>{product.active ? 'Activo' : 'Oculto'}</span></td><td><div className="row-actions"><button onClick={() => openProduct(product)}><Pencil /></button><button onClick={() => void removeProduct(product)}><Trash2 /></button></div></td></tr>)}</tbody></table>{!filteredProducts.length && <Empty message="No hay productos que mostrar." />}</div>}
        {tab === 'clientes' && <div className="customer-grid">{filteredCustomers.map((customer) => <article key={customer.id}><div className="customer-card-top"><span>{customer.name.charAt(0)}</span><button onClick={() => openCustomer(customer)}><Pencil /></button></div><h3>{customer.name}</h3><p>{customer.phone}</p><small>{customer.email || 'Sin correo registrado'}</small><div><span>Saldo actual</span><strong className={customer.balanceCents ? 'has-debt' : ''}>{currency(customer.balanceCents)}</strong></div><footer><span>{customer.invoiceCount} factura(s)</span><b className={customer.balanceCents ? 'pending-dot' : 'paid-dot'}>{customer.balanceCents ? 'Pendiente' : 'Saldado'}</b></footer></article>)}{!filteredCustomers.length && <Empty message="No hay clientes que mostrar." />}</div>}
        {tab === 'facturas' && <div className="data-card"><table><thead><tr><th>Factura</th><th>Cliente</th><th>Fecha</th><th>Total</th><th>Abonado</th><th>Saldo</th><th>Estado</th><th /></tr></thead><tbody>{filteredInvoices.map((invoice) => <tr key={invoice.id}><td><code>{invoice.number}</code></td><td><strong>{invoice.customerName}</strong><small className="table-subtext">{invoice.customerPhone}</small></td><td>{shortDate(invoice.createdAt)}</td><td><strong>{currency(invoice.totalCents)}</strong></td><td>{currency(invoice.paidCents)}</td><td><strong className={invoice.balanceCents ? 'has-debt' : ''}>{currency(invoice.balanceCents)}</strong></td><td><StatusBadge invoice={invoice} /></td><td><div className="row-actions"><button onClick={() => setSelectedInvoice(invoice)}><Eye /></button><button onClick={() => printInvoice(invoice)}><Download /></button><button onClick={() => shareInvoice(invoice)}><Share2 /></button>{invoice.balanceCents > 0 && <button className="pay-action" onClick={() => { setPaymentInvoice(invoice); setPaymentAmount(invoice.balanceCents); setPaymentError('') }}><Banknote /></button>}<button className="danger-action" onClick={() => deleteInvoice(invoice)}><Trash2 /></button></div></td></tr>)}</tbody></table>{!filteredInvoices.length && <Empty message="No hay facturas que mostrar." />}</div>}
      </section>}

      {tab === 'contenido' && <section className="management-page content-page">
        <form className="content-form" onSubmit={saveContent}>
          <div className="content-sections">
            {CONTENT_FIELD_GROUPS.map((group) => (
              <div className="panel-card" key={group.id}>
                <div className="panel-title"><div><small>Contenido del sitio</small><h2>{group.title}</h2></div></div>
                <div className="form-grid">
                  {group.fields.map((field) => (
                    <label className={field.type === 'textarea' ? 'full-field' : ''} key={field.key}>
                      {field.label}
                      {field.type === 'textarea'
                        ? <textarea disabled={contentLoading} value={contentDraft[field.key] ?? ''} onChange={(event) => setContentDraft({ ...contentDraft, [field.key]: event.target.value })} />
                        : <input disabled={contentLoading} value={contentDraft[field.key] ?? ''} onChange={(event) => setContentDraft({ ...contentDraft, [field.key]: event.target.value })} />}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="content-save-bar">
            <span>{contentChanged ? 'Tienes cambios sin guardar.' : 'No hay cambios pendientes.'}</span>
            <button className="primary-button" disabled={contentSaving || contentLoading || !contentChanged}>{contentSaving ? 'Guardando…' : 'Guardar cambios'}</button>
          </div>
        </form>
      </section>}
    </section>

    {productModal && <AdminModal title={editingProduct ? 'Editar producto' : 'Agregar producto'} subtitle="El código identifica cada artículo en inventario." onClose={() => setProductModal(false)}><form onSubmit={saveProduct} className="admin-form"><div className="form-grid"><label>Código del producto<input required value={productDraft.code} onChange={(event) => setProductDraft({ ...productDraft, code: event.target.value.toUpperCase() })} placeholder="CH-005" /></label><label>Nombre<input required value={productDraft.name} onChange={(event) => setProductDraft({ ...productDraft, name: event.target.value })} /></label><label>Categoría<input required value={productDraft.category} onChange={(event) => setProductDraft({ ...productDraft, category: event.target.value })} /></label><label>Precio (RD$)<input required type="number" min="0" value={productDraft.priceCents / 100 || ''} onChange={(event) => setProductDraft({ ...productDraft, priceCents: Math.round(Number(event.target.value) * 100) })} /></label><label>Existencias<input required type="number" min="0" value={productDraft.stock} onChange={(event) => setProductDraft({ ...productDraft, stock: Number(event.target.value) })} /></label><ImageField value={productDraft.imageUrl} mode={imageMode} uploading={uploadingImage} onModeChange={setImageMode} onUrlChange={(value) => setProductDraft({ ...productDraft, imageUrl: value })} onFileSelect={(file) => void handleImageFile(file)} /><label className="full-field">Descripción<textarea value={productDraft.description} onChange={(event) => setProductDraft({ ...productDraft, description: event.target.value })} /></label></div><div className="check-row"><label><input type="checkbox" checked={productDraft.featured} onChange={(event) => setProductDraft({ ...productDraft, featured: event.target.checked })} /> Destacar en la tienda</label><label><input type="checkbox" checked={productDraft.active} onChange={(event) => setProductDraft({ ...productDraft, active: event.target.checked })} /> Producto activo</label></div><button className="primary-button full" disabled={saving}>{saving ? 'Guardando…' : 'Guardar producto'}</button></form></AdminModal>}
    {customerModal && <AdminModal title={editingCustomer ? 'Editar cliente' : 'Registrar cliente'} subtitle="Guarda sus datos para facturar y consultar saldos." onClose={() => setCustomerModal(false)}><form onSubmit={saveCustomer} className="admin-form"><div className="form-grid"><label>Nombre completo<input required value={customerDraft.name} onChange={(event) => setCustomerDraft({ ...customerDraft, name: event.target.value })} /></label><label>Teléfono<input required value={customerDraft.phone} onChange={(event) => setCustomerDraft({ ...customerDraft, phone: event.target.value })} /></label><label>Correo<input type="email" value={customerDraft.email} onChange={(event) => setCustomerDraft({ ...customerDraft, email: event.target.value })} /></label><label>Dirección<input value={customerDraft.address} onChange={(event) => setCustomerDraft({ ...customerDraft, address: event.target.value })} /></label><label className="full-field">Notas<textarea value={customerDraft.notes} onChange={(event) => setCustomerDraft({ ...customerDraft, notes: event.target.value })} /></label></div><button className="primary-button full" disabled={saving}>{saving ? 'Guardando…' : 'Guardar cliente'}</button></form></AdminModal>}
    {invoiceModal && data && <AdminModal title="Nueva factura" subtitle="Selecciona el cliente, agrega productos y registra el pago inicial." onClose={() => setInvoiceModal(false)} wide><form onSubmit={createInvoice} className="admin-form"><label>Cliente<select required value={invoiceCustomerId} onChange={(event) => setInvoiceCustomerId(Number(event.target.value))}><option value="">Selecciona un cliente</option>{data.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} · {customer.phone}</option>)}</select></label><div className="invoice-builder"><div className="builder-title"><strong>Productos</strong><button type="button" onClick={() => setInvoiceLines([...invoiceLines, { productId: 0, quantity: 1 }])}><Plus /> Agregar línea</button></div>{invoiceLines.map((line, index) => <div className="invoice-line" key={index}><select required value={line.productId} onChange={(event) => setInvoiceLines(invoiceLines.map((item, itemIndex) => itemIndex === index ? { ...item, productId: Number(event.target.value) } : item))}><option value="">Selecciona un producto</option>{data.products.filter((product) => product.active && product.stock > 0).map((product) => <option value={product.id} key={product.id}>{product.code} · {product.name} ({product.stock})</option>)}</select><input type="number" min="1" value={line.quantity} onChange={(event) => setInvoiceLines(invoiceLines.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: Number(event.target.value) } : item))} /><strong>{currency((data.products.find((product) => product.id === line.productId)?.priceCents || 0) * line.quantity)}</strong><button type="button" onClick={() => setInvoiceLines(invoiceLines.filter((_, itemIndex) => itemIndex !== index))}><Trash2 /></button></div>)}</div><div className="form-grid"><label>Pago inicial (RD$)<input type="number" min="0" max={invoiceDraftTotal / 100} value={invoicePaid / 100 || ''} onChange={(event) => setInvoicePaid(Math.round(Number(event.target.value) * 100))} /></label><label>Fecha límite<input type="date" value={invoiceDueDate} onChange={(event) => setInvoiceDueDate(event.target.value)} /></label></div><div className="invoice-draft-total"><span>Total de factura</span><strong>{currency(invoiceDraftTotal)}</strong></div><button className="primary-button full" disabled={saving || !invoiceDraftTotal}>{saving ? 'Creando factura…' : 'Crear factura'}</button></form></AdminModal>}
    {paymentInvoice && <AdminModal title="Registrar abono" subtitle={`${paymentInvoice.number} · ${paymentInvoice.customerName}`} onClose={() => setPaymentInvoice(null)}><form onSubmit={registerPayment} className="admin-form"><div className="balance-highlight"><span>Saldo pendiente</span><strong>{currency(paymentInvoice.balanceCents)}</strong></div><label>Monto recibido (RD$)<input required type="number" min="1" max={paymentInvoice.balanceCents / 100} value={paymentAmount / 100 || ''} onChange={(event) => setPaymentAmount(Math.round(Number(event.target.value) * 100))} /></label><label>Método de pago<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}><option>Efectivo</option><option>Transferencia</option><option>Tarjeta</option><option>Otro</option></select></label>{paymentError && <p className="form-error">{paymentError}</p>}<button className="primary-button full" disabled={saving}>{saving ? 'Registrando…' : 'Confirmar abono'}</button></form></AdminModal>}
    {selectedInvoice && <AdminModal title={selectedInvoice.number} subtitle={`${selectedInvoice.customerName} · ${shortDate(selectedInvoice.createdAt)}`} onClose={() => setSelectedInvoice(null)} wide><div className="invoice-detail"><div className="invoice-detail-summary"><div><span>Total</span><strong>{currency(selectedInvoice.totalCents)}</strong></div><div><span>Abonado</span><strong>{currency(selectedInvoice.paidCents)}</strong></div><div><span>Saldo</span><strong className={selectedInvoice.balanceCents ? 'has-debt' : ''}>{currency(selectedInvoice.balanceCents)}</strong></div><StatusBadge invoice={selectedInvoice} /></div><div className="detail-lines">{selectedInvoice.items.map((item) => <div key={item.id}><span><strong>{item.productName}</strong><small>{item.productCode} · {item.quantity} × {currency(item.unitPriceCents)}</small></span><b>{currency(item.totalCents)}</b></div>)}</div>{selectedInvoice.payments.length > 0 && <div className="payment-history"><h3>Historial de pagos</h3>{selectedInvoice.payments.map((payment) => <div key={payment.id}><span><strong>{payment.method}</strong><small>{shortDate(payment.createdAt)}</small></span><b>{currency(payment.amountCents)}</b></div>)}</div>}{selectedInvoice.balanceCents > 0 && <button className="primary-button full" onClick={() => { setPaymentInvoice(selectedInvoice); setPaymentAmount(selectedInvoice.balanceCents); setPaymentError(''); setSelectedInvoice(null) }}>Registrar abono</button>}<div className="detail-actions"><button className="secondary-button full" onClick={() => printInvoice(selectedInvoice)}><Download /> Descargar / imprimir</button><button className="secondary-button full" onClick={() => shareInvoice(selectedInvoice)}><Share2 /> Compartir</button><button className="danger-button full" onClick={() => deleteInvoice(selectedInvoice)}><Trash2 /> Eliminar factura</button></div></div></AdminModal>}
  </main>
}

function StatusBadge({ invoice }: { invoice: Invoice }) {
  const status = invoice.balanceCents <= 0 ? 'paid' : invoice.status === 'overdue' ? 'overdue' : invoice.paidCents > 0 ? 'partial' : 'pending'
  return <span className={`status-badge ${status}`}>{status === 'paid' ? 'Saldada' : status === 'partial' ? 'Abonada' : status === 'overdue' ? 'Vencida' : 'Pendiente'}</span>
}

function ImageField({ value, mode, uploading, onModeChange, onUrlChange, onFileSelect }: { value: string; mode: 'url' | 'file'; uploading: boolean; onModeChange: (mode: 'url' | 'file') => void; onUrlChange: (value: string) => void; onFileSelect: (file: File) => void }) {
  return <label className="full-field image-field">
    Imagen del producto
    <div className="image-mode-toggle">
      <button type="button" className={mode === 'url' ? 'active' : ''} onClick={() => onModeChange('url')}>Usar URL</button>
      <button type="button" className={mode === 'file' ? 'active' : ''} onClick={() => onModeChange('file')}>Subir desde el dispositivo</button>
    </div>
    {mode === 'url'
      ? <input value={value} onChange={(event) => onUrlChange(event.target.value)} placeholder="https://…" />
      : <div className="image-upload-row">
          <input type="file" accept="image/*" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) onFileSelect(file); event.target.value = '' }} />
          {uploading && <span className="image-upload-status">Subiendo…</span>}
        </div>}
    {value && <img className="image-field-preview" src={value} alt="Vista previa del producto" />}
  </label>
}

function Empty({ message }: { message: string }) {
  return <div className="table-empty"><ReceiptText /><p>{message}</p></div>
}

function AdminModal({ title, subtitle, onClose, wide = false, children }: { title: string; subtitle: string; onClose: () => void; wide?: boolean; children: ReactNode }) {
  return <div className="modal-layer"><button className="modal-backdrop" aria-label="Cerrar" onClick={onClose} /><section className={`admin-modal ${wide ? 'wide' : ''}`}><header><div><small>Gestión Aura</small><h2>{title}</h2><p>{subtitle}</p></div><button className="icon-button" onClick={onClose}><X /></button></header>{children}</section></div>
}
