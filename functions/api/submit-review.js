export async function onRequest(context) {
  const { request, env } = context

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'content-type': 'application/json' },
    })
  }

  const brevoKey = env.BREVO_API_KEY
  if (!brevoKey) {
    return new Response(JSON.stringify({ error: 'Email no configurado' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }

  try {
    const { producto, nombre, puntuacion, texto } = await request.json()

    if (!producto || !nombre || !puntuacion || !texto) {
      return new Response(JSON.stringify({ error: 'Todos los campos son obligatorios' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      })
    }

    const estrellas = '★'.repeat(puntuacion) + '☆'.repeat(5 - puntuacion)

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'api-key': brevoKey,
      },
      body: JSON.stringify({
        sender: { name: 'Espina Design', email: 'miguelmrls222@gmail.com' },
        to: [{ email: 'miguelmrls222@gmail.com' }],
        replyTo: { email: 'miguelmrls222@gmail.com' },
        subject: `Nueva reseña — ${producto}`,
        htmlContent: `
<!doctype html>
<html>
<body style="font-family:Helvetica,Arial,sans-serif;background:#f5f5f5;padding:20px;margin:0">
<table style="max-width:520px;margin:0 auto;background:#fff;padding:32px">
<tr><td style="padding-bottom:16px">
<h1 style="font-size:13px;text-transform:uppercase;letter-spacing:.12em;color:#000;margin:0">Nueva reseña de producto</h1>
</td></tr>
<tr><td>
<table style="width:100%;font-size:13px;color:#333;line-height:1.6">
<tr><td style="padding:6px 0;font-weight:bold;color:#000;width:100px">Producto</td><td>${producto}</td></tr>
<tr><td style="padding:6px 0;font-weight:bold;color:#000">Cliente</td><td>${nombre}</td></tr>
<tr><td style="padding:6px 0;font-weight:bold;color:#000">Puntuación</td><td>${estrellas} (${puntuacion}/5)</td></tr>
<tr><td style="padding:6px 0;font-weight:bold;color:#000;vertical-align:top">Comentario</td><td>${texto}</td></tr>
</table>
</td></tr>
<tr><td style="text-align:center;padding-top:24px;font-size:11px;color:#999">
<p style="margin:0">Para publicar esta reseña, agrégala desde el CMS en la colección de Productos.</p>
</td></tr>
</table>
</body>
</html>`,
      }),
    })

    if (!res.ok) {
      const errBody = await res.text()
      throw new Error(errBody)
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'content-type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }
}
