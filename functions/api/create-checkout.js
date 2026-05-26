const PRECIOS = {
  'tarjetero cardón': 589,
  'tarjetero cactus': 489,
  'tarjetero agave': 589,
  'billetera sahuaro': 789,
}

const PROMO_EXPIRES = new Date(Date.UTC(2026, 4, 31, 23, 59, 59))

function isPromoActiva() {
  return Date.now() < PROMO_EXPIRES.getTime()
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
    const { email, items } = await request.json()

    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ error: 'Carrito vacío' }), {
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

    const origin = new URL(request.url).origin
    const params = new URLSearchParams()
    params.set('mode', 'payment')
    params.set('success_url', `${origin}/gracias?exito=1&session_id={CHECKOUT_SESSION_ID}`)
    params.set('cancel_url', `${origin}/tienda?cancelado=1`)
    params.set('shipping_address_collection[allowed_countries][0]', 'MX')
    params.set('custom_text[submit][message]', '🔥 Incluye un llavero totalmente 𝐆𝐑𝐀𝐓𝐈𝐒 🔥')
    if (email) {
      params.set('customer_email', email)
      params.set('metadata[email]', email)
    }
    const cartSummary = items.map(i => ({ n: i.nombre, p: i.precio, c: i.cantidad, col: i.color || '', img: i.imagen || '' }))
    params.set('metadata[cart]', JSON.stringify(cartSummary))

    items.forEach((item, i) => {
      const prefix = `line_items[${i}]`
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
    })

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
