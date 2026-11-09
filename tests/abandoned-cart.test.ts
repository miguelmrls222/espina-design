import { afterEach, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
// @ts-expect-error módulo JavaScript del Worker
import worker from '../workers/abandoned-cart-worker.js'

interface Llamada { url: string; cuerpo: any }

const ahoraReal = Date.now
const fetchReal = globalThis.fetch
let llamadas: Llamada[] = []
let respuestasWhatsApp: number[] = []
let sesiones: any[] = []
let kv: Map<string, string>

const MEDIODIA_HERMOSILLO = Date.UTC(2026, 10, 9, 19, 0, 0)

function sesion(extra: Record<string, unknown> = {}, minutos = 75) {
  return {
    id: 'cs_1',
    status: 'open',
    created: Math.floor(MEDIODIA_HERMOSILLO / 1000) - minutos * 60,
    customer_email: 'cliente@correo.com',
    metadata: { telefono: '6621234567', cart: JSON.stringify([{ n: 'Tarjetero Cactus', p: 540, c: 1, col: 'verde' }]) },
    ...extra,
  }
}

function crearEntorno(extra: Record<string, unknown> = {}) {
  return {
    STRIPE_SECRET_KEY: 'sk',
    BREVO_API_KEY: 'brevo',
    WHATSAPP_TOKEN: 'wa',
    WHATSAPP_PHONE_NUMBER_ID: '123',
    ABANDONED_CARTS: {
      get: async (k: string) => kv.get(k) ?? null,
      put: async (k: string, v: string) => { kv.set(k, v) },
    },
    ...extra,
  }
}

async function ejecutar(env: unknown) {
  const pendientes: Promise<unknown>[] = []
  await worker.scheduled({}, env, { waitUntil: (p: Promise<unknown>) => pendientes.push(p) })
  await Promise.all(pendientes)
}

beforeEach(() => {
  llamadas = []
  respuestasWhatsApp = []
  sesiones = []
  kv = new Map()
  Date.now = () => MEDIODIA_HERMOSILLO
  globalThis.fetch = (async (entrada: string, init?: RequestInit) => {
    const url = String(entrada)
    if (url.includes('api.stripe.com')) return Response.json({ data: sesiones, has_more: false })
    const cuerpo = init?.body ? JSON.parse(String(init.body)) : null
    llamadas.push({ url, cuerpo })
    if (url.includes('graph.facebook.com')) return new Response('{}', { status: respuestasWhatsApp.shift() ?? 200 })
    return new Response('{}', { status: 201 })
  }) as typeof fetch
})

afterEach(() => {
  Date.now = ahoraReal
  globalThis.fetch = fetchReal
})

const whatsapp = () => llamadas.filter(l => l.url.includes('graph.facebook.com'))
const correos = () => llamadas.filter(l => l.url.includes('brevo'))

test('envía WhatsApp con plantilla, resumen y enlace de recuperación a carritos de más de 60 minutos', async () => {
  sesiones = [sesion()]
  await ejecutar(crearEntorno())
  assert.equal(whatsapp().length, 1)
  const { url, cuerpo } = whatsapp()[0]
  assert.match(url, /\/123\/messages$/)
  assert.equal(cuerpo.to, '526621234567')
  assert.equal(cuerpo.template.name, 'carrito_abandonado')
  assert.equal(cuerpo.template.components[0].parameters[0].text, 'Tarjetero Cactus (verde) x1')
  assert.equal(cuerpo.template.components[1].parameters[0].text, 'cs_1')
  assert.equal(JSON.parse(kv.get('wa:cs_1')!).estado, 'enviado')
})

test('no envía si pasaron menos de 60 minutos, si el pedido no está abierto o falta el carrito', async () => {
  sesiones = [sesion({}, 59), sesion({ id: 'cs_2', status: 'complete' }), sesion({ id: 'cs_3', metadata: { telefono: '6621234567' } })]
  await ejecutar(crearEntorno())
  assert.equal(whatsapp().length, 0)
})

test('no duplica el envío en ejecuciones posteriores del cron', async () => {
  sesiones = [sesion()]
  const env = crearEntorno()
  await ejecutar(env)
  await ejecutar(env)
  assert.equal(whatsapp().length, 1)
})

test('reintenta una vez dentro de la ejecución ante error temporal de WhatsApp', async () => {
  sesiones = [sesion()]
  respuestasWhatsApp = [503, 200]
  await ejecutar(crearEntorno())
  assert.equal(whatsapp().length, 2)
  assert.equal(JSON.parse(kv.get('wa:cs_1')!).estado, 'enviado')
})

test('conserva el carrito para reintentar en el siguiente cron y se rinde tras 3 intentos', async () => {
  sesiones = [sesion()]
  respuestasWhatsApp = [500, 500, 500, 500, 500, 500, 500, 500]
  const env = crearEntorno()
  await ejecutar(env)
  assert.equal(JSON.parse(kv.get('wa:cs_1')!).estado, 'reintentar')
  await ejecutar(env)
  await ejecutar(env)
  assert.equal(JSON.parse(kv.get('wa:cs_1')!).estado, 'fallido')
  const antes = whatsapp().length
  await ejecutar(env)
  assert.equal(whatsapp().length, antes)
})

test('no reintenta cuando WhatsApp rechaza la solicitud (4xx)', async () => {
  sesiones = [sesion()]
  respuestasWhatsApp = [400]
  await ejecutar(crearEntorno())
  assert.equal(whatsapp().length, 1)
  assert.equal(JSON.parse(kv.get('wa:cs_1')!).estado, 'fallido')
})

test('omite a quien ya completó otra compra con el mismo teléfono o correo', async () => {
  sesiones = [sesion(), sesion({ id: 'cs_pagada', status: 'complete', customer_email: 'otro@correo.com' })]
  await ejecutar(crearEntorno())
  assert.equal(whatsapp().length, 0)
  assert.equal(correos().length, 0)
})

test('no envía WhatsApp de madrugada en Hermosillo y lo deja para el siguiente cron', async () => {
  Date.now = () => Date.UTC(2026, 10, 9, 8, 0, 0)
  sesiones = [sesion({ created: Math.floor(Date.UTC(2026, 10, 9, 6, 0, 0) / 1000) })]
  await ejecutar(crearEntorno())
  assert.equal(whatsapp().length, 0)
})

test('normaliza teléfonos mexicanos y descarta los inválidos', async () => {
  sesiones = [
    sesion({ id: 'a', metadata: { telefono: '+52 1 662 123 4567', cart: sesion().metadata.cart } }),
    sesion({ id: 'b', metadata: { telefono: '12345', cart: sesion().metadata.cart } }),
  ]
  await ejecutar(crearEntorno())
  assert.deepEqual(whatsapp().map(l => l.cuerpo.to), ['526621234567'])
})

test('sin credenciales de WhatsApp sigue enviando solo el correo', async () => {
  sesiones = [sesion()]
  await ejecutar(crearEntorno({ WHATSAPP_TOKEN: undefined }))
  assert.equal(whatsapp().length, 0)
  assert.equal(correos().length, 1)
})
