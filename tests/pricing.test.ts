import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  CATALOGO,
  CROSS_SELL,
  LINEAS_MAXIMAS,
  ENVIO_GRATIS_MINIMO,
  PROMO,
  buscarProductoPorNombre,
  buscarProductoPorSlug,
  calcularTotales,
  isPromoActiva,
  precioUnitario,
} from '../src/data/pricing'
import { validarMetadata } from '../functions/_lib/metadata'
import { AppError } from '../functions/_lib/http'

const antes = Date.parse('2026-05-31T23:59:58-07:00')
const despues = Date.parse('2026-06-01T00:00:00-07:00')

test('la promo usa una sola referencia horaria', () => {
  assert.equal(PROMO.expiraEn, '2026-05-31T23:59:59-07:00')
  assert.equal(isPromoActiva(antes), true)
  assert.equal(isPromoActiva(despues), false)
})

test('precios con y sin promo', () => {
  assert.equal(precioUnitario(489, antes), 391)
  assert.equal(precioUnitario(489, despues), 489)
  assert.equal(precioUnitario(789, antes), 631)
})

test('totales: descuento por unidad redondeada y envío gratis sobre el total', () => {
  const lineas = [{ precio: 489, cantidad: 2 }, { precio: 589, cantidad: 1 }]
  const conPromo = calcularTotales(lineas, antes)
  assert.equal(conPromo.subtotal, 1567)
  assert.equal(conPromo.total, 391 * 2 + 471)
  assert.equal(conPromo.descuento, conPromo.subtotal - conPromo.total)
  assert.equal(conPromo.envioGratis, conPromo.total >= ENVIO_GRATIS_MINIMO)
  const sinPromo = calcularTotales(lineas, despues)
  assert.equal(sinPromo.descuento, 0)
  assert.equal(sinPromo.total, 1567)
  assert.equal(sinPromo.envioGratis, true)
  assert.equal(calcularTotales([{ precio: 489, cantidad: 1 }], despues).envioGratis, false)
})

test('catálogo: slugs únicos, búsqueda por nombre y cross-sell válido', () => {
  const slugs = CATALOGO.map(p => p.slug)
  assert.equal(new Set(slugs).size, slugs.length)
  assert.equal(buscarProductoPorNombre('  TARJETERO CARDÓN ')?.slug, 'tarjetero-cardon')
  assert.equal(buscarProductoPorSlug('no-existe'), undefined)
  for (const slug of CROSS_SELL) assert.ok(buscarProductoPorSlug(slug), `cross-sell desconocido: ${slug}`)
})

test('metadata.cart (formato del Worker de abandonados) cabe en 500 caracteres con el máximo de líneas', () => {
  const mayor = [...CATALOGO].sort((x, y) => y.nombre.length - x.nombre.length)[0]
  const colorLargo = (mayor.colores ?? []).reduce((m, c) => (c.length > m.length ? c : m), '')
  const lineas = Array.from({ length: LINEAS_MAXIMAS }, () => ({ n: mayor.nombre, p: 99999, c: 10, col: colorLargo }))
  const json = JSON.stringify(lineas)
  assert.ok(json.length <= 500, `mide ${json.length}`)
  assert.deepEqual(Object.keys(JSON.parse(json)[0]), ['n', 'p', 'c', 'col'])
})

test('metadata: rechaza valores o claves fuera de límite y omite vacíos', () => {
  assert.throws(() => validarMetadata({ x: 'a'.repeat(501) }), (e: unknown) => e instanceof AppError && e.code === 'metadata_excedida')
  assert.throws(() => validarMetadata({ 'a[b]': '1' }), AppError)
  assert.deepEqual(validarMetadata({ a: '1', b: '', c: undefined }), { a: '1' })
  const demasiadas: Record<string, string> = {}
  for (let i = 0; i < 51; i++) demasiadas[`k${i}`] = '1'
  assert.throws(() => validarMetadata(demasiadas), AppError)
})
