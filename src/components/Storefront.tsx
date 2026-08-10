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
import type { Product } from '@/types'

type CartLine = { product: Product; quantity: number }
type CheckoutData = { name: string; phone: string; email: string; address: string }

const emptyCheckout: CheckoutData = { name: '', phone: '', email: '', address: '' }

export function Storefront() {
  const [products, setProducts] = useState<Product[]>([])
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

  useEffect(() => {
    const saved = window.localStorage.getItem('aura-cart')
    if (saved) setCart(JSON.parse(saved) as Record<number, number>)
    fetch('/api/products')
      .then(async (response) => {
        if (!response.ok) throw new Error('No pudimos cargar el catálogo.')
        return response.json() as Promise<Product[]>
      })
      .then(setProducts)
      .catch((caught: Error) => setError(caught.message))
      .finally(() => setLoading(false))
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
      if (!response.ok) throw new Error(result.error || 'No pudimos registrar el pedido.')
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
        <a className="brand" href="#inicio" aria-label="Aura inicio">
          <span className="brand-mark"><Sparkles size={19} /></span>
          <span><strong>Aura</strong><small>esenciales</small></span>
        </a>
        <nav className="desktop-nav" aria-label="Navegación principal">
          <a href="#catalogo">Colección</a>
          <a href="#beneficios">Nuestra esencia</a>
          <a href="#contacto">Contacto</a>
        </nav>
        <div className="header-actions">
          <Link to="/admin" className="icon-button" aria-label="Abrir panel de administración" title="Administración"><Settings size={20} /></Link>
          <button className="cart-button" onClick={() => setCartOpen(true)}><ShoppingBag size={19} /><span>Mi cesta</span>{cartCount > 0 && <b>{cartCount}</b>}</button>
        </div>
      </header>

      <section className="hero" id="inicio">
        <div className="hero-copy reveal">
          <span className="eyebrow">Belleza cotidiana, elegida con intención</span>
          <h1>Tu ritual.<br /><em>Tu esencia.</em></h1>
          <p>Fórmulas para cabello, rostro y cuerpo que convierten lo cotidiano en un momento especial.</p>
          <a href="#catalogo" className="primary-button">Explorar productos <ArrowRight size={18} /></a>
          <div className="hero-notes"><span><Check size={15} /> Selección cuidada</span><span><Check size={15} /> Atención personal</span></div>
        </div>
        <div className="hero-visual reveal delay-1">
          <div className="hero-image" />
          <div className="floating-card"><span>Favorito de la semana</span><strong>Champú Botánico</strong><small>Romero + sábila</small></div>
          <div className="orbit-label">Cuidado que se siente</div>
        </div>
      </section>

      <section className="promise-strip" id="beneficios">
        <div><strong>01</strong><span>Productos seleccionados<small>Calidad que puedes sentir</small></span></div>
        <div><strong>02</strong><span>Compra fácil<small>Tu pedido en pocos pasos</small></span></div>
        <div><strong>03</strong><span>Cerca de ti<small>Atención humana y directa</small></span></div>
      </section>

      <section className="catalog-section" id="catalogo">
        <div className="section-heading">
          <div><span className="eyebrow">La colección</span><h2>Elige lo que te hace bien.</h2></div>
          <p>Descubre esenciales para cada parte de tu rutina, organizados para encontrar justo lo que necesitas.</p>
        </div>
        <div className="catalog-tools">
          <div className="category-pills">{categories.map((item) => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div>
          <label className="search-field"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar nombre o código" /></label>
        </div>

        {loading ? <div className="product-grid">{[1, 2, 3, 4].map((item) => <div className="product-skeleton" key={item} />)}</div> : null}
        {!loading && error && !products.length ? <div className="empty-state"><PackageOpen size={40} /><h3>El catálogo está descansando</h3><p>{error}</p></div> : null}
        {!loading && !visibleProducts.length && products.length ? <div className="empty-state"><Search size={40} /><h3>No encontramos coincidencias</h3><p>Prueba con otro nombre, código o categoría.</p></div> : null}
        <div className="product-grid">
          {visibleProducts.map((product, index) => (
            <article className="product-card reveal" style={{ animationDelay: `${index * 70}ms` }} key={product.id}>
              <div className="product-image-wrap">
                {product.featured && <span className="product-badge">Favorito</span>}
                <span className="product-code">{product.code}</span>
                {product.imageUrl ? <img src={product.imageUrl} alt={product.name} /> : <div className="image-placeholder"><Sparkles /></div>}
                <button className="quick-add" disabled={!product.stock} onClick={() => { changeQuantity(product, 1); setCartOpen(true) }}><Plus size={18} /> {product.stock ? 'Agregar' : 'Agotado'}</button>
              </div>
              <div className="product-info"><span>{product.category}</span><h3>{product.name}</h3><p>{product.description}</p><div><strong>{currency(product.priceCents)}</strong><small>{product.stock} disponibles</small></div></div>
            </article>
          ))}
        </div>
      </section>

      <section className="story-section">
        <div className="story-number">A</div>
        <div><span className="eyebrow">Nuestra forma de cuidarte</span><h2>Menos ruido.<br />Mejores elecciones.</h2></div>
        <p>Creamos una tienda fácil de explorar, con información clara y acompañamiento cercano para que tu compra se sienta tan bien como los productos que eliges.</p>
      </section>

      <footer id="contacto">
        <div className="brand footer-brand"><span className="brand-mark"><Sparkles size={19} /></span><span><strong>Aura</strong><small>esenciales</small></span></div>
        <p>Tu tienda de cuidado personal, todos los días.</p>
        <div><span>Pedidos y consultas</span><strong>+1 (809) 555-0147</strong><small>Lun–Sáb · 9:00–18:00</small></div>
      </footer>

      {cartOpen && <div className="drawer-layer" role="dialog" aria-modal="true">
        <button className="drawer-backdrop" aria-label="Cerrar cesta" onClick={() => setCartOpen(false)} />
        <aside className="cart-drawer">
          <div className="drawer-header"><div><span>Tu selección</span><h2>Mi cesta <small>{cartCount}</small></h2></div><button className="icon-button" onClick={() => setCartOpen(false)}><X /></button></div>
          <div className="cart-lines">
            {!cartLines.length && <div className="empty-state"><ShoppingBag size={40} /><h3>Tu cesta está vacía</h3><p>Agrega algo especial del catálogo.</p><button className="text-button" onClick={() => setCartOpen(false)}>Seguir explorando <ChevronRight size={16} /></button></div>}
            {cartLines.map(({ product, quantity }) => <div className="cart-line" key={product.id}>
              <img src={product.imageUrl || '/product-placeholder.svg'} alt="" />
              <div><small>{product.code}</small><h3>{product.name}</h3><strong>{currency(product.priceCents)}</strong><div className="quantity-control"><button onClick={() => changeQuantity(product, -1)}><Minus size={14} /></button><span>{quantity}</span><button onClick={() => changeQuantity(product, 1)}><Plus size={14} /></button></div></div>
              <button className="remove-button" onClick={() => setCart((current) => { const next = { ...current }; delete next[product.id]; return next })}><Trash2 size={17} /></button>
            </div>)}
          </div>
          {cartLines.length > 0 && <div className="cart-summary"><div><span>Subtotal</span><strong>{currency(cartTotal)}</strong></div><small>El pedido se registra como pendiente hasta confirmar el pago.</small><button className="primary-button full" onClick={() => setCheckoutOpen(true)}>Completar pedido <ArrowRight size={18} /></button></div>}
        </aside>
      </div>}

      {checkoutOpen && <div className="modal-layer" role="dialog" aria-modal="true">
        <button className="modal-backdrop" aria-label="Cerrar" onClick={() => !submitting && setCheckoutOpen(false)} />
        <div className="checkout-modal">
          <button className="modal-close icon-button" onClick={() => setCheckoutOpen(false)}><X /></button>
          {orderNumber ? <div className="success-message"><span><Check /></span><small>Pedido recibido</small><h2>¡Gracias por elegir Aura!</h2><p>Tu factura <strong>{orderNumber}</strong> quedó registrada. Nos comunicaremos contigo para coordinar entrega y pago.</p><button className="primary-button" onClick={() => { setOrderNumber(''); setCheckoutOpen(false); setCartOpen(false) }}>Volver a la tienda</button></div> : <form onSubmit={submitOrder}>
            <span className="eyebrow">Último paso</span><h2>¿A dónde llevamos tu pedido?</h2><p className="form-intro">Completa tus datos. No necesitas crear una cuenta.</p>
            <div className="form-grid"><label>Nombre completo<input required value={checkout.name} onChange={(event) => setCheckout({ ...checkout, name: event.target.value })} /></label><label>Teléfono<input required value={checkout.phone} onChange={(event) => setCheckout({ ...checkout, phone: event.target.value })} /></label><label>Correo electrónico<input type="email" value={checkout.email} onChange={(event) => setCheckout({ ...checkout, email: event.target.value })} /></label><label>Dirección de entrega<input required value={checkout.address} onChange={(event) => setCheckout({ ...checkout, address: event.target.value })} /></label></div>
            {error && <p className="form-error">{error}</p>}
            <div className="checkout-total"><span>Total del pedido</span><strong>{currency(cartTotal)}</strong></div>
            <button className="primary-button full" disabled={submitting}>{submitting ? 'Registrando pedido…' : 'Confirmar pedido'} <ArrowRight size={18} /></button>
          </form>}
        </div>
      </div>}
    </main>
  )
}
