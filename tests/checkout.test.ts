import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { onRequest } from '../functions/api/create-checkout'
import { isPromoActiva, precioUnitario } from '../src/data/pricing'
import { contexto, instalarFetch, peticionJson } from './helpers'

const ENV = { STRIPE_SECRET_KEY: 'sk_test_x', SKYDROP_CLIENT_ID: 'id', SKYDROP_CLIENT_SECRET: 'secreto' }
const URL_CHECKOUT = 'https://espinadesign.com/api/create-checkout'

const skydropOk = [
  (l: { url: string }) => (l.url.endsWith('/oauth/token') ? { body: { access_token: 'tok' } } : undefined),
  (l: { url: string; method: string }) => (l.url.endsWith('/quotations') && l.method === 'POST' ? { body: { id: 'q1' } } : undefined),
  (l: { url: string; method: string }) => (l.url.endsWith('/quotations/q1') ? {
    body: { is_completed: true, rates: [
      { id: 'r-caro', success: true, total: '210.5', provider_name: 'x' },
      { id: 'r-barato', success: true, total: '99.4', provider_display_name: 'Estafeta', provider_service_name: 'Terrestre' },
    ] },
  } : undefined),
  (l: { url: string }) => (l.url.includes('codigo-postal') ? { body: { data: [{ d_estado: 'Sonora', D_mnpio: 'Hermosillo', d_asenta: 'Centro' }] } } : undefined),
]
const stripeOk = (l: { url: string; method: string }) =>
  l.url.endsWith('/checkout/sessions') && l.method === 'POST' ? { body: { id: 'cs_test_1234567890', url: 'https://checkout.stripe.com/c/pay/cs_test' } } : undefined

let restaurar = () => {}
afterEach(() => restaurar())

const base = { email: 'ana@correo.com', telefono: '662 414 2998', zip_to: '83170' }

test('crea la sesión con precios del servidor, envío más barato y metadata válida', async () => {
  const mock = instalarFetch([...skydropOk, stripeOk])
  restaurar = mock.restaurar
  const respuesta = await onRequest(contexto(peticionJson(URL_CHECKOUT, {
    ...base,
    items: [{ slug: 'tarjetero-cactus', color: 'verde', cantidad: 1, precio: 1 }],
  }), ENV))
  assert.equal(respuesta.status, 200)
  assert.equal((await respuesta.json() as { url: string }).url, 'https://checkout.stripe.com/c/pay/cs_test')

  const stripe = mock.llamadas.find(l => l.url.endsWith('/checkout/sessions'))
  assert.ok(stripe)
  const params = new URLSearchParams(stripe?.body)
  assert.equal(params.get('line_items[0][price_data][unit_amount]'), String(precioUnitario(489) * 100))
  assert.equal(params.get('line_items[1][price_data][unit_amount]'), String(99 * 100))
  assert.equal(params.get('metadata[rate_id]'), 'r-barato')
  assert.equal(params.get('metadata[telefono]'), '6624142998')
  assert.deepEqual(JSON.parse(params.get('metadata[cart]') ?? '[]'), [{ n: 'Tarjetero Cactus', p: precioUnitario(489), c: 1, col: 'verde' }])
  for (const [clave, valor] of params) {
    if (clave.startsWith('metadata[')) assert.ok(valor.length <= 500)
  }
})

test('envío gratis cuando el total alcanza el mínimo', async () => {
  const mock = instalarFetch([...skydropOk, stripeOk])
  restaurar = mock.restaurar
  const respuesta = await onRequest(contexto(peticionJson(URL_CHECKOUT, {
    ...base,
    items: [{ slug: 'billetera-sahuaro', color: 'gris', cantidad: 3 }],
  }), ENV))
  assert.equal(respuesta.status, 200)
  const params = new URLSearchParams(mock.llamadas.find(l => l.url.endsWith('/checkout/sessions'))?.body)
  assert.equal(params.get('line_items[1][price_data][unit_amount]'), '0')
})

test('rechaza producto desconocido, color inválido, cantidad y correo inválidos', async () => {
  const casos: Array<[unknown, number, string]> = [
    [{ ...base, items: [{ slug: 'inventado', color: 'verde', cantidad: 1 }] }, 400, 'producto_desconocido'],
    [{ ...base, items: [{ slug: 'tarjetero-cactus', color: 'rosa', cantidad: 1 }] }, 400, 'color_invalido'],
    [{ ...base, items: [{ slug: 'tarjetero-cactus', color: 'verde', cantidad: 11 }] }, 400, 'campo_invalido'],
    [{ ...base, items: [{ slug: 'tarjetero-cactus', color: 'verde', cantidad: 1.5 }] }, 400, 'campo_invalido'],
    [{ ...base, items: [] }, 400, 'carrito_vacio'],
    [{ ...base, email: 'no-es-correo', items: [{ slug: 'tarjetero-cactus', color: 'verde', cantidad: 1 }] }, 400, 'correo_invalido'],
    [{ ...base, zip_to: '8317', items: [{ slug: 'tarjetero-cactus', color: 'verde', cantidad: 1 }] }, 400, 'cp_invalido'],
    [{ ...base, telefono: '123', items: [{ slug: 'tarjetero-cactus', color: 'verde', cantidad: 1 }] }, 400, 'telefono_invalido'],
  ]
  for (const [cuerpo, status, codigo] of casos) {
    const mock = instalarFetch([...skydropOk, stripeOk])
    restaurar = mock.restaurar
    const respuesta = await onRequest(contexto(peticionJson(URL_CHECKOUT, cuerpo), ENV))
    const datos = await respuesta.json() as { ok: boolean; code: string }
    assert.equal(respuesta.status, status, codigo)
    assert.equal(datos.code, codigo)
    assert.equal(mock.llamadas.length, 0, 'no debe llamar a servicios externos')
    mock.restaurar()
  }
})

test('si cambió el estado de la promo responde 409 sin llamar a Stripe', async () => {
  const mock = instalarFetch([...skydropOk, stripeOk])
  restaurar = mock.restaurar
  const respuesta = await onRequest(contexto(peticionJson(URL_CHECKOUT, {
    ...base, promo: !isPromoActiva(), items: [{ slug: 'tarjetero-cactus', color: 'verde', cantidad: 1 }],
  }), ENV))
  assert.equal(respuesta.status, 409)
  assert.equal((await respuesta.json() as { code: string }).code, 'promo_cambio')
  assert.equal(mock.llamadas.length, 0)
})

test('si SkyDropx falla NO crea la sesión de pago (502)', async () => {
  const mock = instalarFetch([(l) => (l.url.includes('skydropx') ? { status: 500, body: { message: 'caído' } } : undefined), stripeOk])
  restaurar = mock.restaurar
  const respuesta = await onRequest(contexto(peticionJson(URL_CHECKOUT, {
    ...base, items: [{ slug: 'tarjetero-cactus', color: 'verde', cantidad: 1 }],
  }), ENV))
  assert.equal(respuesta.status, 502)
  assert.equal((await respuesta.json() as { code: string }).code, 'envio_no_disponible')
  assert.equal(mock.llamadas.some(l => l.url.includes('stripe.com')), false)
})

test('errores de Stripe no filtran el mensaje original', async () => {
  const mock = instalarFetch([...skydropOk, (l) => (l.url.includes('stripe.com') ? { status: 400, body: { error: { code: 'x', message: 'detalle interno' } } } : undefined)])
  restaurar = mock.restaurar
  const respuesta = await onRequest(contexto(peticionJson(URL_CHECKOUT, {
    ...base, items: [{ slug: 'tarjetero-cactus', color: 'verde', cantidad: 1 }],
  }), ENV))
  const texto = await respuesta.text()
  assert.equal(respuesta.status, 502)
  assert.ok(!texto.includes('detalle interno'))
})

test('bloquea orígenes distintos, JSON inválido, payload enorme y método incorrecto', async () => {
  const mock = instalarFetch([])
  restaurar = mock.restaurar
  const origenAjeno = await onRequest(contexto(peticionJson(URL_CHECKOUT, base, { origin: 'https://malo.example' }), ENV))
  assert.equal(origenAjeno.status, 403)
  const roto = await onRequest(contexto(new Request(URL_CHECKOUT, { method: 'POST', body: '{no json' }), ENV))
  assert.equal(roto.status, 400)
  const grande = await onRequest(contexto(new Request(URL_CHECKOUT, { method: 'POST', body: JSON.stringify({ x: 'a'.repeat(20_000) }) }), ENV))
  assert.equal(grande.status, 413)
  const get = await onRequest(contexto(new Request(URL_CHECKOUT), ENV))
  assert.equal(get.status, 405)
  assert.equal(get.headers.get('allow'), 'POST')
})
