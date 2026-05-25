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
    const { email } = await request.json()

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return new Response(JSON.stringify({ error: 'Correo inválido' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      })
    }

    const res = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'api-key': brevoKey,
      },
      body: JSON.stringify({
        email,
        listIds: [3],
        updateEnabled: true,
      }),
    })

    if (!res.ok && res.status !== 409) {
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
