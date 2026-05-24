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
    const { items } = await request.json()

    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ error: 'Carrito vacío' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      })
    }

    const origin = new URL(request.url).origin
    const params = new URLSearchParams()
    params.set('mode', 'payment')
    params.set('success_url', `${origin}/gracias?exito=1&session_id={CHECKOUT_SESSION_ID}`)
    params.set('cancel_url', `${origin}/tienda?cancelado=1`)
    params.set('shipping_address_collection[allowed_countries][0]', 'MX')
    params.set('custom_text[submit][message]', '🔥 Incluye un llavero totalmente 𝐆𝐑𝐀𝐓𝐈𝐒 🔥')

    items.forEach((item, i) => {
      const prefix = `line_items[${i}]`
      params.set(`${prefix}[price_data][currency]`, 'mxn')
      params.set(`${prefix}[price_data][product_data][name]`, item.nombre)
      const descConPromo = item.descripcion ? `${item.descripcion}\n🔥 Incluye llavero GRATIS 🔥` : '🔥 Incluye un llavero totalmente GRATIS 🔥'
      params.set(`${prefix}[price_data][product_data][description]`, descConPromo)
      if (item.imagen) params.set(`${prefix}[price_data][product_data][images][0]`, item.imagen)
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
