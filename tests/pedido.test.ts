import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { onRequest } from '../functions/api/pedido'
import { folioDesdeSesion } from '../src/data/folio'
import { contexto, instalarFetch, type Llamada } from './helpers'

const ENV = { STRIPE_SECRET_KEY: 'sk_test_x' }
const ID = 'cs_test_a1b2C3d4E5f6G7h8'
let restaurar = () => {}
afterEach(() => restaurar())

const pedir = (id: string) => onRequest(contexto(new Request(`https://espinadesign.com/api/pedido?session_id=${id}`), ENV))
const sesion = (extra: Record<string, unknown> = {}) => (l: Llamada) =>
  l.url.endsWith(`/checkout/sessions/${ID}`) ? { body: {
    id: ID, payment_status: 'paid', created: 1_763_600_000, amount_total: 129900,
    metadata: { envio_monto: '99', email: 'ana@correo.com' },
    customer_details: { email: 'ana@correo.com' },
    shipping_details: { name: 'Ana', address: { line1: 'Calle Sol 123', city: 'Hermosillo', state: 'Sonora', postal_code: '83170' } },
    ...extra,
  } } : undefined

test('folio corto, estable y sin caracteres ambiguos', () => {
  assert.equal(folioDesdeSesion(ID), 'ED-E5F6-G7H8')
  assert.match(folioDesdeSesion(ID), /^ED-[A-Z0-9]{4}-[A-Z0-9]{4}$/)
  assert.equal(folioDesdeSesion(ID), folioDesdeSesion(ID))
  assert.doesNotMatch(folioDesdeSesion('cs_live_OOIILLoo12345678'), /[OIL]/)
  assert.equal(folioDesdeSesion(''), '')
  assert.equal(folioDesdeSesion('cs_x'), '')
})

test('devuelve subtotal, envío y total sin datos sensibles', async () => {
  restaurar = instalarFetch([sesion()]).restaurar
  const res = await pedir(ID)
  const cuerpo = await res.json() as Record<string, any>
  assert.equal(res.status, 200)
  assert.equal(cuerpo.total, 1299)
  assert.equal(cuerpo.envio, 99)
  assert.equal(cuerpo.subtotal, 1200)
  assert.equal(cuerpo.folio, folioDesdeSesion(ID))
  assert.deepEqual(cuerpo.destino, { ciudad: 'Hermosillo', estado: 'Sonora', cp: '83170' })
  assert.doesNotMatch(JSON.stringify(cuerpo), /Calle Sol|telefono/)
})

test('envío gratis: envio 0 y subtotal igual al total', async () => {
  restaurar = instalarFetch([sesion({ amount_total: 150000, metadata: { envio_monto: '0' } })]).restaurar
  const cuerpo = await (await pedir(ID)).json() as Record<string, any>
  assert.equal(cuerpo.envio, 0)
  assert.equal(cuerpo.subtotal, 1500)
})

test('sesión sin pagar o id inválido no revela el pedido', async () => {
  restaurar = instalarFetch([sesion({ payment_status: 'unpaid' })]).restaurar
  assert.equal((await pedir(ID)).status, 404)
  assert.equal((await pedir('no-es-sesion')).status, 400)
})
