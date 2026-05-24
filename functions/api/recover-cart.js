export async function onRequest(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const sessionId = url.searchParams.get('session_id')

  if (!sessionId) {
    return Response.redirect('https://espinadesign.com/tienda', 302)
  }

  if (!env.STRIPE_SECRET_KEY) {
    return new Response('Stripe no configurado', { status: 500 })
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
    const cartJs = JSON.stringify(items.map(i => ({
      nombre: i.n,
      precio: i.p,
      cantidad: i.c || 1,
      imagen: '',
      descripcion: '',
      color: i.col || '',
    })))

    const html = `<!doctype html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Recuperar carrito — Espina Design</title>
<style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f5f5f5;text-align:center;padding:20px}.card{background:#fff;padding:40px;max-width:400px;width:100%}.card h1{font-size:18px;text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px}.card p{font-size:14px;color:#666;margin-bottom:20px;line-height:1.5}.spinner{width:24px;height:24px;border:2px solid #ddd;border-top-color:#000;border-radius:50%;animation:spin .8s linear infinite;margin:0 auto}@keyframes spin{to{transform:rotate(360deg)}}</style>
</head>
<body>
<div class="card">
<h1>Recuperando tu carrito</h1>
<p>Estamos preparando tus productos para ti…</p>
<div class="spinner"></div>
</div>
<script>
try {
  localStorage.setItem('espina-cart', ${cartJs})
  setTimeout(function(){ window.location.href = '/tienda' }, 800)
} catch(e){ window.location.href = '/tienda' }
<\/script>
</body>
</html>`

    return new Response(html, {
      headers: { 'content-type': 'text/html;charset=utf-8' },
    })
  } catch {
    return Response.redirect('https://espinadesign.com/tienda', 302)
  }
}
