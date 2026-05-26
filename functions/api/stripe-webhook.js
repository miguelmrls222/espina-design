const ORIGEN = {
  name: 'Espina Design',
  company: 'Espina Design',
  email: 'hola@espinadesign.com',
  phone: '5216621234567',
  street1: 'República de Jamaica #51',
  street_number: '51',
  postal_code: '83170',
  area_level1: 'Sonora',
  area_level2: 'Hermosillo',
  area_level3: 'Adolfo López Mateos',
  country_code: 'MX',
  reference: 'Entre Jesus Siqueiros y Luis Orcí',
}

const SKYDROP_BASE = 'https://pro.skydropx.com'

async function getSkydropToken(env) {
  const clientId = env.SKYDROP_CLIENT_ID
  const clientSecret = env.SKYDROP_CLIENT_SECRET
  const res = await fetch(`${SKYDROP_BASE}/api/v1/oauth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })
  const data = await res.json()
  return data.access_token
}

async function lookupZip(zip) {
  try {
    const res = await fetch(`https://mexico-api.devaleff.com/api/codigo-postal/${zip}`)
    if (!res.ok) return null
    const body = await res.json()
    const data = body?.data
    if (!data || data.length === 0) return null
    return {
      area_level1: data[0].d_estado,
      area_level2: data[0].D_mnpio,
      area_level3: data[0].d_asenta,
    }
  } catch { return null }
}

async function crearDireccion(token, dir) {
  const res = await fetch(`${SKYDROP_BASE}/api/v1/address_templates`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      address_template: {
        alias_name: dir.alias_name,
        address_type: dir.address_type,
        address_attributes: {
          name: dir.name,
          company: dir.company || '',
          phone: dir.phone,
          email: dir.email,
          street1: dir.street1,
          street_number: dir.street_number || '',
          apartment_number: dir.apartment_number || '',
          postal_code: dir.postal_code,
          area_level1: dir.area_level1,
          area_level2: dir.area_level2,
          area_level3: dir.area_level3,
          country_code: dir.country_code,
          reference: dir.reference || '',
        },
      },
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(JSON.stringify(err))
  }
  const data = await res.json()
  return data.data.id
}

async function crearEnvio(token, rateId, addressFromId, addressToId, reference) {
  const res = await fetch(`${SKYDROP_BASE}/api/v1/shipments`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      shipment: {
        address_from_id: addressFromId,
        address_to_id: addressToId,
        parcel: { weight: 0.5, height: 5, width: 20, length: 25 },
        rate_id: rateId,
        reference: reference || '',
      },
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(JSON.stringify(err))
  }
  return res.json()
}

function extraerNumero(street) {
  const match = street.match(/#\s*(\d+)/)
  return match ? match[1] : ''
}

async function verifyStripeSignature(payload, sigHeader, secret) {
  try {
    const pairs = sigHeader.split(',').map(p => p.trim().split('='))
    const timestamp = pairs.find(p => p[0] === 't')?.[1]
    const signature = pairs.find(p => p[0] === 'v1')?.[1]
    if (!timestamp || !signature) return false
    const signedPayload = `${timestamp}.${payload}`
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false, ['sign']
    )
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload))
    const expected = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
    if (expected.length !== signature.length) return false
    let diff = 0
    for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i)
    return diff === 0
  } catch { return false }
}

export async function onRequest(context) {
  const { request, env } = context

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const webhookSecret = env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return new Response('STRIPE_WEBHOOK_SECRET no configurado', { status: 500 })
  }

  try {
    const rawBody = await request.text()
    const signature = request.headers.get('Stripe-Signature')

    if (!signature) {
      return new Response('No signature', { status: 400 })
    }

    const verified = await verifyStripeSignature(rawBody, signature, webhookSecret)
    if (!verified) {
      return new Response('Invalid signature', { status: 400 })
    }

    const event = JSON.parse(rawBody)

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const meta = session.metadata || {}
      const rateId = meta.rate_id
      const zipTo = meta.zip_to
      const shipping = session.shipping_details
      const email = session.customer_details?.email || meta.email || ''

      if (!rateId || !shipping) {
        console.error('Webhook: faltan rate_id o direccion de envio')
        return new Response(JSON.stringify({ received: true }), {
          headers: { 'content-type': 'application/json' },
        })
      }

      const address = shipping.address || {}
      const zipDestino = zipTo || address.postal_code || ''

      const destinoZip = await lookupZip(zipDestino)

      const token = await getSkydropToken(env)

      const originId = await crearDireccion(token, {
        ...ORIGEN,
        alias_name: 'Taller Espina Design',
        address_type: 'from',
      })

      const destId = await crearDireccion(token, {
        alias_name: `Cliente: ${shipping.name}`,
        address_type: 'to',
        name: shipping.name || 'Cliente',
        company: '',
        phone: '5210000000000',
        email: email,
        street1: address.line1 || '',
        street_number: extraerNumero(address.line1 || ''),
        apartment_number: address.line2 || '',
        postal_code: zipDestino,
        area_level1: destinoZip?.area_level1 || address.state || '',
        area_level2: destinoZip?.area_level2 || address.city || '',
        area_level3: destinoZip?.area_level3 || 'Centro',
        country_code: address.country || 'MX',
        reference: '',
      })

      const envioCreado = await crearEnvio(token, rateId, originId, destId, `Pedido ${session.id}`)

      const trackingNumber = envioCreado?.data?.attributes?.tracking_number || ''
      console.log('Envío creado:', trackingNumber, 'para sesión:', session.id)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'content-type': 'application/json' },
    })
  } catch (err) {
    console.error('Webhook error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }
}