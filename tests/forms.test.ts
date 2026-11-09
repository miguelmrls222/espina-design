import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { onRequest as resena } from '../functions/api/submit-review'
import { onRequest as suscribir } from '../functions/api/subscribe'
import { contexto, instalarFetch, peticionJson, type Llamada } from './helpers'

const ENV = { BREVO_API_KEY: 'k' }
const brevoOk = (l: Llamada) => (l.url.includes('brevo.com') ? { status: 201, body: {} } : undefined)
const URL_RESENA = 'https://espinadesign.com/api/submit-review'
const URL_SUSCRIBIR = 'https://espinadesign.com/api/subscribe'
const valida = { producto: 'Tarjetero Cactus', nombre: 'Ana', puntuacion: 5, texto: 'Excelente calidad, me encantó.' }

let restaurar = () => {}
afterEach(() => restaurar())

test('reseña válida: envía un correo con el producto del catálogo', async () => {
  const mock = instalarFetch([brevoOk])
  restaurar = mock.restaurar
  const respuesta = await resena(contexto(peticionJson(URL_RESENA, { ...valida, producto: ' tarjetero cactus ' }), ENV))
  assert.equal(respuesta.status, 200)
  assert.deepEqual(await respuesta.json(), { ok: true })
  const correo = JSON.parse(mock.llamadas[0].body)
  assert.equal(correo.subject, 'Nueva reseña — Tarjetero Cactus')
})

test('reseña: escapa HTML y neutraliza saltos de línea en el asunto', async () => {
  const mock = instalarFetch([brevoOk])
  restaurar = mock.restaurar
  const respuesta = await resena(contexto(peticionJson(URL_RESENA, {
    ...valida, nombre: '<script>alert(1)</script>', texto: 'Muy bueno <img src=x onerror=alert(1)>\n\n\n\nsegunda línea',
  }), ENV))
  assert.equal(respuesta.status, 200)
  const { htmlContent, subject } = JSON.parse(mock.llamadas[0].body)
  assert.ok(!htmlContent.includes('<script>'))
  assert.ok(!htmlContent.includes('<img'))
  assert.ok(htmlContent.includes('&lt;script&gt;'))
  assert.ok(!/[\r\n]/.test(subject))
})

test('reseña: valida puntuación, longitudes y producto', async () => {
  const casos: Array<[Record<string, unknown>, string]> = [
    [{ puntuacion: 0 }, 'campo_invalido'],
    [{ puntuacion: 6 }, 'campo_invalido'],
    [{ puntuacion: -3 }, 'campo_invalido'],
    [{ puntuacion: 4.5 }, 'campo_invalido'],
    [{ puntuacion: '5' }, 'campo_invalido'],
    [{ puntuacion: 1e9 }, 'campo_invalido'],
    [{ nombre: 'A' }, 'campo_corto'],
    [{ nombre: 'x'.repeat(61) }, 'campo_largo'],
    [{ texto: 'corto' }, 'campo_corto'],
    [{ texto: 'x'.repeat(1001) }, 'campo_largo'],
    [{ producto: 'Producto inventado' }, 'producto_desconocido'],
    [{ nombre: 42 }, 'campo_invalido'],
  ]
  for (const [cambio, codigo] of casos) {
    const mock = instalarFetch([brevoOk])
    restaurar = mock.restaurar
    const respuesta = await resena(contexto(peticionJson(URL_RESENA, { ...valida, ...cambio }), ENV))
    assert.equal(respuesta.status, 400, JSON.stringify(cambio))
    assert.equal((await respuesta.json() as { code: string }).code, codigo, JSON.stringify(cambio))
    assert.equal(mock.llamadas.length, 0)
    mock.restaurar()
  }
})

test('reseña y suscripción: el honeypot responde ok sin enviar nada', async () => {
  const mock = instalarFetch([brevoOk])
  restaurar = mock.restaurar
  const a = await resena(contexto(peticionJson(URL_RESENA, { ...valida, website: 'http://spam' }), ENV))
  const b = await suscribir(contexto(peticionJson(URL_SUSCRIBIR, { email: 'a@b.com', website: 'x' }), ENV))
  assert.equal(a.status, 200)
  assert.equal(b.status, 200)
  assert.equal(mock.llamadas.length, 0)
})

test('reseña: falla de Brevo devuelve 502 sin filtrar detalles', async () => {
  const mock = instalarFetch([(l) => (l.url.includes('brevo.com') ? { status: 401, body: { message: 'clave secreta mala' } } : undefined)])
  restaurar = mock.restaurar
  const respuesta = await resena(contexto(peticionJson(URL_RESENA, valida), ENV))
  assert.equal(respuesta.status, 502)
  assert.ok(!(await respuesta.text()).includes('clave secreta'))
})

test('suscripción: correo válido, inválido, duplicado y falla externa', async () => {
  let mock = instalarFetch([brevoOk])
  restaurar = mock.restaurar
  assert.equal((await suscribir(contexto(peticionJson(URL_SUSCRIBIR, { email: ' Ana@Correo.com ' }), ENV))).status, 200)
  assert.equal(JSON.parse(mock.llamadas[0].body).email, 'ana@correo.com')
  mock.restaurar()

  for (const email of ['', 'sin-arroba', 'a@b', 'a b@c.com', 'x'.repeat(300) + '@c.com', 5, null]) {
    mock = instalarFetch([brevoOk])
    restaurar = mock.restaurar
    const respuesta = await suscribir(contexto(peticionJson(URL_SUSCRIBIR, { email }), ENV))
    assert.equal(respuesta.status, 400, String(email))
    assert.equal(mock.llamadas.length, 0)
    mock.restaurar()
  }

  mock = instalarFetch([(l) => (l.url.includes('brevo.com') ? { status: 400, body: { code: 'duplicate_parameter' } } : undefined)])
  restaurar = mock.restaurar
  assert.equal((await suscribir(contexto(peticionJson(URL_SUSCRIBIR, { email: 'a@b.com' }), ENV))).status, 200)
  mock.restaurar()

  mock = instalarFetch([(l) => (l.url.includes('brevo.com') ? { status: 500, body: {} } : undefined)])
  restaurar = mock.restaurar
  assert.equal((await suscribir(contexto(peticionJson(URL_SUSCRIBIR, { email: 'a@b.com' }), ENV))).status, 502)
})

test('sin BREVO_API_KEY responde 500 controlado', async () => {
  const mock = instalarFetch([])
  restaurar = mock.restaurar
  const respuesta = await suscribir(contexto(peticionJson(URL_SUSCRIBIR, { email: 'a@b.com' }), {}))
  assert.equal(respuesta.status, 500)
  assert.equal((await respuesta.json() as { code: string }).code, 'config_correo')
})
