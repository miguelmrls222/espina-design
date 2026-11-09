import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { onRequest } from '../functions/api/stripe-webhook'
import { verificarFirma } from '../functions/_lib/stripe'
import { contexto, firmarStripe, instalarFetch, type Llamada } from './helpers'

const SECRETO = 'whsec_prueba'
const ENV = { STRIPE_SECRET_KEY: 'sk_test_x', STRIPE_WEBHOOK_SECRET: SECRETO, SKYDROP_CLIENT_ID: 'id', SKYDROP_CLIENT_SECRET: 's' }
const ID_SESION = 'cs_test_abcdefghij123'
const URL_WEBHOOK = 'https://espinadesign.com/api/stripe-webhook'

const evento = JSON.stringify({ id: 'evt_1', type: 'checkout.session.completed', data: { object: { id: ID_SESION } } })

function sesion(metadata: Record<string, string>, extra: Record<string, unknown> = {}) {
  return {
    id: ID_SESION,
    payment_status: 'paid',
    metadata: { rate_id: 'r1', zip_to: '83170', telefono: '6624142998', email: 'ana@correo.com', ...metadata },
    customer_details: { email: 'ana@correo.com' },
    shipping_details: { name: 'Ana Pérez', address: { line1: 'Calle Sol #123', line2: '', city: 'Hermosillo', state: 'Sonora', postal_code: '83170', country: 'MX' } },
    ...extra,
  }
}

function rutas(estadoSesion: unknown) {
  return [
    (l: Llamada) => (l.url.endsWith(`/checkout/sessions/${ID_SESION}`) && l.method === 'GET' ? { body: estadoSesion } : undefined),
    (l: Llamada) => (l.url.endsWith(`/checkout/sessions/${ID_SESION}`) && l.method === 'POST' ? { body: { id: ID_SESION } } : undefined),
    (l: Llamada) => (l.url.endsWith('/oauth/token') ? { body: { access_token: 'tok' } } : undefined),
    (l: Llamada) => (l.url.includes('codigo-postal') ? { body: { data: [{ d_estado: 'Sonora', D_mnpio: 'Hermosillo', d_asenta: 'Centro' }] } } : undefined),
    (l: Llamada) => (l.url.endsWith('/address_templates') ? { body: { data: { id: `dir-${Math.random()}` } } } : undefined),
    (l: Llamada) => (l.url.endsWith('/shipments') ? { body: { data: { id: 'env-1', attributes: { tracking_number: 'TRK123' } } } } : undefined),
  ]
}

async function enviar(payload: string, firma?: string): Promise<Response> {
  const headers: Record<string, string> = {}
  if (firma !== undefined) headers['stripe-signature'] = firma
  return onRequest(contexto(new Request(URL_WEBHOOK, { method: 'POST', headers, body: payload }), ENV))
}

let restaurar = () => {}
afterEach(() => restaurar())

test('verificarFirma: válida, alterada, vieja y sin v1', async () => {
  const ahora = Date.now()
  const marca = Math.floor(ahora / 1000)
  const buena = await firmarStripe('{"a":1}', SECRETO, marca)
  assert.equal(await verificarFirma('{"a":1}', buena, SECRETO, ahora), true)
  assert.equal(await verificarFirma('{"a":2}', buena, SECRETO, ahora), false)
  assert.equal(await verificarFirma('{"a":1}', buena, 'otro', ahora), false)
  assert.equal(await verificarFirma('{"a":1}', buena, SECRETO, ahora + 6 * 60_000), false)
  assert.equal(await verificarFirma('{"a":1}', `t=${marca}`, SECRETO, ahora), false)
  assert.equal(await verificarFirma('{"a":1}', 'basura', SECRETO, ahora), false)
})

test('rechaza peticiones sin firma, con firma inválida o vencida', async () => {
  const mock = instalarFetch(rutas(sesion({})))
  restaurar = mock.restaurar
  assert.equal((await enviar(evento)).status, 400)
  assert.equal((await enviar(evento, 't=1,v1=abc')).status, 400)
  const vieja = await firmarStripe(evento, SECRETO, Math.floor(Date.now() / 1000) - 3600)
  assert.equal((await enviar(evento, vieja)).status, 400)
  assert.equal(mock.llamadas.length, 0)
})

test('rechaza eventos firmados pero con formato inválido', async () => {
  const mock = instalarFetch(rutas(sesion({})))
  restaurar = mock.restaurar
  const malo = JSON.stringify({ id: 'x', type: 5 })
  assert.equal((await enviar(malo, await firmarStripe(malo, SECRETO))).status, 400)
  const noJson = 'no es json'
  assert.equal((await enviar(noJson, await firmarStripe(noJson, SECRETO))).status, 400)
})

test('ignora tipos de evento que no atiende', async () => {
  const mock = instalarFetch(rutas(sesion({})))
  restaurar = mock.restaurar
  const otro = JSON.stringify({ id: 'evt_2', type: 'charge.refunded', data: { object: { id: 'ch_1' } } })
  const respuesta = await enviar(otro, await firmarStripe(otro, SECRETO))
  assert.equal(respuesta.status, 200)
  assert.equal(mock.llamadas.length, 0)
})

test('crea la guía una vez y marca la sesión; el reintento no duplica', async () => {
  let mock = instalarFetch(rutas(sesion({})))
  restaurar = mock.restaurar
  const primera = await enviar(evento, await firmarStripe(evento, SECRETO))
  assert.equal(primera.status, 200)
  assert.equal((await primera.json() as { guia: string }).guia, 'TRK123')
  assert.equal(mock.llamadas.filter(l => l.url.endsWith('/shipments')).length, 1)
  const marcas = mock.llamadas.filter(l => l.url.endsWith(`/checkout/sessions/${ID_SESION}`) && l.method === 'POST').map(l => new URLSearchParams(l.body))
  assert.ok(marcas[0].get('metadata[envio_estado]')?.startsWith('procesando:'))
  assert.equal(marcas[1].get('metadata[envio_estado]'), 'creado')
  assert.equal(marcas[1].get('metadata[envio_guia]'), 'TRK123')
  const destino = JSON.parse(mock.llamadas.filter(l => l.url.endsWith('/address_templates'))[1].body).address_template.address_attributes
  assert.equal(destino.street_number, '123')
  assert.equal(destino.phone, '6624142998')
  mock.restaurar()

  mock = instalarFetch(rutas(sesion({ envio_estado: 'creado' })))
  restaurar = mock.restaurar
  const segunda = await enviar(evento, await firmarStripe(evento, SECRETO))
  assert.equal(segunda.status, 200)
  assert.equal((await segunda.json() as { duplicado: boolean }).duplicado, true)
  assert.equal(mock.llamadas.some(l => l.url.endsWith('/shipments')), false)
})

test('si otra entrega está procesando responde 409; si el bloqueo venció, reintenta', async () => {
  let mock = instalarFetch(rutas(sesion({ envio_estado: `procesando:${Date.now()}` })))
  restaurar = mock.restaurar
  assert.equal((await enviar(evento, await firmarStripe(evento, SECRETO))).status, 409)
  assert.equal(mock.llamadas.some(l => l.url.endsWith('/shipments')), false)
  mock.restaurar()

  mock = instalarFetch(rutas(sesion({ envio_estado: `procesando:${Date.now() - 11 * 60_000}` })))
  restaurar = mock.restaurar
  assert.equal((await enviar(evento, await firmarStripe(evento, SECRETO))).status, 200)
  assert.equal(mock.llamadas.filter(l => l.url.endsWith('/shipments')).length, 1)
})

test('si SkyDropx falla responde 5xx (Stripe reintenta) y deja el estado en error', async () => {
  const mock = instalarFetch([
    (l) => (l.url.endsWith('/shipments') ? { status: 422, body: { message: 'tarifa vencida' } } : undefined),
    ...rutas(sesion({})),
  ])
  restaurar = mock.restaurar
  const respuesta = await enviar(evento, await firmarStripe(evento, SECRETO))
  assert.equal(respuesta.status, 502)
  const ultima = mock.llamadas.filter(l => l.url.endsWith(`/checkout/sessions/${ID_SESION}`) && l.method === 'POST').at(-1)
  assert.ok(new URLSearchParams(ultima?.body).get('metadata[envio_estado]')?.startsWith('error:'))
})

test('no crea guía si no está pagada o si falta rate_id o dirección', async () => {
  for (const estado of [
    sesion({}, { payment_status: 'unpaid' }),
    sesion({ rate_id: '' }),
    sesion({}, { shipping_details: null }),
  ]) {
    const mock = instalarFetch(rutas(estado))
    restaurar = mock.restaurar
    const respuesta = await enviar(evento, await firmarStripe(evento, SECRETO))
    assert.equal(respuesta.status, 200)
    assert.equal(mock.llamadas.some(l => l.url.endsWith('/shipments')), false)
    mock.restaurar()
  }
})

test('acepta la dirección en collected_information (API nueva de Stripe)', async () => {
  const nueva = sesion({}, { shipping_details: undefined, collected_information: { shipping_details: sesion({}).shipping_details } })
  const mock = instalarFetch(rutas(nueva))
  restaurar = mock.restaurar
  assert.equal((await enviar(evento, await firmarStripe(evento, SECRETO))).status, 200)
  assert.equal(mock.llamadas.filter(l => l.url.endsWith('/shipments')).length, 1)
})
