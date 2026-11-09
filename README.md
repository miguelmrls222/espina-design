# Espina Design

Vite + Tailwind v4 (frontend) y Cloudflare Pages Functions (`functions/api/`).

## Comandos
- `npm run dev` / `npm run build`: regeneran `src/data/catalog.generated.ts` antes de correr.
- `npm run typecheck` y `npm test`.

## Precios y promo (fuente única)
`src/data/pricing.ts` (reglas: promo, envío gratis, límites) y `src/data/productos/*.json` (precio de cada producto).
Para renovar la promo cambia `PROMO.expiraEn` (ISO con zona, ej. `2026-12-31T23:59:59-07:00`).
Frontend y servidor usan las mismas funciones; el servidor recalcula todo y el navegador no envía precios.

## Variables de entorno (Cloudflare Pages → Settings → Variables)
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SKYDROP_CLIENT_ID`, `SKYDROP_CLIENT_SECRET`, `BREVO_API_KEY`.
Opcionales: `ORIGEN_TELEFONO`, `ORIGEN_EMAIL`, `MAIL_REMITENTE`, `MAIL_RESENAS_DESTINO`.

## Webhook de Stripe
Endpoint `/api/stripe-webhook`, eventos `checkout.session.completed` y `checkout.session.async_payment_succeeded`.
La idempotencia se guarda en la metadata de la sesión (`envio_estado`, `envio_guia`).

## Desarrollo local
`npm run dev` sirve solo el frontend (Vite): las rutas `/api/*` NO existen ahí y los formularios fallarán.
Para probar frontend + funciones: copia `.dev.vars.example` a `.dev.vars`, llena los valores y corre `npm run dev:pages`
(compila y levanta `wrangler pages dev dist`). Webhooks locales: `stripe listen --forward-to localhost:8788/api/stripe-webhook`.

## Despliegue en Cloudflare Pages
Build command `npm run build`, output directory `dist`, raíz del proyecto = esta carpeta (con `functions/` en la raíz).
Este contenido se **fusiona** con el repo existente (no incluye `public/`, el CMS `/admin`, `functions/auth.js`/`callback.js`, `workers/` ni `wrangler.jsonc`, que se conservan).
Antes de subirlo, borra `functions/api/{create-checkout,stripe-webhook,submit-review,subscribe}.js` y `package-lock.json`.
