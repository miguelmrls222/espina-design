export async function onRequest(context) {
  const { env } = context
  const brevoKey = env.BREVO_API_KEY
  const stripeKey = env.STRIPE_SECRET_KEY

  if (!brevoKey) {
    return new Response('BREVO_API_KEY no configurada', { status: 500 })
  }

  // Probar Brevo enviando un email
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'api-key': brevoKey,
    },
    body: JSON.stringify({
      sender: { name: 'Espina Design', email: 'miguelmrls222@gmail.com' },
      to: [{ email: 'miguelmrls222@gmail.com' }],
      subject: '✅ Sistema de carritos abandonados activo',
      htmlContent: `
<!doctype html>
<html>
<body style="font-family:Helvetica,Arial,sans-serif;background:#f5f5f5;padding:20px">
<table style="max-width:520px;margin:0 auto;background:#fff;padding:32px">
<tr><td style="text-align:center;padding-bottom:16px">
<h1 style="font-size:16px;text-transform:uppercase;letter-spacing:.12em">Espina Design</h1>
</td></tr>
<tr><td>
<h2 style="font-size:15px;margin:0 0 10px">✅ Prueba exitosa</h2>
<p style="font-size:13px;color:#555;line-height:1.5;margin:0 0 12px">El sistema de carritos abandonados está funcionando correctamente. Los clientes que dejen su carrito sin pagar recibirán un recordatorio como este.</p>
<p style="font-size:13px;color:#555;line-height:1.5;margin:0">Gracias,<br>Espina Design</p>
</td></tr>
</table>
</body>
</html>`,
    }),
  })

  const data = await res.json()

  return new Response(JSON.stringify({
    status: res.status,
    ok: res.ok,
    brevo: data,
    stripe_key_present: !!stripeKey,
  }, null, 2), {
    headers: { 'content-type': 'application/json' },
  })
}
