import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8')

test('el foco del teclado es visible y no se elimina globalmente', () => {
  assert.match(css, /:focus-visible\s*\{[^}]*outline:\s*2px solid/)
  assert.doesNotMatch(css, /^button\s*\{\s*outline:\s*none/m)
})

test('los botones principales tienen zona táctil de al menos 44 px', () => {
  assert.match(css, /#menu-btn[\s\S]*?min-width:\s*44px;[\s\S]*?min-height:\s*44px/)
  assert.match(css, /\.add-to-cart::before[\s\S]*?inset:\s*-6px/)
})

test('cada campo del carrito tiene su etiqueta asociada', () => {
  for (const id of ['cart-email', 'cart-zip', 'cart-phone']) {
    assert.ok(html.includes(`<label for="${id}"`), `falta label para ${id}`)
  }
})

test('el botón de agregar de la ficha queda fijo al fondo del modal', () => {
  assert.match(html, /<div id="product-modal-cta">\s*<button id="product-modal-add"/)
  assert.match(css, /#product-modal-cta\s*\{[^}]*position:\s*sticky/)
})

test('el aviso emergente es un estado cortés y no una alerta', () => {
  assert.match(html, /<div id="toast" role="status" aria-live="polite"/)
})
