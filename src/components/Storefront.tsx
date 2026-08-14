import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  Check,
  ChevronRight,
  Minus,
  PackageOpen,
  Plus,
  Search,
  Settings,
  ShoppingBag,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { currency } from '@/lib/format'
import { DEFAULT_SITE_CONTENT } from '@/lib/site-content'
import type { Product, SiteContent } from '@/types'

type CartLine = { product: Product; quantity: number }
type CheckoutData = { name: string; phone: string; email: string; address: string }

const emptyCheckout: CheckoutData = { name: '', phone: '', email: '', address: '' }

export function Storefront() {
  const [products, setProducts] = useState<Product[]>([])
  const [content, setContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Todos')
  const [cart, setCart] = useState<Record<number, number>>({})
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [checkout, setCheckout] = useState<CheckoutData>(emptyCheckout)
  const [submitting, setSubmitting] = useState(false)
  const [orderNumber, setOrderNumber] = useState('')

  const text = (key: keyof SiteContent) => content[key] ?? DEFAULT_SITE_CONTENT[key]

  useEffect(() => {
    const saved = window.localStorage.getItem('aura-cart')
    if (saved) setCart(JSON.parse(saved) as Record<number, number>)
    fetch('/api/products')
      .then(async (response) => {
        if (!response.ok) throw new Error(text('catalog_load_error'))
        return response.json() as Promise<Product[]>
      })
      .then(setProducts)
      .catch((caught: Error) => setError(caught.message))
      .finally(() => setLoading(false))
    fetch('/api/content')
      .then(async (response) => {
        if (!response.ok) throw new Error('No pudimos cargar el contenido.')
        return response.json() as Promise<SiteContent>
      })
      .then((loaded) => setContent((current) => ({ ...current, ...loaded })))
      .catch(() => {
        // Si el contenido no puede cargarse, la página sigue mostrando los
        // valores por defecto en vez de romperse.
      })
  }, [])

  useEffect(() => {
    window.localStorage.setItem('aura-cart', JSON.stringify(cart))
  }, [cart])

  const categories = useMemo(() => ['Todos', ...new Set(products.filter((product) => product.active).map((product) => product.category))], [products])
  const visibleProducts = useMemo(() => products.filter((product) => {
    const term = search.toLowerCase()
    return product.active && (category === 'Todos' || product.category === category) && (!term || product.name.toLowerCase().includes(term) || product.code.toLowerCase().includes(term))
  }), [products, search, category])
  const cartLines = useMemo<CartLine[]>(() => products.flatMap((product) => {
    const quantity = cart[product.id] || 0
    return quantity ? [{ product, quantity }] : []
  }), [products, cart])
  const cartCount = cartLines.reduce((sum, line) => sum + line.quantity, 0)
  const cartTotal = cartLines.reduce((sum, line) => sum + line.product.priceCents * line.quantity, 0)

  const changeQuantity = (product: Product, delta: number) => {
    setCart((current) => {
      const next = Math.max(0, Math.min(product.stock, (current[product.id] || 0) + delta))
      const updated = { ...current }
      if (next) updated[product.id] = next
      else delete updated[product.id]
      return updated
    })
  }

  const submitOrder = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer: checkout, items: cartLines.map((line) => ({ productId: line.product.id, quantity: line.quantity })) }),
      })
      const result = await response.json() as { error?: string; invoice?: { number: string } }
      if (!response.ok) throw new Error(result.error || text('order_generic_error'))
      setOrderNumber(result.invoice?.number || '')
      setCart({})
      setCheckout(emptyCheckout)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Ocurrió un error inesperado.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="storefront">
      <header className="site-header">
        <a className="brand" href="#inicio" aria-label={`${text('site_name')} inicio`}>
          <span className="brand-mark"><Sparkles size={19} /></span>
          <span><strong>{text('site_name')}</strong><small>{text('site_tagline')}</small></span>
        </a>
        <nav className="desktop-nav" aria-label="Navegación principal">
          <a href="#catalogo">{text('nav_catalog')}</a>
          <a href="#beneficios">{text('nav_essence')}</a>
          <a href="#contacto">{text('nav_contact')}</a>
        </nav>
        <div className="header-actions">
          <Link to="/admin" className="icon-button" aria-label="Abrir panel de administración" title="Administración"><Settings size={20} /></Link>
          <button className="cart-button" onClick={() => setCartOpen(true)}><ShoppingBag size={19} /><span>{text('nav_cart_button')}</span>{cartCount > 0 && <b>{cartCount}</b>}</button>
        </div>
      </header>

      <section className="hero" id="inicio">
        <div className="hero-copy reveal">
          <span className="eyebrow">{text('hero_eyebrow')}</span>
          <h1>{text('hero_title')}<br /><em>{text('hero_title_emphasis')}</em></h1>
          <p>{text('hero_description')}</p>
          <a href="#catalogo" className="primary-button">{text('hero_button')} <ArrowRight size={18} /></a>
          <div className="hero-notes"><span><Check size={15} /> {text('hero_note_1')}</span><span><Check size={15} /> {text('hero_note_2')}</span></div>
        </div>
        <div className="hero-visual reveal delay-1">
          <div className="hero-image" style={{ backgroundImage: `url("${text('hero_image_url')}")` }} />
          <div className="floating-card"><span>{text('hero_favorite_label')}</span><strong>{text('hero_favorite_product')}</strong><small>{text('hero_favorite_description')}</small></div>
          <div className="orbit-label">{text('hero_orbit_text')}</div>
        </div>
      </section>

      <section className="promise-strip" id="beneficios">
        <div><strong>01</strong><span>{text('benefit_1_title')}<small>{text('benefit_1_description')}</small></span></div>
        <div><strong>02</strong><span>{text('benefit_2_title')}<small>{text('benefit_2_description')}</small></span></div>
        <div><strong>03</strong><span>{text('benefit_3_title')}<small>{text('benefit_3_description')}</small></span></div>
      </section>

      <section className="catalog-section" id="catalogo">
        <div className="section-heading">
          <div><span className="eyebrow">{text('catalog_eyebrow')}</span><h2>{text('catalog_title')}</h2></div>
          <p>{text('catalog_description')}</p>
        </div>
        <div className="catalog-tools">
          <div className="category-pills">{categories.map((item) => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div>
          <label className="search-field"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={text('catalog_search_placeholder')} /></label>
        </div>

        {loading ? <div className="product-grid">{[1, 2, 3, 4].map((item) => <div className="product-skeleton" key={item} />)}</div> : null}
        {!loading && error && !products.length ? <div className="empty-state"><PackageOpen size={40} /><h3>{text('catalog_empty_error_title')}</h3><p>{error}</p></div> : null}
        {!loading && !visibleProducts.length && products.length ? <div className="empty-state"><Search size={40} /><h3>{text('catalog_empty_search_title')}</h3><p>{text('catalog_empty_search_description')}</p></div> : null}
        <div className="product-grid">
          {visibleProducts.map((product, index) => (
            <article className="product-card reveal" style={{ animationDelay: `${index * 70}ms` }} key={product.id}>
              <div className="product-image-wrap">
                {product.featured && <span className="product-badge">{text('product_favorite_badge')}</span>}
                <span className="product-code">{product.code}</span>
                {product.imageUrl ? <img src={product.imageUrl} alt={product.name} /> : <div className="image-placeholder"><Sparkles /></div>}
                <button className="quick-add" disabled={!product.stock} onClick={() => { changeQuantity(product, 1); setCartOpen(true) }}><Plus size={18} /> {product.stock ? text('product_add_button') : text('product_sold_out_button')}</button>
              </div>
              <div className="product-info"><span>{product.category}</span><h3>{product.name}</h3><p>{product.description}</p><div><strong>{currency(product.priceCents)}</strong><small>{product.stock} {text('product_stock_suffix')}</small></div></div>
            </article>
          ))}
        </div>
      </section>

      <section className="story-section">
        <div className="story-number">{text('essence_number')}</div>
        <div><span className="eyebrow">{text('essence_eyebrow')}</span><h2>{text('essence_title')}<br />{text('essence_title_emphasis')}</h2></div>
        <p>{text('essence_description')}</p>
      </section>

      <footer id="contacto">
        <div className="brand footer-brand"><span className="brand-mark"><Sparkles size={19} /></span><span><strong>{text('site_name')}</strong><small>{text('site_tagline')}</small></span></div>
        <p>{text('footer_tagline')}</p>
        <div className="footer-contact"><span>{text('footer_contact_label')}</span><strong>{text('footer_phone')}</strong><small>{text('footer_hours')}</small></div>
        <a className="footer-credit" href="https://gadrnet.com" target="_blank" rel="noopener noreferrer">Creado por: <strong>GADR Net</strong></a>
        <div className="footer-legal">
          <span>© 2026 Cristy Beauty. Todos los derechos reservados.</span>
          <Link to="/politicas">Políticas</Link>
        </div>
      </footer>

      {cartOpen && <div className="drawer-layer" role="dialog" aria-modal="true">
        <button className="drawer-backdrop" aria-label="Cerrar cesta" onClick={() => setCartOpen(false)} />
        <aside className="cart-drawer">
          <div className="drawer-header"><div><span>{text('cart_subtitle')}</span><h2>{text('cart_title')} <small>{cartCount}</small></h2></div><button className="icon-button" onClick={() => setCartOpen(false)}><X /></button></div>
          <div className="cart-lines">
            {!cartLines.length && <div className="empty-state"><ShoppingBag size={40} /><h3>{text('cart_empty_title')}</h3><p>{text('cart_empty_description')}</p><button className="text-button" onClick={() => setCartOpen(false)}>{text('cart_empty_button')} <ChevronRight size={16} /></button></div>}
            {cartLines.map(({ product, quantity }) => <div className="cart-line" key={product.id}>
              <img src={product.imageUrl || '/product-placeholder.svg'} alt="" />
              <div><small>{product.code}</small><h3>{product.name}</h3><strong>{currency(product.priceCents)}</strong><div className="quantity-control"><button onClick={() => changeQuantity(product, -1)}><Minus size={14} /></button><span>{quantity}</span><button onClick={() => changeQuantity(product, 1)}><Plus size={14} /></button></div></div>
              <button className="remove-button" onClick={() => setCart((current) => { const next = { ...current }; delete next[product.id]; return next })}><Trash2 size={17} /></button>
            </div>)}
          </div>
          {cartLines.length > 0 && <div className="cart-summary"><div><span>{text('cart_subtotal_label')}</span><strong>{currency(cartTotal)}</strong></div><small>{text('cart_pending_note')}</small><button className="primary-button full" onClick={() => setCheckoutOpen(true)}>{text('cart_checkout_button')} <ArrowRight size={18} /></button></div>}
        </aside>
      </div>}

      {checkoutOpen && <div className="modal-layer" role="dialog" aria-modal="true">
        <button className="modal-backdrop" aria-label="Cerrar" onClick={() => !submitting && setCheckoutOpen(false)} />
        <div className="checkout-modal">
          <button className="modal-close icon-button" onClick={() => setCheckoutOpen(false)}><X /></button>
          {orderNumber ? <div className="success-message"><span><Check /></span><small>{text('checkout_success_label')}</small><h2>{text('checkout_success_title')}</h2><p>{text('checkout_success_message').replace('{number}', orderNumber)}</p><button className="primary-button" onClick={() => { setOrderNumber(''); setCheckoutOpen(false); setCartOpen(false) }}>{text('checkout_success_button')}</button></div> : <form onSubmit={submitOrder}>
            <span className="eyebrow">{text('checkout_eyebrow')}</span><h2>{text('checkout_title')}</h2><p className="form-intro">{text('checkout_intro')}</p>
            <div className="form-grid"><label>{text('checkout_name_label')}<input required value={checkout.name} onChange={(event) => setCheckout({ ...checkout, name: event.target.value })} /></label><label>{text('checkout_phone_label')}<input required value={checkout.phone} onChange={(event) => setCheckout({ ...checkout, phone: event.target.value })} /></label><label>{text('checkout_email_label')}<input type="email" value={checkout.email} onChange={(event) => setCheckout({ ...checkout, email: event.target.value })} /></label><label>{text('checkout_address_label')}<input required value={checkout.address} onChange={(event) => setCheckout({ ...checkout, address: event.target.value })} /></label></div>
            {error && <p className="form-error">{error}</p>}
            <div className="checkout-total"><span>{text('checkout_total_label')}</span><strong>{currency(cartTotal)}</strong></div>
            <button className="primary-button full" disabled={submitting}>{submitting ? text('checkout_submitting_button') : text('checkout_submit_button')} <ArrowRight size={18} /></button>
          </form>}
        </div>
      </div>}
    </main>
  )
}
