import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { CATALOGO } from '../src/data/catalog.generated'

test('cada producto tiene slug válido y único, y fotos como lista', () => {
  const slugs = CATALOGO.map(p => p.slug)
  assert.equal(new Set(slugs).size, slugs.length)
  for (const producto of CATALOGO) {
    assert.match(producto.slug, /^[a-z0-9]+(-[a-z0-9]+)*$/, producto.nombre)
    assert.ok(Array.isArray(producto.fotos), `${producto.nombre}: fotos debe ser una lista`)
  }
})

test('todas las imágenes de producto existen en public/', () => {
  for (const producto of CATALOGO) {
    for (const foto of producto.fotos ?? []) {
      assert.ok(existsSync(new URL(`../public${foto}`, import.meta.url)), `${producto.nombre}: falta ${foto}`)
    }
  }
})

test('el Tarjetero Desert Money Clip está en el catálogo con su foto', () => {
  const producto = CATALOGO.find(p => p.slug === 'tarjetero-dmc')
  assert.ok(producto)
  assert.deepEqual(producto.fotos, ['/images/products/tarjetero-money-clip.jpg'])
})
