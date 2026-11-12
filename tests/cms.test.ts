import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const config = readFileSync(new URL('../public/admin/config.yml', import.meta.url), 'utf8')
const js = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8')

test('las fotos del CMS son una lista de imágenes (de 1 a 5) y no un selector múltiple', () => {
  const bloque = config.slice(config.indexOf('name: "fotos"'), config.indexOf('name: "precio"'))
  assert.match(bloque, /widget: "list"/)
  assert.match(bloque, /min: 1/)
  assert.match(bloque, /max: 5/)
  assert.match(bloque, /field:\s+label: "Foto"\s+name: "foto"\s+widget: "image"/)
  assert.doesNotMatch(bloque, /multiple: true/)
})

test('el panel está en español y las fotos van antes que el precio', () => {
  assert.match(config, /^locale: "es"/m)
  assert.ok(config.indexOf('name: "fotos"') < config.indexOf('name: "precio"'))
})

test('el slug del CMS se valida y no existe el campo de días de elaboración', () => {
  assert.match(config, /pattern: \["\^\[a-z0-9\]\+/)
  assert.doesNotMatch(config, /tiempo_fabricacion/)
})

test('la ficha del producto es una galería deslizable con miniaturas sincronizadas', () => {
  assert.match(js, /function renderGaleriaFicha/)
  assert.match(js, /function marcarMiniatura/)
  assert.match(js, /id === 'product-modal-image'\) marcarMiniatura\(activo\)/)
  assert.match(js, /aria-label="Ver foto \$\{i \+ 1\} de \$\{fotos\.length\}"/)
})
