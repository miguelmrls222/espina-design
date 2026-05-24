export async function onRequest(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const sessionId = url.searchParams.get('session_id')
  const formatJson = url.searchParams.has('json')

  if (!sessionId) {
    return Response.redirect('https://espinadesign.com/tienda', 302)
  }

  // Modo JSON: devuelve el carrito desde Stripe (para que main.js lo procese)
  if (formatJson) {
    if (!env.STRIPE_SECRET_KEY) {
      return new Response('null', {
        headers: { 'content-type': 'application/json' },
      })
    }
    try {
      const stripeRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
      })
      if (!stripeRes.ok) {
        return new Response('null', {
          headers: { 'content-type': 'application/json' },
        })
      }
      const session = await stripeRes.json()
      const cartRaw = session.metadata?.cart
      if (!cartRaw) {
        return new Response('null', {
          headers: { 'content-type': 'application/json' },
        })
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
      return new Response(JSON.stringify(cartData), {
        headers: { 'content-type': 'application/json' },
      })
    } catch {
      return new Response('null', {
        headers: { 'content-type': 'application/json' },
      })
    }
  }

  // Modo normal: redirigir a la página de recuperación del SPA
  return Response.redirect(`https://espinadesign.com/recuperar?session_id=${sessionId}`, 302)
}
