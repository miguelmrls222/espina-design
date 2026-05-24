export async function onRequest(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const sessionId = url.searchParams.get('session_id')
  const formatJson = url.searchParams.has('json')

  if (!sessionId) {
    return Response.redirect('https://espinadesign.com/tienda', 302)
  }

  // Modo JSON: devuelve el carrito guardado en KV
  if (formatJson) {
    const saved = env.ABANDONED_CARTS
      ? await env.ABANDONED_CARTS.get(`cart:${sessionId}`)
      : null
    if (saved) {
      return new Response(saved, {
        headers: { 'content-type': 'application/json' },
      })
    }
    return new Response('null', {
      headers: { 'content-type': 'application/json' },
    })
  }

  if (!env.STRIPE_SECRET_KEY) {
    return Response.redirect('https://espinadesign.com/tienda', 302)
  }

  try {
    const stripeRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
      headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
    })

    if (!stripeRes.ok) {
      return Response.redirect('https://espinadesign.com/tienda', 302)
    }

    const session = await stripeRes.json()
    const cartRaw = session.metadata?.cart

    if (!cartRaw) {
      return Response.redirect('https://espinadesign.com/tienda', 302)
    }

    const items = JSON.parse(cartRaw)
    const cartData = items.map(i => ({
      nombre: i.n,
      precio: i.p,
      cantidad: i.c || 1,
      imagen: '',
      descripcion: '',
      color: i.col || '',
    }))

    // Guardar en KV para que la app lo tome al cargar
    if (env.ABANDONED_CARTS) {
      await env.ABANDONED_CARTS.put(`cart:${sessionId}`, JSON.stringify(cartData), {
        expirationTtl: 86400,
      })
    }

    // Redirigir a la tienda con el session_id para que main.js lo procese
    return Response.redirect(`https://espinadesign.com/tienda?recuperar=${sessionId}`, 302)
  } catch {
    return Response.redirect('https://espinadesign.com/tienda', 302)
  }
}
