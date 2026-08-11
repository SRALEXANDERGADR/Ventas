import { Link } from '@tanstack/react-router'
import {
  ArrowLeft,
  Banknote,
  Boxes,
  Check,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
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
    setProductModal(true)
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

  const registerPayment = async (event: FormEvent) => {
    event.preventDefault()
    if (!paymentInvoice) return
    setSaving(true)
    try {
      await api(`/api/invoices/${paymentInvoice.id}/payments`, { method: 'POST', body: JSON.stringify({ amountCents: paymentAmount, method: paymentMethod }) })
      setPaymentInvoice(null)
      setNotice('Abono registrado. El saldo se actualizó.')
      await loadDashboard()
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : 'No pudimos registrar el abono.')
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
        {tab === 'facturas' && <div className="data-card"><table><thead><tr><th>Factura</th><th>Cliente</th><th>Fecha</th><th>Total</th><th>Abonado</th><th>Saldo</th><th>Estado</th><th /></tr></thead><tbody>{filteredInvoices.map((invoice) => <tr key={invoice.id}><td><code>{invoice.number}</code></td><td><strong>{invoice.customerName}</strong><small className="table-subtext">{invoice.customerPhone}</small></td><td>{shortDate(invoice.createdAt)}</td><td><strong>{currency(invoice.totalCents)}</strong></td><td>{currency(invoice.paidCents)}</td><td><strong className={invoice.balanceCents ? 'has-debt' : ''}>{currency(invoice.balanceCents)}</strong></td><td><StatusBadge invoice={invoice} /></td><td><div className="row-actions"><button onClick={() => setSelectedInvoice(invoice)}><Eye /></button>{invoice.balanceCents > 0 && <button className="pay-action" onClick={() => { setPaymentInvoice(invoice); setPaymentAmount(invoice.balanceCents) }}><Banknote /></button>}</div></td></tr>)}</tbo