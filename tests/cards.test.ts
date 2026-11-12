import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8')
const js = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8')

test('la cuadrícula estira las tarjetas para que midan lo mismo en cada fila', () => {
  assert.match(html, /id="productos-grid" class="grid [^"]*items-stretch/)
  assert.match(js, /<article class="tarjeta-producto h-full flex flex-col/)
})

test('el título reserva exactamente 2 líneas y el material 1 línea', () => {
  assert.match(css, /\.tarjeta-titulo\s*\{[^}]*min-height:\s*2\.5em;[^}]*-webkit-line-clamp:\s*2/)
  assert.match(css, /\.tarjeta-subtitulo\s*\{[^}]*height:\s*1\.4em;[^}]*-webkit-line-clamp:\s*1/)
})

test('el material de la tarjeta es siempre "Cuero vacuno"', () => {
  assert.match(js, /const MATERIAL_TARJETA = 'Cuero vacuno'/)
  assert.match(js, /data-zona="subtitulo"[^>]*>\$\{MATERIAL_TARJETA\}/)
})

test('la tarjeta ya no muestra estrellas ni días de elaboración', () => {
  const tarjeta = js.slice(js.indexOf('function renderProductCard'), js.indexOf('function renderEstrellas'))
  assert.doesNotMatch(tarjeta, /resenas|text-amber|tiempo_fabricacion|Hecho a mano/)
  assert.doesNotMatch(css, /tarjeta-detalle/)
})

test('el sello de garantía muestra "1 año" en móvil y el texto completo en escritorio', () => {
  assert.match(js, /<span class="sm:hidden">1 año<\/span><span class="hidden sm:inline">Garantía de 1 año<\/span>/)
  assert.match(js, /warranty-badge[^"]*"[^>]*aria-label="Garantía de 1 año"/)
})

test('el orden es título, material, colores, precio y botón Comprar, anclados abajo', () => {
  const tarjeta = js.slice(js.indexOf('function renderProductCard'), js.indexOf('function renderEstrellas'))
  const orden = ['tarjeta-titulo', 'data-zona="subtitulo"', 'data-zona="colores"', 'data-zona="precio"', 'add-to-cart']
    .map(marca => tarjeta.indexOf(marca))
  assert.deepEqual([...orden].sort((a, b) => a - b), orden)
  assert.ok(orden.every(i => i > 0))
  assert.match(tarjeta, /mt-auto pt-4/)
  assert.match(tarjeta, /\n\s+Comprar\n/)
  assert.doesNotMatch(tarjeta, />\s*Agregar\s*</)
})

test('un producto agotado conserva el botón (deshabilitado) para no romper la alineación', () => {
  assert.match(js, /disabled class="w-full mt-3[^"]*"[^>]*>Agotado<\/button>/)
})

test('la elevación al pasar el cursor usa transform y no cambia el layout', () => {
  assert.match(css, /\.tarjeta-producto:hover[\s\S]*?transform:\s*translateY\(-2px\)/)
})
