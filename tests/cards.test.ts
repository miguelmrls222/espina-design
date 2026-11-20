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

test('el título reserva exactamente 2 líneas y el material 1 línea', () => {
  assert.match(css, /\.tarjeta-titulo\s*\{[^}]*min-height:\s*2\.5em;[^}]*-webkit-line-clamp:\s*2/)
  assert.match(css, /\.tarjeta-subtitulo\s*\{[^}]*height:\s*1\.4em;[^}]*-webkit-line-clamp:\s*1/)
})

test('el material de la tarjeta es siempre "Cuero vacuno"', () => {
  assert.match(js, /const MATERIAL_TARJETA = 'Cuero vacuno'/)
  assert.match(js, /data-zona="subtitulo"[^>]*>\$\{MATERIAL_TARJETA\}/)
})

test('la tarjeta ya no muestra estrellas ni días de elaboración', () => {
  const inicio = js.indexOf('function renderProductCard')
  const tarjeta = js.slice(inicio, js.indexOf('// ─── Testimonios', inicio))
  assert.doesNotMatch(tarjeta, /resenas|text-amber|tiempo_fabricacion|Hecho a mano/)
  assert.doesNotMatch(css, /tarjeta-detalle/)
})

test('el sello de garantía muestra "1 año" en móvil y el texto completo en escritorio', () => {
  assert.match(js, /<span class="sm:hidden">1 año<\/span><span class="hidden sm:inline">Garantía de 1 año<\/span>/)
  assert.match(js, /warranty-badge[^"]*"[^>]*aria-label="Garantía de 1 año"/)
})

test('el orden es título, material, colores, precio y botones, anclados abajo', () => {
  const inicio = js.indexOf('function renderProductCard')
  const tarjeta = js.slice(inicio, js.indexOf('// ─── Testimonios', inicio))
  const orden = ['tarjeta-titulo', 'data-zona="subtitulo"', 'data-zona="colores"', 'data-zona="precio"', 'data-zona="acciones"']
    .map(marca => tarjeta.indexOf(marca))
  assert.deepEqual([...orden].sort((a, b) => a - b), orden)
  assert.ok(orden.every(i => i > 0))
  assert.match(tarjeta, /mt-auto pt-3/)
})

test('cada tarjeta tiene "Comprar ahora" (azul, texto blanco) y "Agregar al carrito" (gris, texto negro)', () => {
  const inicio = js.indexOf('function renderProductCard')
  const tarjeta = js.slice(inicio, js.indexOf('// ─── Testimonios', inicio))
  assert.match(tarjeta, /comprar-ahora \$\{CLASES_BOTON\} bg-\[#1D4ED8\] text-white hover:bg-\[#1E40AF\]/)
  assert.match(tarjeta, /add-to-cart \$\{CLASES_BOTON\} bg-stone-200 text-black hover:bg-stone-300/)
  assert.match(tarjeta, />Comprar ahora<\/button>/)
  assert.match(tarjeta, /conIcono\('Agregar al carrito'\)\}<\/button>/)
  assert.ok(tarjeta.indexOf('Comprar ahora</button>') < tarjeta.indexOf("conIcono('Agregar al carrito')"))
})

test('los botones miden al menos 44 px de alto y se apilan o se ponen en fila según el ancho de la tarjeta', () => {
  assert.match(js, /const CLASES_BOTON = '[^']*min-h-11/)
  assert.match(js, /data-zona="acciones" class="mt-2\.5 flex flex-col gap-2"/)
  assert.doesNotMatch(js, /@\[19rem\]:flex-row/)
})

test('"Comprar ahora" agrega la pieza, abre el carrito y lleva al correo del pago', () => {
  const funcion = js.slice(js.indexOf('function comprarAhora'), js.indexOf('function gtagEvent'))
  assert.match(funcion, /addToCart\(nombre, precio, imagen, descripcion, color\)/)
  assert.match(funcion, /openCart\(\)/)
  assert.match(funcion, /cartEmail\?\.scrollIntoView/)
  assert.match(js, /closest\('\.comprar-ahora'\)/)
})

test('un producto agotado conserva ambos botones deshabilitados para no romper la alineación', () => {
  const inicio = js.indexOf('function renderProductCard')
  const tarjeta = js.slice(inicio, js.indexOf('// ─── Testimonios', inicio))
  assert.equal((tarjeta.match(/\$\{agotado \? ' disabled' : ''\}/g) || []).length, 2)
  assert.match(js, /disabled:opacity-50 disabled:cursor-not-allowed/)
})

test('el catálogo, los tipos, el CMS y la ficha ya no tienen días de elaboración', () => {
  const tipos = readFileSync(new URL('../src/data/types.ts', import.meta.url), 'utf8')
  const cms = readFileSync(new URL('../public/admin/config.yml', import.meta.url), 'utf8')
  const catalogo = readFileSync(new URL('../src/data/catalog.generated.ts', import.meta.url), 'utf8')
  for (const [nombre, texto] of [['types.ts', tipos], ['config.yml', cms], ['catálogo', catalogo], ['main.js', js]]) {
    assert.doesNotMatch(texto, /tiempo_fabricacion/, nombre)
  }
  assert.doesNotMatch(js, /Fabricación:/)
})

test('modal: sin reseñas, barra inferior fija con precio a la izquierda y botón azul a la derecha', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  const js = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8')
  assert.doesNotMatch(html, /product-modal-reviews|product-modal-review-form|Dejar reseña/)
  assert.doesNotMatch(js, /resenas|review|Estrellas|aggregateRating/)
  const barra = html.slice(html.indexOf('sticky bottom-0'), html.indexOf('<!-- MENÚ -->'))
  assert.ok(barra.indexOf('id="product-modal-price"') < barra.indexOf('id="product-modal-add"'))
  assert.match(barra, /justify-between/)
  assert.match(barra, /font-heading text-xl sm:text-2xl leading-none tracking-tight/)
  assert.match(barra, /bg-\[#1D4ED8\] text-white hover:bg-\[#1E40AF\]/)
  assert.match(barra, /<span>Agregar al carrito<\/span>/)
})

test('icono del carrito: carrito de supermercado (ruedas), no bolsa', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  const boton = html.slice(html.indexOf('id="cart-btn"'), html.indexOf('id="cart-count"'))
  assert.match(boton, /<circle[^>]*cx="9"[\s\S]*<circle[^>]*cx="17"/)
  assert.doesNotMatch(boton, /M21 8a2 2/)
})

test('botones "Agregar" llevan el icono de carrito con "+" antes del texto', () => {
  assert.match(js, /const ICONO_CARRITO_MAS = '<svg[^']*M12\.5 8\.5v4M10\.5 10\.5h4/)
  assert.match(js, /\$\{conIcono\('Agregar al carrito'\)\}<\/button>/)
  assert.match(js, /productModalAdd\.innerHTML = agotado \? 'Agotado' : conIcono\('Agregar al carrito'\)/)
  assert.match(js, /\$\{conIcono\('Agregar'\)\}/)
  assert.match(html, /id="product-modal-add"[^>]*>\s*<svg[\s\S]*?<\/svg><span>Agregar al carrito<\/span>/)
})

test('carrito: "Pagar ahora" azul con texto blanco; sugeridos en gris con texto negro', () => {
  assert.match(html, /id="checkout-btn" class="[^"]*bg-\[#1D4ED8\] text-white hover:bg-\[#1E40AF\]/)
  assert.match(js, /class="crossell-add [^"]*bg-stone-200 text-black[^"]*hover:bg-stone-300/)
})

test('carrito: "Pagar ahora" sin mayúsculas forzadas y "Envío gratis" como texto verde sin icono', () => {
  const boton = html.slice(html.indexOf('id="checkout-btn"'), html.indexOf('</button>', html.indexOf('id="checkout-btn"')))
  assert.doesNotMatch(boton.split('>')[0], /uppercase/)
  assert.match(boton, />\s*Pagar ahora\s*$/)
  assert.match(html, /<p id="envio-success" class="[^"]*text-green-700[^"]*">Envío gratis<\/p>/)
  assert.doesNotMatch(html.match(/<p id="envio-success"[^]*?<\/p>/)![0], /uppercase|<svg/)
  assert.doesNotMatch(js, /lanzarConfetti|sonidoConfetti/)
  assert.match(js, /envioIcon\.className = 'hidden'/)
})

test('TIENDA y "Productos más vendidos" comparten el mismo ancho de tarjeta', () => {
  assert.match(js, /const ANCHO_TARJETA = 'w-\[240px\] sm:w-\[280px\]'/)
  assert.match(js, /flex-shrink-0 \$\{ANCHO_TARJETA\} snap-start/)
  assert.match(js, /: ANCHO_TARJETA\b/)
  assert.match(html, /id="productos-grid" class="grid grid-cols-\[repeat\(auto-fill,240px\)\] sm:grid-cols-\[repeat\(auto-fill,280px\)\] [^"]*items-stretch/)
})
