# Aura Esenciales

Tienda web y sistema de gestión comercial para vender productos de cuidado
personal. Incluye catálogo, búsqueda por nombre o código, carrito
persistente, registro de pedidos, clientes, facturas, inventario, saldos
pendientes y abonos.

## Funciones Principales

- Catálogo público responsivo con categorías y disponibilidad.
- Carrito que conserva la selección en el navegador.
- Checkout sin cuenta que registra cliente, pedido y factura.
- Productos con código único, precio, categoría, imagen y existencias.
- Clientes con historial resumido y saldo acumulado.
- Facturas con partidas, pago inicial, vencimiento y estado.
- Registro de abonos con actualización automática del saldo.
- Panel privado protegido por contraseña de administrador y sesión firmada.

## Tecnologías

- TanStack Start, React 19, TypeScript y Vite.
- Rutas de servidor nativas de TanStack Start (`src/routes/api/`) desplegadas
  como Cloudflare Worker.
- PostgreSQL en [Neon](https://neon.tech) con Drizzle ORM
  (`drizzle-orm/neon-http`).
- Autenticación administrativa propia: contraseña como secreto de Cloudflare
  + cookie de sesión firmada con HMAC-SHA256 (`src/lib/auth.ts`).
- Tailwind CSS 4 y un sistema visual personalizado.
- Despliegue con Cloudflare Workers / Wrangler.

## Variables de entorno / secretos necesarios

| Variable         | Dónde se usa                                    | Ejemplo |
|------------------|--------------------------------------------------|---------|
| `DATABASE_URL`   | Conexión a Neon (`db/index.ts`, drizzle-kit)      | `postgresql://user:pass@ep-xxxx.neon.tech/neondb?sslmode=require` |
| `ADMIN_PASSWORD` | Contraseña del panel administrativo               | cadena elegida por ti |
| `SESSION_SECRET` | Firma HMAC de la cookie de sesión administrativa  | cadena larga y aleatoria |

En **desarrollo local** colócalas en un archivo `.dev.vars` (copia
`.dev.vars.example`); Wrangler/Vite las inyecta automáticamente.

En **producción (Cloudflare)**:

```bash
wrangler secret put DATABASE_URL
wrangler secret put ADMIN_PASSWORD
wrangler secret put SESSION_SECRET
```

(También puedes configurarlas desde el dashboard de Cloudflare en
Workers & Pages → tu proyecto → Settings → Variables.)

## Configuración Inicial

1. Crea un proyecto y una base de datos en [Neon](https://neon.tech) y copia
   su cadena de conexión a `DATABASE_URL`.
2. Aplica la migración inicial contra esa base de datos (una sola vez). La
   forma más simple es pegar el contenido de
   `db/migrations/0000_create_commerce_tables.sql` en el editor SQL de Neon,
   o ejecutarlo con `psql`:
   ```bash
   psql "$DATABASE_URL" -f db/migrations/0000_create_commerce_tables.sql
   ```
   Para futuros cambios de esquema usa `pnpm db:generate` (genera una nueva
   migración a partir de `db/schema.ts`) y `pnpm db:migrate` para aplicarla.
3. Define `ADMIN_PASSWORD` y `SESSION_SECRET` como secretos de Cloudflare
   (ver arriba).
4. Despliega con `pnpm deploy` (compila y ejecuta `wrangler deploy`).
5. Abre `/admin` o usa el icono de configuración de la tienda para iniciar
   sesión con `ADMIN_PASSWORD`.

## Desarrollo Local

```bash
pnpm install
cp .dev.vars.example .dev.vars   # y completa los valores
pnpm dev
```

La tienda queda disponible en `http://localhost:3000`. Como el proyecto usa
el plugin de Vite de Cloudflare, `pnpm dev` ya ejecuta el código de servidor
dentro del runtime de Workers (workerd), igual que en producción.

## Comandos

```bash
pnpm install        # instalar dependencias
pnpm dev             # servidor de desarrollo (puerto 3000)
pnpm build           # build de producción
pnpm preview         # previsualizar el build localmente con Workers
pnpm deploy           # build + wrangler deploy
pnpm cf-typegen      # generar tipos de las variables/bindings de Cloudflare
pnpm db:generate     # generar una nueva migración a partir de db/schema.ts
pnpm db:migrate      # aplicar migraciones pendientes
```

## Estructura

- `src/components/Storefront.tsx`: tienda y carrito.
- `src/components/AdminPanel.tsx`: panel administrativo.
- `src/routes/api/$.ts`: API de productos, pedidos, clientes, facturas y pagos
  (antes `netlify/functions/api.mts`).
- `src/routes/api/auth/`: login, logout y verificación de sesión del panel.
- `src/lib/auth.ts`: cookie de sesión firmada (reemplaza Netlify Identity).
- `db/schema.ts`: modelo de datos.
- `db/index.ts`: conexión Drizzle + Neon (`neon-http`, apta para Workers).
- `db/migrations/`: migraciones SQL.
- `src/styles.css`: diseño global y adaptación móvil.
- `wrangler.jsonc`: configuración del Worker de Cloudflare.
