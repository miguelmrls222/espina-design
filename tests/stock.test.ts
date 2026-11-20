import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { readFileSync } from 'node:fs'
import { onRequest } from '../functions/api/create-checkout'
import { cantidadDisponible, estaDisponible, limiteCompra, CANTIDAD_MAXIMA, buscarProductoPorSlug } from '../src/data/pricing'
import { contexto, instalarFetch, peticionJson } from './helpers'

const config = readFileSync(new URL('../public/admin/config.yml', import.meta.url), 'utf8')
const js = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8')
const base = { slug: 'x', nombre: 'X', precio: 100 }

test('CMS: color Negro y campo numérico de piezas disponibles (opcional, entero, mínimo 0)', () => {
  assert.match(config, /\{ label: "Negro", value: "negro" \}/)
  const bloque = config.slice(config.indexOf('name: "cantidad_disponible"'), config.indexOf('name: "stock"'))
  assert.match(bloque, /widget: "number"/)
  assert.match(bloque, /value_type: "int"/)
  assert.match(bloque, /min: 0/)
  assert.match(bloque, /required: false/)
})

test('sitio: Negro tiene muestra #1A1A1A y etiqueta visible', () => {
  assert.match(js, /'negro': '#1A1A1A'/)
  assert.match(js, /const etiquetaColor/)
  assert.match(js, /'cafe oscuro': 'Café oscuro'/)
})

test('compatibilidad: sin cantidad_disponible no hay límite numérico', () => {
  assert.equal(cantidadDisponible({ ...base }), null)
  assert.equal(estaDisponible({ ...base }), true)
  assert.equal(limiteCompra({ ...base }), CANTIDAD_MAXIMA)
  assert.equal(estaDisponible({ ...base, stock: 'agotado' }), false)
  assert.equal(estaDisponible({ ...base, stock: 'bajo-pedido' }), true)
})

test('cantidad_disponible: 0 agota, n limita la compra y nunca supera el máximo', () => {
  assert.equal(estaDisponible({ ...base, cantidad_disponible: 0 }), false)
  assert.equal(limiteCompra({ ...base, cantidad_disponible: 3 }), 3)
  assert.equal(limiteCompra({ ...base, cantidad_disponible: 50 }), CANTIDAD_MAXIMA)
  assert.equal(estaDisponible({ ...base, stock: 'agotado', cantidad_disponible: 5 }), false)
  assert.equal(cantidadDisponible({ ...base, cantidad_disponible: -1 }), null)
})

test('sitio: agregar, sumar y normalizar el carrito respetan el límite por producto', () => {
  assert.match(js, /unidadesEnCarrito\(prod\.slug\) >= limiteCompra\(prod\)/)
  assert.match(js, /unidadesEnCarrito\(cart\[i\]\.slug\) >= tope/)
  assert.match(js, /limiteCompra\(prod\) - yaEnCarrito/)
  assert.doesNotMatch(js, /p\.stock === 'agotado'|prod\.stock === 'agotado'|producto\.stock === 'agotado'/)
})

let restaurar = () => {}
afterEach(() => restaurar())

test('servidor: rechaza más piezas que el stock (suma de colores) con 409', async () => {
  const slug = 'tarjetero-cactus'
  const original = buscarProductoPorSlug(slug)!
  const previo = original.cantidad_disponible
  original.cantidad_disponible = 2
  try {
    restaurar = instalarFetch([]).restaurar
    const peticion = peticionJson('https://espinadesign.com/api/create-checkout', {
      email: 'ana@correo.com', telefono: '662 414 2998', zip_to: '83170',
      items: [{ slug, color: 'verde', cantidad: 2 }, { slug, color: 'gris', cantidad: 1 }],
    })
    const res = await onRequest(contexto(peticion, { STRIPE_SECRET_KEY: 'sk_test_x', SKYDROP_CLIENT_ID: 'i', SKYDROP_CLIENT_SECRET: 's' }))
    const cuerpo = await res.json() as { code: string; error: string }
    assert.equal(res.status, 409)
    assert.equal(cuerpo.code, 'stock_insuficiente')
    assert.match(cuerpo.error, /Solo quedan 2 piezas de Tarjetero Cactus/)
  } finally {
    if (previo === undefined) delete original.cantidad_disponible
    else original.cantidad_disponible = previo
  }
})
