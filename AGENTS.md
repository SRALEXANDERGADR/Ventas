# AGENTS.md

## Descripción

Aura Beauty es una tienda de cuidado personal con catálogo público,
carrito, registro de pedidos y un panel administrativo protegido. El panel
gestiona inventario, clientes, facturas, saldos y abonos.

## Tecnologías

- TanStack Start, React 19 y TypeScript estricto.
- Tailwind CSS 4 más estilos propios en `src/styles.css`.
- Rutas de servidor de TanStack Start (`src/routes/api/`) para la API HTTP,
  desplegadas como Cloudflare Worker vía `@cloudflare/vite-plugin`.
- PostgreSQL en Neon con Drizzle ORM (`drizzle-orm/neon-http`).
- Autenticación administrativa propia: `ADMIN_PASSWORD` (secreto de
  Cloudflare) + cookie de sesión firmada con HMAC-SHA256 (`SESSION_SECRET`).

## Arquitectura

- `src/routes/index.tsx`: entrada de la tienda pública.
- `src/routes/admin.tsx`: entrada del panel administrativo.
- `src/components/Storefront.tsx`: catálogo, filtros, carrito y checkout.
- `src/components/AdminPanel.tsx`: autenticación y módulos de gestión.
- `src/routes/api/$.ts`: API de productos, pedidos, clientes, facturas y
  pagos (catch-all bajo `/api/*`).
- `src/routes/api/auth/login.ts`, `logout.ts`, `me.ts`: sesión del panel.
- `src/lib/auth.ts`: firma y verificación de la cookie de sesión.
- `db/schema.ts`: definición de tablas Postgres.
- `db/index.ts`: cliente Drizzle sobre Neon (`neon-http`), lee `DATABASE_URL`
  desde el binding de entorno de Cloudflare Workers (`cloudflare:workers`).
- `db/migrations/`: migraciones SQL, aplicadas manualmente o con
  `drizzle-kit`.
- `src/types.ts`: contratos compartidos por la interfaz.
- `wrangler.jsonc`: configuración del Worker de Cloudflare.

## Convenciones

- Componentes React en PascalCase; funciones y variables en camelCase.
- Valores monetarios almacenados como enteros en centavos (`priceCents`, `totalCents`).
- Columnas Postgres en snake_case y propiedades TypeScript en camelCase.
- Las operaciones administrativas siempre requieren una cookie de sesión
  válida, emitida solo tras autenticarse con `ADMIN_PASSWORD`.
- Los pedidos públicos solo pueden crear facturas; nunca acceden a datos
  administrativos.
- No guardar datos persistentes en JSON, `localStorage` o memoria.
  `localStorage` se usa únicamente para conservar el carrito temporal del
  navegador.

## Decisiones Importantes

- Eliminar un producto lo oculta (`active = false`) para conservar el
  historial de facturas.
- Cada producto requiere un código único.
- El estado de una factura se deriva del monto pagado y de su fecha límite.
- Las primeras muestras del catálogo se insertan en la base de datos al abrir
  una instalación vacía.
- Migración desde Netlify (agosto 2026): se reemplazaron Netlify Functions
  por rutas de servidor de TanStack Start, Netlify Database por Neon
  (`drizzle-orm/neon-http`) y Netlify Identity por un login de contraseña
  única + cookie firmada. El diseño, la interfaz y el modelo de datos no
  cambiaron.

## Desarrollo

Usar `pnpm dev` (usa el plugin de Vite de Cloudflare, así que el servidor de
desarrollo ya corre dentro del runtime de Workers). Copia
`.dev.vars.example` a `.dev.vars` con `DATABASE_URL`, `ADMIN_PASSWORD` y
`SESSION_SECRET` antes de arrancar. No editar migraciones ya aplicadas;
actualizar `db/schema.ts` y generar una migración nueva con
`pnpm db:generate`.
