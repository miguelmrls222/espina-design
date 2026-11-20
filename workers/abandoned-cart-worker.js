// Recuperación de carritos abandonados (WhatsApp + correo) — Cron Worker
// Deploy como Worker separado (wrangler deploy en workers/), NO como Pages Function.
//
// Fuente de verdad del carrito: la Checkout Session de Stripe. create-checkout la crea con
// status "open", el teléfono en metadata.telefono y el carrito en metadata.cart. Mientras
// siga "open" el pedido no se completó; al pagar pasa a "complete" y al vencer a "expired".
// KV (ABANDONED_CARTS) guarda solo el estado de los recordatorios: wa:<id> y sent:<id>.
//
// Secretos: STRIPE_SECRET_KEY, BREVO_API_KEY, WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID
// Variables: WHATSAPP_TEMPLATE (default carrito_abandonado), WHATSAPP_LANG (default es_MX)
// Opcional: CRON_SECRET para disparar manualmente con el header X-Cron-Secret.

const MINUTOS_ESPERA = 60
const VENTANA_HORAS = 24
const SITIO = 'https://espinadesign.com'
const GRAPH_API = 'https://graph.facebook.com/v21.0'
const MAX_INTENTOS_WHATSAPP = 3
const TTL_ESTADO_SEGUNDOS = 7 * 86400
const ZONA_UTC_OFFSET_HORAS = -7
const HORA_INICIO_ENVIOS = 9
const HORA_FIN_ENVIOS = 21
const TIMEOUT_MS = 8000

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(procesarCarritos(env))
  },

  async fetch(request, env) {
    const secreto = env.CRON_SECRET
    if (secreto && request.headers.get('X-Cron-Secret') === secreto) {
      await procesarCarritos(env)
      return new Response('OK')
    }
    return new Response('Unauthorized', { status: 401 })
  },
}

async function procesarCarritos(env) {
  if (!env.STRIPE_SECRET_KEY) return

  const ahora = Math.floor(Date.now() / 1000)
  const sesiones = await listarSesiones(env.STRIPE_SECRET_KEY, ahora - VENTANA_HORAS * 3600, ahora)
  const compradores = identificadoresDeCompras(sesiones)
  const dentroDeHorario = esHorarioDeEnvio(ahora * 1000)

  for (const sesion of sesiones) {
    if (sesion.status !== 'open' || !sesion.metadata?.cart) continue
    if ((ahora - sesion.created) / 60 < MINUTOS_ESPERA) continue

    const email = normalizarEmail(sesion.customer_email)
    const telefono = normalizarTelefonoMx(sesion.metadata?.telefono)
    if ((email && compradores.has(email)) || (telefono && compradores.has(telefono))) continue

    if (telefono && dentroDeHorario && env.WHATSAPP_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID) {
      await recordarPorWhatsApp(env, sesion, telefono)
    }
    if (email && env.BREVO_API_KEY) {
      await recordarPorCorreo(env, sesion)
    }
  }
}

async function listarSesiones(stripeKey, desde, hasta) {
  const sesiones = []
  let despuesDe = null
  for (;;) {
    let url = `https://api.stripe.com/v1/checkout/sessions?limit=100&created[gte]=${desde}&created[lte]=${hasta}`
    if (despuesDe) url += `&starting_after=${despuesDe}`
    const res = await fetchConTiempo(url, { headers: { Authorization: `Bearer ${stripeKey}` } })
    if (!res || !res.ok) break
    const cuerpo = await res.json()
    const datos = cuerpo.data || []
    sesiones.push(...datos)
    if (!cuerpo.has_more || !datos.length) break
    despuesDe = datos[datos.length - 1].id
  }
  return sesiones
}

// Quien ya completó otra compra en la ventana no debe recibir recordatorio por un carrito anterior.
function identificadoresDeCompras(sesiones) {
  const ids = new Set()
  for (const s of sesiones) {
    if (s.status !== 'complete') continue
    const email = normalizarEmail(s.customer_email)
    const telefono = normalizarTelefonoMx(s.metadata?.telefono)
    if (email) ids.add(email)
    if (telefono) ids.add(telefono)
  }
  return ids
}

function esHorarioDeEnvio(ms) {
  const hora = new Date(ms + ZONA_UTC_OFFSET_HORAS * 3600 * 1000).getUTCHours()
  return hora >= HORA_INICIO_ENVIOS && hora < HORA_FIN_ENVIOS
}

function normalizarEmail(valor) {
  return typeof valor === 'string' && valor.includes('@') ? valor.trim().toLowerCase() : ''
}

// Devuelve 52 + 10 dígitos (formato aceptado por WhatsApp Cloud API) o '' si no es un número mexicano válido.
function normalizarTelefonoMx(valor) {
  let digitos = String(valor || '').replace(/\D/g, '')
  if (digitos.length === 13 && digitos.startsWith('521')) digitos = '52' + digitos.slice(3)
  if (digitos.length === 10) digitos = '52' + digitos
  return /^52\d{10}$/.test(digitos) ? digitos : ''
}

async function fetchConTiempo(url, init) {
  const controlador = new AbortController()
  const temporizador = setTimeout(() => controlador.abort(), TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controlador.signal })
  } catch {
    return null
  } finally {
    clearTimeout(temporizador)
  }
}

function leerCarrito(sesion) {
  try {
    const items = JSON.parse(sesion.metadata?.cart || '[]')
    return Array.isArray(items) ? items : []
  } catch {
    return []
  }
}

function resumenCarrito(sesion) {
  const texto = leerCarrito(sesion)
    .map(i => `${i.n}${i.col ? ` (${i.col})` : ''} x${i.c || 1}`)
    .join(', ')
    .replace(/\s+/g, ' ')
    .trim()
  return texto.length > 200 ? `${texto.slice(0, 197)}...` : texto || 'tus productos'
}

// ---------- WhatsApp (Meta Cloud API, plantilla aprobada) ----------

async function recordarPorWhatsApp(env, sesion, telefono) {
  if (!env.ABANDONED_CARTS) return
  const clave = `wa:${sesion.id}`
  const previo = JSON.parse((await env.ABANDONED_CARTS.get(clave)) || 'null')
  if (previo && (previo.estado === 'enviado' || previo.estado === 'fallido')) return
  const intentos = (previo?.intentos || 0) + 1
  if (intentos > MAX_INTENTOS_WHATSAPP) return

  await env.ABANDONED_CARTS.put(clave, JSON.stringify({ estado: 'enviando', intentos }), { expirationTtl: TTL_ESTADO_SEGUNDOS })
  const resultado = await enviarWhatsApp(env, { telefono, resumen: resumenCarrito(sesion), sessionId: sesion.id })
  const estado = resultado.ok ? 'enviado' : resultado.temporal && intentos < MAX_INTENTOS_WHATSAPP ? 'reintentar' : 'fallido'
  const registro = { estado, intentos, enviadoEn: resultado.ok ? Date.now() : undefined, error: resultado.ok ? undefined : resultado.detalle }
  await env.ABANDONED_CARTS.put(clave, JSON.stringify(registro), { expirationTtl: TTL_ESTADO_SEGUNDOS })
  if (!resultado.ok) console.warn(`WhatsApp ${sesion.id}: ${estado} (${resultado.detalle})`)
}

export async function enviarWhatsApp(env, { telefono, resumen, sessionId }) {
  const payload = {
    messaging_product: 'whatsapp',
    to: telefono,
    type: 'template',
    template: {
      name: env.WHATSAPP_TEMPLATE || 'carrito_abandonado',
      language: { code: env.WHATSAPP_LANG || 'es_MX' },
      components: [
        { type: 'body', parameters: [{ type: 'text', text: resumen }] },
        { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: sessionId }] },
      ],
    },
  }
  const peticion = {
    method: 'POST',
    headers: { 'content-type': 'application/json', Authorization: `Bearer ${env.WHATSAPP_TOKEN}` },
    body: JSON.stringify(payload),
  }
  const url = `${GRAPH_API}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`

  let ultimo = { ok: false, temporal: true, detalle: 'sin respuesta' }
  for (let intento = 0; intento < 2; intento++) {
    if (intento) await new Promise(r => setTimeout(r, 1000))
    const res = await fetchConTiempo(url, peticion)
    if (!res) {
      ultimo = { ok: false, temporal: true, detalle: 'sin respuesta de WhatsApp' }
      continue
    }
    if (res.ok) return { ok: true }
    const temporal = res.status >= 500 || res.status === 429
    ultimo = { ok: false, temporal, detalle: `HTTP ${res.status}` }
    if (!temporal) break
  }
  return ultimo
}

// ---------- Correo (Brevo) ----------

async function recordarPorCorreo(env, sesion) {
  if (!env.ABANDONED_CARTS) return
  if (await env.ABANDONED_CARTS.get(`sent:${sesion.id}`)) return
  if (await enviarEmailRecuperacion(sesion, env.BREVO_API_KEY)) {
    await env.ABANDONED_CARTS.put(`sent:${sesion.id}`, '1', { expirationTtl: TTL_ESTADO_SEGUNDOS })
  }
}

async function enviarEmailRecuperacion(session, brevoKey) {
  const email = session.customer_email
  const items = (() => {
    try { return JSON.parse(session.metadata?.cart || '[]') } catch { return [] }
  })()

  const listaItems = items.map(i =>
    `• ${i.n}${i.col ? ` (${i.col})` : ''} — $${(i.p || 0).toLocaleString('es-MX')} MXN × ${i.c || 1}`
  ).join('\n')

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'api-key': brevoKey,
      },
      body: JSON.stringify({
        sender: { name: 'Espina Design', email: 'miguelmrls222@gmail.com' },
        to: [{ email }],
        subject: '¿Olvidaste algo? — Tu carrito te espera 🛒',
        htmlContent: `
<!doctype html>
<html>
<body style="font-family:Helvetica,Arial,sans-serif;background:#f5f5f5;padding:20px;margin:0">
<table style="max-width:520px;margin:0 auto;background:#fff;padding:32px">
<tr><td style="text-align:center;padding-bottom:8px">
<h1 style="font-size:16px;text-transform:uppercase;letter-spacing:.12em;color:#000;margin:0">Espina Design</h1>
<p style="font-size:13px;color:#666;margin:8px 0 20px">Cuero hecho a mano — Hermosillo, Sonora</p>
</td></tr>
<tr><td>
<h2 style="font-size:15px;color:#000;margin:0 0 6px">¡Tu carrito sigue aquí!</h2>
<p style="font-size:13px;color:#555;line-height:1.5;margin:0 0 16px">Hace un momento nos visitaste y dejaste estos productos pendientes. ¿Quieres completar tu pedido?</p>
<div style="background:#f9f9f9;padding:14px;border-radius:4px;margin:0 0 20px;font-size:13px;color:#333;line-height:1.6;white-space:pre-wrap">${listaItems}</div>
<a href="https://espinadesign.com/api/recover-cart?session_id=${session.id}" style="display:block;text-align:center;background:#000;color:#fff;text-decoration:none;padding:12px;font-size:13px;text-transform:uppercase;letter-spacing:.08em;border-radius:2px">Completar mi pedido</a>
</td></tr>
<tr><td style="text-align:center;padding-top:24px;font-size:11px;color:#999">
<p style="margin:0">Si tienes dudas, responde a este correo o escríbenos por WhatsApp.</p>
<p style="margin:6px 0 0">Espina Design — Hermosillo, Sonora, México</p>
</td></tr>
</table>
</body>
</html>`,
      }),
    })
    return res.ok
  } catch {
    return false
  }
}
