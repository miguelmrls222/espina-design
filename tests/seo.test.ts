import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { productosActivos } from '../src/data/pricing'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')

function bloquesLd(): Array<Record<string, unknown>> {
  const bloques: Array<Record<string, unknown>> = []
  for (const coincidencia of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    bloques.push(JSON.parse(coincidencia[1]) as Record<string, unknown>)
  }
  return bloques
}

test('index.html no repite productos fuera del ItemList', () => {
  const sueltos = bloquesLd().filter(bloque => bloque['@type'] === 'Product')
  assert.equal(sueltos.length, 0)
})

test('los datos estructurados coinciden con el catálogo (precio y reseñas)', () => {
  const lista = bloquesLd().find(bloque => bloque['@type'] === 'ItemList') as
    | { itemListElement: Array<{ item: { sku: string; offers: { price: string }; aggregateRating?: { ratingValue: string; reviewCount: string } } }> }
    | undefined
  assert.ok(lista)
  const productos = productosActivos()
  assert.equal(lista.itemListElement.length, productos.length)
  for (const { item } of lista.itemListElement) {
    const producto = productos.find(p => p.slug === item.sku)
    assert.ok(producto, `SKU desconocido: ${item.sku}`)
    assert.equal(Number(item.offers.price), producto.precio, `precio de ${item.sku}`)
    const resenas = producto.resenas ?? []
    if (resenas.length > 0) {
      const promedio = resenas.reduce((suma, r) => suma + r.puntuacion, 0) / resenas.length
      assert.equal(Number(item.aggregateRating?.reviewCount), resenas.length)
      assert.equal(Number(item.aggregateRating?.ratingValue), Number(promedio.toFixed(1)))
    }
  }
})

test('el checkout muestra el error y la promo no usa fechas locales', () => {
  assert.ok(html.includes('id="checkout-error"'))
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8')
  assert.ok(!/new Date\(\s*2026/.test(main))
  assert.ok(!/\*\s*0\.8/.test(main))
})
