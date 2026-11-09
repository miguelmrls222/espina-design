export async function onRequest(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const sessionId = url.searchParams.get('session_id')
  const formatJson = url.searchParams.has('json')

  if (!sessionId) {
    return Response.redirect('https://espinadesign.com/tienda', 302)
  }

  if (formatJson) {
    if (!env.STRIPE_SECRET_KEY) {
      return new Response('null', { headers: { 'content-type': 'application/json' } })
    }
    try {
      const stripeRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
      })
      if (!stripeRes.ok) return new Response('null', { headers: { 'content-type': 'application/json' } })
      const session = await stripeRes.json()
      const cartRaw = session.metadata?.cart
      if (!cartRaw) return new Response('null', { headers: { 'content-type': 'application/json' } })
      const items = JSON.parse(cartRaw)
      const cartData = items.map(i => ({
        nombre: i.n, precio: i.p, cantidad: i.c || 1,
        imagen: i.img || '', descripcion: '', color: i.col || '',
      }))
      return new Response(JSON.stringify(cartData), { headers: { 'content-type': 'application/json' } })
    } catch {
      return new Response('null', { headers: { 'content-type': 'application/json' } })
    }
  }

  try {
    const stripeRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
      headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
    })
    if (!stripeRes.ok) return Response.redirect('https://espinadesign.com/tienda', 302)

    const session = await stripeRes.json()
    const cartRaw = session.metadata?.cart
    if (!cartRaw) return Response.redirect('https://espinadesign.com/tienda', 302)

    const items = JSON.parse(cartRaw)
    const cartData = items.map(i => ({
      nombre: i.n, precio: i.p, cantidad: i.c || 1,
      imagen: i.img || '', descripcion: '', color: i.col || '',
    }))

    const cartJson = JSON.stringify(cartData)
    const encoded = encodeURIComponent(cartJson)

    // Usar meta refresh + cookie como fallback
    const html = `<!doctype html>
<html><head><meta charset="UTF-8">
<meta http-equiv="refresh" content="0;url=/tienda?carrito=${encoded}">
<title>Redirigiendo…</title></head><body></body></html>`

    return new Response(html, {
      status: 200,
      headers: {
        'content-type': 'text/html;charset=utf-8',
        'cache-control': 'no-store, no-cache, must-revalidate',
        'set-cookie': `espina_recovery=${encoded}; path=/; max-age=300; SameSite=Lax; HttpOnly`,
      },
    })
  } catch {
    return Response.redirect('https://espinadesign.com/tienda', 302)
  }
}
