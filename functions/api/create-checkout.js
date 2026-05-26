const PRECIOS = {
  'tarjetero cardón': 589,
  'tarjetero cactus': 489,
  'tarjetero agave': 589,
  'billetera sahuaro': 789,
}

const PROMO_EXPIRES = new Date(Date.UTC(2026, 4, 31, 23, 59, 59))

const ORIGEN = {
  zip: '83170',
  country: 'MX',
  state: 'Sonora',
  city: 'Hermosillo',
  neighborhood: 'Adolfo López Mateos',
}

const SKYDROP_BASE = 'https://pro.skydropx.com'

function isPromoActiva() {
  return Date.now() < PROMO_EXPIRES.getTime()
}

async function getSkydropToken(env) {
  const clientId = env.SKYDROP_CLIENT_ID
  const clientSecret = env.SKYDROP_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('SKYDROP_CLIENT_ID y SKYDROP_CLIENT_SECRET deben configurarse en las variables de entorno')
  }
  const res = await fetch(`${SKYDROP_BASE}/api/v1/oauth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })
  if (!res.ok) throw new Error('Error al obtener token de SkyDrop')
  const data = await res.json()
  return data.access_token
}

async function lookupZip(zip) {
  const res = await fetch(`https://mexico-api.devaleff.com/api/codigo-postal/${zip}`)
  if (!res.ok) return null
  const body = await res.json()
  const data = body?.data
  if (!data || data.length === 0) return null
  return {
    state: data[0].d_estado,
    city: data[0].D_mnpio,
    neighborhood: data[0].d_asenta,
  }
}

async function crearCotizacion(token, zipTo) {
  const destino = await lookupZip(zipTo) || { state: 'N/A', city: 'N/A', neighborhood: 'Centro' }
  const res = await fetch(`${SKYDROP_BASE}/api/v1/quotations`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      quotation: {
        zip_from: ORIGEN.zip,
        zip_to: zipTo,
        parcel: { weight: 0.5, height: 5, width: 20, length: 25 },
        address_from: {
          country_code: ORIGEN.country,
          postal_code: ORIGEN.zip,
          area_level1: ORIGEN.state,
          area_level2: ORIGEN.city,
          area_level3: ORIGEN.neighborhood,
        },
        address_to: {
          country_code: 'MX',
          postal_code: zipTo,
          area_level1: destino.state,
          area_level2: destino.city,
          area_level3: destino.neighborhood,
        },
      },
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || 'Error al crear cotización en SkyDrop')
  }
  return res.json()
}

async function esperarCotizacion(token, cotizacionId, timeoutMs = 6000) {
  const inicio = Date.now()
  while (Date.now() - inicio < timeoutMs) {
    const res = await fetch(`${SKYDROP_BASE}/api/v1/quotations/${cotizacionId}`, {
      headers: { authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error('Error al consultar cotización')
    const data = await res.json()
    if (data.is_completed) return data
    await new Promise(r => setTimeout(r, 800))
  }
  throw new Error('Tiempo de espera agotado para cotización')
}

function tarifaMasBarata(cotizacion) {
  const rates = cotizacion.rates || []
  const disponibles = rates.filter(r => r.success === true && r.total != null && parseFloat(r.total) > 0)
  if (disponibles.length === 0) return null
  disponibles.sort((a, b) => parseFloat(a.total) - parseFloat(b.total))
  return disponibles[0]
}

async function calcularEnvio(token, zipTo) {
  const cotizacion = await crearCotizacion(token, zipTo)
  const completa = await esperarCotizacion(token, cotizacion.id)
  const tarifa = tarifaMasBarata(completa)
  if (!tarifa) return null
  return {
    monto: Math.round(parseFloat(tarifa.total)),
    proveedor: tarifa.provider_display_name || tarifa.provider_name,
    servicio: tarifa.provider_service_name || '',
  }
}

export async function onRequest(context) {
  const { request, env } = context

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'content-type': 'application/json' },
    })
  }

  if (!env.STRIPE_SECRET_KEY) {
    return new Response(JSON.stringify({ error: 'Stripe no configurado' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }

  try {
    const { email, items, zip_to } = await request.json()

    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ error: 'Carrito vacío' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      })
    }

    if (!zip_to || !/^\d{5}$/.test(zip_to)) {
      return new Response(JSON.stringify({ error: 'Código postal inválido' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      })
    }

    const promoActiva = isPromoActiva()
    const aplicarDesc = promoActiva

    for (const item of items) {
      const key = item.nombre.toLowerCase().trim()
      const precioReal = PRECIOS[key]
      if (precioReal === undefined) {
        return new Response(JSON.stringify({ error: `Producto desconocido: ${item.nombre}` }), {
          status: 400,
          headers: { 'content-type': 'application/json' },
        })
      }
      const precioEsperado = aplicarDesc ? Math.round(precioReal * 0.8) : precioReal
      if (Math.round(item.precio) !== precioEsperado) {
        return new Response(JSON.stringify({ error: `Precio inválido para: ${item.nombre}` }), {
          status: 400,
          headers: { 'content-type': 'application/json' },
        })
      }
    }

    let envio = null
    try {
      const token = await getSkydropToken(env)
      envio = await calcularEnvio(token, zip_to)
    } catch (e) {
      console.error('SkyDrop error:', e.message)
    }

    const origin = new URL(request.url).origin
    const params = new URLSearchParams()
    params.set('mode', 'payment')
    params.set('success_url', `${origin}/gracias?exito=1&session_id={CHECKOUT_SESSION_ID}`)
    params.set('cancel_url', `${origin}/tienda?cancelado=1`)
    params.set('shipping_address_collection[allowed_countries][0]', 'MX')
    params.set('custom_text[submit][message]', '🎁 Incluye un llavero totalmente 𝐆𝐑𝐀𝐓𝐈𝐒 🎁')
    if (email) {
      params.set('customer_email', email)
      params.set('metadata[email]', email)
    }
    const cartSummary = items.map(i => ({ n: i.nombre, p: i.precio, c: i.cantidad, col: i.color || '', img: i.imagen || '' }))
    params.set('metadata[cart]', JSON.stringify(cartSummary))

    let itemIndex = 0
    items.forEach((item) => {
      const prefix = `line_items[${itemIndex}]`
      params.set(`${prefix}[price_data][currency]`, 'mxn')
      params.set(`${prefix}[price_data][product_data][name]`, item.nombre)
      const descConPromo = item.descripcion || ''
      params.set(`${prefix}[price_data][product_data][description]`, descConPromo)
      if (item.imagen) {
        const imgAbs = item.imagen.startsWith('http') ? item.imagen : `${origin}${item.imagen}`
        params.set(`${prefix}[price_data][product_data][images][0]`, imgAbs)
      }
      params.set(`${prefix}[price_data][unit_amount]`, String(Math.round(item.precio * 100)))
      params.set(`${prefix}[quantity]`, String(item.cantidad || 1))
      itemIndex++
    })

    if (envio) {
      const prefix = `line_items[${itemIndex}]`
      params.set(`${prefix}[price_data][currency]`, 'mxn')
      params.set(`${prefix}[price_data][product_data][name]`, `Envío (${envio.proveedor}${envio.servicio ? ' — ' + envio.servicio : ''})`)
      params.set(`${prefix}[price_data][product_data][description]`, `Costo de envío a CP ${zip_to}`)
      params.set(`${prefix}[price_data][unit_amount]`, String(envio.monto * 100))
      params.set(`${prefix}[quantity]`, '1')
    }

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    const data = await stripeRes.json()

    if (!stripeRes.ok) {
      throw new Error(data.error?.message || 'Error de Stripe')
    }

    return new Response(JSON.stringify({ url: data.url }), {
      headers: { 'content-type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }
}