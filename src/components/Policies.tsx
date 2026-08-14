import { Link } from '@tanstack/react-router'
import { ArrowLeft, Sparkles } from 'lucide-react'

export function Policies() {
  return (
    <div className="policies-page">
      <header className="policies-header">
        <Link to="/" className="brand">
          <span className="brand-mark"><Sparkles size={19} /></span>
          <span><strong>Cristy</strong><small>BEAUTY</small></span>
        </Link>
        <Link to="/" className="policies-back"><ArrowLeft size={16} /> Volver a la tienda</Link>
      </header>

      <main className="policies-content">
        <h1>Políticas</h1>
        <p className="policies-updated">Última actualización: 2026</p>

        <section>
          <h2>Política de privacidad</h2>
          <p>
            En Cristy Beauty solo pedimos los datos necesarios para procesar tu pedido:
            nombre, teléfono, correo y dirección de entrega. Esta información se usa
            únicamente para contactarte sobre tu compra y coordinar la entrega, y no se
            comparte con terceros ni se usa con fines distintos a los de tu pedido.
          </p>
        </section>

        <section>
          <h2>Política de pedidos y pagos</h2>
          <p>
            Al confirmar un pedido, recibirás un número de factura y nos pondremos en
            contacto contigo para coordinar el pago y la entrega. Los precios mostrados
            en la tienda están sujetos a disponibilidad de existencias al momento de
            confirmar el pedido.
          </p>
        </section>

        <section>
          <h2>Política de cambios y devoluciones</h2>
          <p>
            Si recibiste un producto defectuoso o distinto al que pediste, contáctanos
            dentro de los primeros 3 días después de recibirlo para coordinar el cambio.
            Por tratarse de productos de cuidado personal, no se aceptan devoluciones de
            productos ya abiertos o usados, salvo defecto de fábrica.
          </p>
        </section>

        <section>
          <h2>Contacto</h2>
          <p>
            Si tienes preguntas sobre estas políticas, escríbenos por WhatsApp al número
            que aparece en la tienda.
          </p>
        </section>
      </main>
    </div>
  )
}
