import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8')
const js = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8')

test('la cuadrícula estira las tarjetas para que midan lo mismo en cada fila', () => {
  assert.match(html, /id="productos-grid" class="grid [^"]*items-stretch/)
  assert.match(js, /<article class="tarjeta-producto @container h-full flex flex-col/)
})

test('título, subtítulo y detalle reservan altura fija con límite de líneas', () => {
  assert.match(css, /\.tarjeta-titulo\s*\{[^}]*min-height:\s*2\.5em;[^}]*-webkit-line-clamp:\s*2/)
  assert.match(css, /\.tarjeta-subtitulo\s*\{[^}]*height:\s*1\.4em;[^}]*-webkit-line-clamp:\s*1/)
  assert.match(css, /\.tarjeta-detalle\s*\{[^}]*min-height:\s*2\.5em;[^}]*-webkit-line-clamp:\s*2/)
})

test('subtítulo y colores se reservan aunque el producto no los tenga', () => {
  assert.match(js, /data-zona="subtitulo"[^>]*>\$\{subtitulo \|\| '&nbsp;'\}/)
  assert.match(js, /data-zona="colores" class="[^"]*h-3\.5/)
})

test('precio y botón se anclan abajo y su disposición depende del ancho de la tarjeta', () => {
  assert.match(js, /mt-auto pt-4/)
  assert.match(js, /flex-col gap-3 @\[17rem\]:flex-row/)
})

test('la elevación al pasar el cursor usa transform y no cambia el layout', () => {
  assert.match(css, /\.tarjeta-producto:hover[\s\S]*?transform:\s*translateY\(-2px\)/)
})
