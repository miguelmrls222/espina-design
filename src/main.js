import './style.css'

const pages = {
  '': 'inicio',
  'tienda': 'tienda',
  'nosotros': 'nosotros',
  'faq': 'faq',
  'envios': 'envios',
  'devoluciones': 'devoluciones',
  'garantia': 'garantia',
  'contacto': 'contacto',
  'gracias': 'gracias',
}

const menu = document.getElementById('menu-mobile')

// ─── Routing ───

const pageMeta = {
  inicio: { title: 'Espina Design — Cuero Hecho a Mano en México', desc: 'Artículos cotidianos de cuero con estilo minimalista. Hecho a mano en Hermosillo, Sonora, México.' },
  tienda: { title: 'Tienda — Espina Design', desc: 'Billeteras, tarjeteros y accesorios de cuero hechos a mano en México. Envíos a todo el país.' },
  nosotros: { title: 'Nosotros — Espina Design', desc: 'Conoce la historia de Espina Design. Cuero hecho a mano en Hermosillo, Sonora desde 2016.' },
  faq: { title: 'Preguntas Frecuentes — Espina Design', desc: 'Resuelve tus dudas sobre envíos, pagos, cuidados del cuero y más.' },
  envios: { title: 'Envíos — Espina Design', desc: 'Información sobre envíos a toda la República Mexicana, costos y tiempos de entrega.' },
  devoluciones: { title: 'Devoluciones — Espina Design', desc: 'Política de devoluciones y cambios. Plazo de 7 días para productos en condición original.' },
  garantia: { title: 'Garantía — Espina Design', desc: 'Garantía de 30 días contra defectos de fabricación en todos nuestros productos de cuero.' },
  contacto: { title: 'Contacto — Espina Design', desc: 'Contáctanos por WhatsApp, correo o Instagram. Estamos en Hermosillo, Sonora, México.' },
  gracias: { title: '¡Gracias por tu compra! — Espina Design', desc: 'Tu pedido ha sido confirmado. Recibirás un correo con los detalles y el número de seguimiento.' },
}

function navigate(path) {
  const page = pages[path.replace(/^\//, '')] || 'inicio'
  document.querySelectorAll('.page-section').forEach(s => s.classList.add('hidden'))
  const section = document.getElementById(`page-${page}`)
  if (section) section.classList.remove('hidden')
  const meta = pageMeta[page] || pageMeta.inicio
  document.title = meta.title
  const descEl = document.getElementById('meta-desc')
  if (descEl) descEl.content = meta.desc
  document.querySelectorAll('#menu-mobile nav [data-nav]').forEach(a => {
    const href = a.getAttribute('href')
    const isActive = href === path
    a.style.opacity = isActive ? '1' : '0.45'
    if (isActive) {
      a.innerHTML = a.textContent.trim() + ' <span class="inline-block w-1.5 h-1.5 rounded-full bg-black align-middle ml-1"></span>'
    } else {
      a.innerHTML = a.textContent.trim()
    }
  })
  closeMenu()
  if (page === 'inicio') {
    renderDestacados()
    renderTestimonios()
  }
  if (page === 'tienda') renderProductos()
  if (page === 'gracias') renderGracias()
}

function closeMenu() {
  if (!menu) return
  menu.classList.remove('opacity-100', 'pointer-events-auto')
  menu.classList.add('opacity-0', 'pointer-events-none')
}

function toggleMenu() {
  if (!menu) return
  const isOpen = menu.classList.contains('opacity-100')
  if (isOpen) {
    closeMenu()
  } else {
    menu.classList.remove('opacity-0', 'pointer-events-none')
    menu.classList.add('opacity-100', 'pointer-events-auto')
  }
}

window.addEventListener('popstate', () => navigate(window.location.pathname))

// ─── Productos ───

const productosModules = import.meta.glob('/src/data/productos/*.json', { eager: true })
const productos = Object.values(productosModules)
  .map(m => m.default || m)
  .filter(p => p.activo !== false)

function renderProductos() {
  const grid = document.getElementById('productos-grid')
  if (!grid || grid.dataset.rendered) return
  grid.dataset.rendered = '1'

  if (productos.length === 0) {
    grid.innerHTML = '<p class="col-span-full text-center text-gray-500 py-20">Próximamente productos disponibles.</p>'
    return
  }

  grid.innerHTML = productos.map((p, i) => {
    const img = p.fotos?.[0] ? p.fotos[0] : ''
    const agotado = p.stock === 'agotado'
    const stockBajo = !agotado && typeof p.stock === 'number' && p.stock <= 3

    return `
      <div class="group flex flex-col ${agotado ? 'opacity-50' : ''}">
        <div class="aspect-[4/5] bg-[#F5F5F5] mb-4 overflow-hidden relative cursor-pointer open-detail" data-index="${i}">
          ${img ? `<img src="${img}" alt="${p.nombre}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />` : ''}
          <div class="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300 flex items-center justify-center">
            <span class="text-white text-xs tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/60 px-4 py-2">Ver más</span>
          </div>
          ${agotado ? '<span class="absolute inset-0 flex items-center justify-center text-sm tracking-widest uppercase bg-white/70">Agotado</span>' : ''}
          ${stockBajo ? '<span class="absolute top-2 left-2 bg-[#DC2626] text-white text-[10px] tracking-wider uppercase px-2 py-1 font-heading">Solo quedan ' + p.stock + '</span>' : ''}
          <div class="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded shadow-sm flex items-center gap-1">
            <svg class="w-3 h-3 text-green-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
            <span class="font-heading text-[9px] tracking-wide text-green-800 font-semibold">Garantía de 1 año</span>
          </div>
        </div>
        <div class="flex flex-col flex-1">
          <h3 class="font-heading text-sm tracking-widest uppercase mb-1 cursor-pointer open-detail min-h-[2.5rem] sm:min-h-0 leading-tight" data-index="${i}">${p.nombre}</h3>
          <p class="font-body text-sm text-gray-500 mb-2">$${p.precio.toLocaleString('es-MX')} MXN</p>
          ${renderEstrellas(promedioResenas(p))}
          ${p.colores?.length ? `
          <div class="flex gap-1.5 mb-3">
            ${p.colores.map(c => `<span class="w-3.5 h-3.5 rounded-full border border-gray-300" style="background-color:${colorMap[c] || '#ccc'}" title="${c}"></span>`).join('')}
          </div>` : ''}
          ${!agotado ? `<button class="add-to-cart font-heading text-xs tracking-widest uppercase border border-black px-6 py-2 hover:bg-black hover:text-white transition-colors duration-300 mt-auto self-start"
            data-nombre="${p.nombre}"
            data-precio="${p.precio}"
            data-imagen="${img}"
            data-descripcion="${p.descripcion || ''}"
            data-color="${p.colores?.[0] || ''}">
            Agregar
          </button>` : ''}
        </div>
      </div>
    `
  }).join('')
}

function renderDestacados() {
  const container = document.getElementById('destacados-scroll')
  if (!container || container.dataset.rendered) return
  container.dataset.rendered = '1'
  if (container.children.length > 0) return

  const top = productos.slice(0, 4)

  if (top.length === 0) {
    container.closest('.max-w-6xl').classList.add('hidden')
    return
  }

  container.innerHTML = top.map((p, i) => {
    const prodIndex = productos.indexOf(p)
    const img = p.fotos?.[0] ? p.fotos[0] : ''
    const agotado = p.stock === 'agotado'
    const stockBajo = !agotado && typeof p.stock === 'number' && p.stock <= 3
    return `
      <div class="flex-shrink-0 w-[220px] sm:w-[260px] group flex flex-col snap-start ${agotado ? 'opacity-50' : ''}">
        <div class="aspect-[4/5] bg-[#F5F5F5] mb-4 overflow-hidden relative cursor-pointer open-detail" data-index="${prodIndex}">
          ${img ? `<img src="${img}" alt="${p.nombre}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />` : '<div class="w-full h-full flex items-center justify-center text-gray-300"><svg class="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg></div>'}
          <div class="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300 flex items-center justify-center">
            <span class="text-white text-xs tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/60 px-4 py-2">Ver más</span>
          </div>
          ${agotado ? '<span class="absolute inset-0 flex items-center justify-center text-sm tracking-widest uppercase bg-white/70">Agotado</span>' : ''}
          ${stockBajo ? '<span class="absolute top-2 left-2 bg-[#DC2626] text-white text-[10px] tracking-wider uppercase px-2 py-1 font-heading">Solo quedan ' + p.stock + '</span>' : ''}
          <div class="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded shadow-sm flex items-center gap-1">
            <svg class="w-3 h-3 text-green-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
            <span class="font-heading text-[9px] tracking-wide text-green-800 font-semibold">Garantía de 1 año</span>
          </div>
        </div>
        <div class="flex flex-col flex-1">
          <h3 class="font-heading text-sm tracking-widest uppercase mb-1 cursor-pointer open-detail leading-tight" data-index="${prodIndex}">${p.nombre}</h3>
          <p class="font-body text-sm text-gray-500 mb-2">$${p.precio.toLocaleString('es-MX')} MXN</p>
          ${renderEstrellas(promedioResenas(p))}
          ${p.colores?.length ? `
          <div class="flex gap-1.5 mb-3">
            ${p.colores.map(c => `<span class="w-3.5 h-3.5 rounded-full border border-gray-300" style="background-color:${colorMap[c] || '#ccc'}" title="${c}"></span>`).join('')}
          </div>` : ''}
          ${!agotado ? `<button class="add-to-cart font-heading text-xs tracking-widest uppercase border border-black px-5 py-2 hover:bg-black hover:text-white transition-colors duration-300 mt-auto"
            data-nombre="${p.nombre}"
            data-precio="${p.precio}"
            data-imagen="${img}"
            data-descripcion="${p.descripcion || ''}"
            data-color="${p.colores?.[0] || ''}">
          Agregar
        </button>` : ''}
      </div>
      </div>
    `
  }).join('')
}

function renderEstrellas(puntuacion) {
  if (!puntuacion) return ''
  const full = Math.round(puntuacion)
  return `
    <div class="flex items-center gap-0.5 mb-2">
      ${Array.from({ length: 5 }, (_, i) =>
        i < full
          ? '<svg class="w-3 h-3 text-amber-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>'
          : '<svg class="w-3 h-3 text-gray-200" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>'
      ).join('')}
    </div>`
}

function promedioResenas(p) {
  if (!p.resenas || p.resenas.length === 0) return null
  const avg = p.resenas.reduce((s, r) => s + r.puntuacion, 0) / p.resenas.length
  return Math.round(avg)
}

// ─── Testimonios ───

const testimonios = [
  { texto: '"Excelente calidad, el cuero se siente premium. Mi billetera favorita."', autor: '— Carlos G.' },
  { texto: '"Compré el tarjetero y me encantó. Minimalista y súper práctico."', autor: '— Ana M.' },
  { texto: '"El diseño es exactamente lo que buscaba. Llegó antes de lo esperado."', autor: '— Luis R.' },
  { texto: '"Hecho a mano con detalles que se notan. Sin duda volveré a comprar."', autor: '— Sofía P.' },
  { texto: '"La mejor calidad que he encontrado en productos de cuero mexicanos."', autor: '— Diego H.' },
  { texto: '"Me regalaron un tarjetero y ahora toda mi familia quiere uno."', autor: '— Mariana L.' },
]

function renderTestimonios() {
  const track = document.getElementById('testimonios-track')
  if (!track || track.dataset.rendered) return
  track.dataset.rendered = '1'
  if (track.children.length > 0) return

  const cards = testimonios.map(t => `
    <div class="flex-shrink-0 w-[280px] sm:w-[320px] bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition-shadow duration-300 min-h-[200px]">
      <div>
        <div class="flex items-center gap-0.5 mb-3">
          <svg class="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          <svg class="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          <svg class="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          <svg class="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          <svg class="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        </div>
        <p class="font-body text-sm text-gray-700 leading-relaxed mb-4">${t.texto}</p>
      </div>
      <p class="font-heading text-xs tracking-widest uppercase text-gray-500">${t.autor}</p>
    </div>
  `).join('')
  track.innerHTML = cards + cards
}

// ─── Carrito ───

const colorMap = {
  'verde': '#4a7c59',
  'gris': '#8c8c8c',
  'vino': '#722f37',
  'cafe oscuro': '#4a3728',
}

let cart = JSON.parse(localStorage.getItem('espina-cart') || '[]')

const cartPanel = document.getElementById('cart-panel')
const cartOverlay = document.getElementById('cart-overlay')
const cartItems = document.getElementById('cart-items')
const cartFooter = document.getElementById('cart-footer')
const cartTotal = document.getElementById('cart-total')
const cartCount = document.getElementById('cart-count')
const cartBtn = document.getElementById('cart-btn')
const cartClose = document.getElementById('cart-close')
const checkoutBtn = document.getElementById('checkout-btn')
const cartEmail = document.getElementById('cart-email')

function loadEmail() {
  const saved = localStorage.getItem('espina-email')
  if (saved && cartEmail) cartEmail.value = saved
}

function saveEmail() {
  if (cartEmail) localStorage.setItem('espina-email', cartEmail.value.trim())
}

cartEmail?.addEventListener('input', saveEmail)
loadEmail()

function saveCart() {
  localStorage.setItem('espina-cart', JSON.stringify(cart))
  updateCartUI()
}

function isPromoActiva() {
  return true
}

function updateCartUI() {
  const count = cart.reduce((s, i) => s + i.cantidad, 0)
  cartCount.textContent = count
  cartCount.classList.toggle('hidden', count === 0)

  const envioSection = document.getElementById('envio-section')
  const giftSection = document.getElementById('gift-section')
  const timelineSection = document.getElementById('timeline-section')

  if (cart.length === 0) {
    cartItems.innerHTML = `
      <p class="text-sm text-gray-500 text-center pt-10 pb-6">Tu carrito está vacío</p>
      <div class="text-center">
        <a href="/tienda" data-nav class="inline-block font-heading text-xs tracking-widest uppercase border-2 border-black px-8 py-3 hover:bg-black hover:text-white transition-colors duration-300">Ver productos</a>
      </div>`
    cartFooter.classList.add('hidden')
    envioSection?.classList.add('hidden')
    giftSection?.classList.add('hidden')
    timelineSection?.classList.add('hidden')
    return
  }

  cartFooter.classList.remove('hidden')
  envioSection?.classList.remove('hidden')
  giftSection?.classList.remove('hidden')
  timelineSection?.classList.remove('hidden')
  cartItems.innerHTML = cart.map((item, i) => {
    const itemStock = item.stock
    const itemStockBajo = typeof itemStock === 'number' && itemStock <= 3
    return `
    <div class="flex gap-4 pb-4 border-b border-gray-100">
      ${item.imagen ? `<img src="${item.imagen}" alt="${item.nombre}" class="w-20 h-20 object-cover bg-[#F5F5F5]" />` : ''}
      <div class="flex-1 min-w-0">
        <h4 class="font-heading text-xs tracking-widest uppercase truncate">${item.nombre}</h4>
        ${item.color ? `<p class="font-body text-xs text-gray-400 mt-0.5">Color: ${item.color}</p>` : ''}
        ${itemStockBajo ? `<p class="font-heading text-[10px] tracking-wider uppercase text-[#DC2626] mt-0.5">🔥 Solo quedan ${itemStock}</p>` : ''}
        <p class="text-sm text-gray-500 mt-1">$${(item.precio * item.cantidad).toLocaleString('es-MX')} MXN</p>
        <div class="flex items-center gap-3 mt-2">
          <button class="qty-minus text-xs border border-gray-300 w-6 h-6 rounded" data-index="${i}">−</button>
          <span class="text-sm">${item.cantidad}</span>
          <button class="qty-plus text-xs border border-gray-300 w-6 h-6 rounded" data-index="${i}">+</button>
          <button class="ml-auto text-xs text-gray-400 hover:text-black transition-colors remove-item" data-index="${i}">Eliminar</button>
        </div>
      </div>
    </div>
  `}).join('')

  const subtotal = cart.reduce((s, i) => s + i.precio * i.cantidad, 0)
  const promo = isPromoActiva()
  const descuento = promo ? Math.round(subtotal * 0.2) : 0
  const total = subtotal - descuento

  let html = `
    <div class="flex justify-between mb-1 text-sm">
      <span class="font-heading tracking-wider uppercase">Subtotal</span>
      <span class="font-body">$${subtotal.toLocaleString('es-MX')} MXN</span>
    </div>`

  if (promo && descuento > 0) {
    html += `
    <div class="flex justify-between mb-1 text-sm text-[#DC2626]">
      <span class="font-heading tracking-wider uppercase">🔥 20% OFF</span>
      <span class="font-body">−$${descuento.toLocaleString('es-MX')} MXN</span>
    </div>
    <div class="flex justify-between mb-2 text-[10px] text-[#DC2626]/80">
      <span class="font-heading tracking-wider uppercase">⏱ Vence en</span>
      <span class="font-body font-mono" id="cart-countdown">--:--:--</span>
    </div>`
  }

  html += `
    <div class="flex justify-between mb-5 pb-4 border-b border-gray-100 text-sm">
      <span class="font-heading tracking-wider uppercase">Total</span>
      <span class="font-heading">$${total.toLocaleString('es-MX')} MXN</span>
    </div>`

  cartFooter.querySelector('.cart-totals').innerHTML = html

  // ─── Envío gratis ───
  const envioMeta = 999
  const envioProgreso = Math.min(subtotal / envioMeta, 1)
  const envioBar = document.getElementById('envio-progress')
  const envioIcon = document.getElementById('envio-icon')
  const envioTexto = document.getElementById('envio-texto')

  envioBar.style.width = `${envioProgreso * 100}%`

  if (subtotal >= envioMeta) {
    if (!envioIcon.dataset.confetti) {
      envioIcon.dataset.confetti = '1'
      lanzarConfetti()
    }
    envioIcon.className = 'w-7 h-7 flex items-center justify-center rounded-full bg-green-500 border-2 border-green-500 flex-shrink-0 transition-all duration-500'
    envioIcon.innerHTML = '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>'
    envioTexto.textContent = '🎉 ¡Envío gratis!'
    envioTexto.className = 'font-heading text-xs tracking-widest uppercase text-green-600 mt-2'
  } else {
    delete envioIcon.dataset.confetti
    const falta = envioMeta - subtotal
    envioIcon.className = 'w-7 h-7 flex items-center justify-center rounded-full border-2 border-gray-300 flex-shrink-0 transition-all duration-500'
    envioIcon.innerHTML = `<svg class="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`
    envioTexto.textContent = `Falta $${falta.toLocaleString('es-MX')} MXN para envío gratis`
    envioTexto.className = 'font-body text-xs text-gray-500 mt-2'
  }
}

function lanzarConfetti() {
  sonidoConfetti()
  const colores = ['#D4A574', '#22c55e', '#3b82f6', '#eab308', '#ec4899', '#a855f7', '#f97316']
  const contenedor = document.getElementById('cart-panel')
  if (!contenedor) return
  for (let i = 0; i < 80; i++) {
    const pieza = document.createElement('div')
    const color = colores[Math.floor(Math.random() * colores.length)]
    const size = Math.random() * 8 + 4
    const isCircle = Math.random() > 0.5
    pieza.style.cssText = `
      position: fixed; z-index: 9999; pointer-events: none;
      width: ${size}px; height: ${isCircle ? size : size * 0.5}px;
      background: ${color};
      border-radius: ${isCircle ? '50%' : '2px'};
      top: ${Math.random() * 40 + 15}%;
      left: ${Math.random() * 90 + 5}%;
      opacity: 1;
      animation: confetti-fall ${Math.random() * 1.2 + 1.2}s ease-out forwards;
      animation-delay: ${Math.random() * 0.6}s;
      transform: rotate(${Math.random() * 360}deg);
    `
    document.body.appendChild(pieza)
    pieza.addEventListener('animationend', () => pieza.remove())
  }
}

let audioCtx = null
let audioSessionReady = false

function ensureAudioSession() {
  if (audioSessionReady) return
  audioSessionReady = true
  try {
    const el = document.createElement('audio')
    el.setAttribute('playsinline', '')
    const rate = 8000, freq = 220, dur = 0.1, vol = 0.01
    const samples = Math.floor(rate * dur)
    const buf = new ArrayBuffer(44 + samples)
    const view = new DataView(buf)
    const write = (off, str) => { for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)) }
    write(0, 'RIFF')
    view.setUint32(4, 36 + samples, true)
    write(8, 'WAVE')
    write(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, 1, true)
    view.setUint32(24, rate, true)
    view.setUint32(28, rate, true)
    view.setUint16(32, 1, true)
    view.setUint16(34, 8, true)
    write(36, 'data')
    view.setUint32(40, samples, true)
    for (let i = 0; i < samples; i++) {
      const val = Math.sin(2 * Math.PI * freq * i / rate) * vol
      view.setUint8(44 + i, Math.round((val + 1) * 127.5))
    }
    const blob = new Blob([buf], { type: 'audio/wav' })
    el.src = URL.createObjectURL(blob)
    el.play().then(() => {
      setTimeout(() => URL.revokeObjectURL(el.src), 2000)
    }).catch(() => {})
  } catch {}
}

function initAudio() {
  ensureAudioSession()
  const Ctor = window.AudioContext || window.webkitAudioContext
  if (!Ctor) return null
  if (audioCtx && audioCtx.state !== 'closed') {
    if (audioCtx.state === 'suspended') audioCtx.resume()
    return audioCtx
  }
  audioCtx = new Ctor()
  audioCtx.resume()
  try {
    const o = audioCtx.createOscillator()
    const g = audioCtx.createGain()
    o.type = 'sine'
    o.frequency.value = 440
    g.gain.setValueAtTime(0.001, audioCtx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.05)
    o.connect(g)
    g.connect(audioCtx.destination)
    o.start()
    o.stop(audioCtx.currentTime + 0.05)
  } catch {}
  return audioCtx
}

function sonidoConfetti() {
  try {
    const ctx = initAudio()
    if (!ctx || ctx.state !== 'running') return
    const notas = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5]
    notas.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.08)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.5)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(ctx.currentTime + i * 0.08)
      osc.stop(ctx.currentTime + i * 0.08 + 0.5)
    })
    const ruido = ctx.createBufferSource()
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.25, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.04))
    ruido.buffer = buf
    const gRuido = ctx.createGain()
    gRuido.gain.setValueAtTime(0.12, ctx.currentTime)
    gRuido.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)
    ruido.connect(gRuido)
    gRuido.connect(ctx.destination)
    ruido.start(ctx.currentTime)
    const o2 = ctx.createOscillator()
    const g2 = ctx.createGain()
    o2.type = 'sine'
    o2.frequency.value = 1567.98
    g2.gain.setValueAtTime(0.08, ctx.currentTime + 0.5)
    g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)
    o2.connect(g2)
    g2.connect(ctx.destination)
    o2.start(ctx.currentTime + 0.5)
    o2.stop(ctx.currentTime + 0.8)
  } catch {}
}

function openCart() {
  cartPanel.style.display = 'flex'
  cartOverlay.style.display = 'block'
  requestAnimationFrame(() => {
    cartPanel.classList.remove('translate-x-full')
  })
}

function closeCart() {
  cartPanel.classList.add('translate-x-full')
  cartOverlay.style.display = 'none'
  setTimeout(() => { cartPanel.style.display = 'none' }, 300)
}

function gtagEvent(...args) {
  if (typeof gtag === 'function') gtag(...args)
}

function addToCart(nombre, precio, imagen, descripcion, color) {
  ensureAudioSession()
  initAudio()
  color = color || ''
  const prod = productos.find(p => p.nombre === nombre)
  const stock = prod ? prod.stock : 'disponible'
  const exist = cart.find(i => i.nombre === nombre && i.color === color)
  if (exist) {
    exist.cantidad++
  } else {
    cart.push({ nombre, precio, imagen, descripcion, color, cantidad: 1, stock })
  }
  saveCart()
  openCart()
  gtagEvent('event', 'add_to_cart', {
    currency: 'MXN',
    value: precio,
    items: [{ item_name: nombre, price: precio, quantity: 1 }]
  })
}

// ─── Detalle de producto ───

const productModal = document.getElementById('product-modal')
const productModalOverlay = document.getElementById('product-modal-overlay')
const productModalClose = document.getElementById('product-modal-close')
const productModalImage = document.getElementById('product-modal-image')
const productModalName = document.getElementById('product-modal-name')
const productModalPrice = document.getElementById('product-modal-price')
const productModalDesc = document.getElementById('product-modal-desc')
const productModalMeta = document.getElementById('product-modal-meta')
const productModalAdd = document.getElementById('product-modal-add')
let colorSeleccionado = ''

let fotoActual = 0

function openDetail(producto) {
  const fotos = producto.fotos?.filter(Boolean) || []
  const img = fotos[0] || ''
  const agotado = producto.stock === 'agotado'

  fotoActual = 0

  function renderFoto(index) {
    const f = fotos[index]
    if (f) {
      productModalImage.innerHTML = `<img src="${f}" alt="${producto.nombre}" class="w-full h-full object-cover transition-opacity duration-300" />`
    } else {
      productModalImage.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-300"><svg class="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg></div>'
    }

    const thumbsEl = document.getElementById('product-modal-thumbs')
    if (fotos.length > 1) {
      thumbsEl.innerHTML = fotos.map((f, fi) => `
        <button class="thumb-btn flex-shrink-0 w-14 h-14 rounded border-2 overflow-hidden transition-all duration-200 ${fi === index ? 'border-black' : 'border-gray-200 hover:border-gray-400'}" data-foto-index="${fi}">
          <img src="${f}" alt="" class="w-full h-full object-cover" />
        </button>
      `).join('')
      thumbsEl.style.display = 'flex'
    } else {
      thumbsEl.style.display = 'none'
    }
  }

  renderFoto(0)

  productModalName.textContent = producto.nombre
  productModalPrice.textContent = `$${producto.precio.toLocaleString('es-MX')} MXN`
  productModalDesc.textContent = producto.descripcion || ''

  const coloresEl = document.getElementById('product-modal-colores')
  const swatchesEl = document.getElementById('color-swatches')

  if (producto.colores && producto.colores.length > 0) {
    coloresEl.classList.remove('hidden')
    colorSeleccionado = producto.colores[0]
    swatchesEl.innerHTML = producto.colores.map(c => {
      const hex = colorMap[c] || '#ccc'
      return `
        <button class="color-btn w-8 h-8 rounded-full border-2 transition-all duration-200 ${c === colorSeleccionado ? 'border-black scale-110' : 'border-gray-200 hover:border-gray-400'}"
          style="background-color:${hex}"
          data-color="${c}"
          title="${c}">
          <span class="sr-only">${c}</span>
        </button>
      `
    }).join('')
  } else {
    coloresEl.classList.add('hidden')
  }

  let metaHTML = ''
  if (producto.materiales) metaHTML += `<p><span class="font-heading text-xs tracking-widest uppercase text-black">Materiales:</span> ${producto.materiales}</p>`
  if (producto.tiempo_fabricacion) metaHTML += `<p><span class="font-heading text-xs tracking-widest uppercase text-black">Fabricación:</span> ${producto.tiempo_fabricacion}</p>`
  if (producto.stock) {
    const estados = { disponible: 'Disponible', agotado: 'Agotado', 'bajo-pedido': 'Bajo pedido' }
    metaHTML += `<p><span class="font-heading text-xs tracking-widest uppercase text-black">Stock:</span> ${estados[producto.stock] || producto.stock}</p>`
  }
  productModalMeta.innerHTML = metaHTML

  gtagEvent('event', 'view_item', {
    currency: 'MXN',
    value: producto.precio,
    items: [{ item_name: producto.nombre, price: producto.precio, item_category: producto.categoria }]
  })

  const reviewsEl = document.getElementById('product-modal-reviews')
  const resenas = producto.resenas
  if (resenas && resenas.length > 0) {
    reviewsEl.innerHTML = `
      <p class="font-heading text-xs tracking-widest uppercase text-black mb-3">Reseñas</p>
      <div class="space-y-3">
        ${resenas.map(r => {
          const estrellas = Array.from({ length: 5 }, (_, i) =>
            i < r.puntuacion
              ? `<svg class="w-3.5 h-3.5 text-black flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`
              : `<svg class="w-3.5 h-3.5 text-gray-300 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`
          ).join('')
          return `
            <div class="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
              <div class="flex items-center gap-2 mb-1">
                <div class="flex items-center gap-0.5">${estrellas}</div>
                <span class="font-heading text-[11px] tracking-wider uppercase text-black">${r.nombre}</span>
                ${r.fecha ? `<span class="font-body text-[10px] text-gray-400">${r.fecha}</span>` : ''}
              </div>
              <p class="font-body text-xs text-gray-600 leading-relaxed">${r.texto}</p>
            </div>
          `
        }).join('')}
      </div>
      <button id="toggle-review-btn" class="mt-3 font-heading text-[10px] tracking-widest uppercase border border-black px-4 py-2 hover:bg-black hover:text-white transition-colors duration-300">
        Dejar reseña
      </button>
    `
    reviewsEl.classList.remove('hidden')
  } else {
    reviewsEl.innerHTML = `<button id="toggle-review-btn" class="font-heading text-[10px] tracking-widest uppercase border border-black px-4 py-2 hover:bg-black hover:text-white transition-colors duration-300">
      Dejar reseña
    </button>`
    reviewsEl.classList.remove('hidden')
  }

  productModalAdd.disabled = agotado
  productModalAdd.textContent = agotado ? 'Agotado' : 'Agregar al carrito'
  productModalAdd.className = `w-full font-heading text-sm tracking-widest uppercase border-2 px-10 py-3 transition-colors duration-300 ${agotado ? 'border-gray-300 text-gray-300 cursor-not-allowed' : 'border-black hover:bg-black hover:text-white cursor-pointer'}`

  productModalAdd.onclick = () => {
    if (!agotado) {
      addToCart(producto.nombre, producto.precio, img, producto.descripcion || '', colorSeleccionado)
      closeDetail()
    }
  }

  productModal.style.display = 'flex'
  document.body.style.overflow = 'hidden'
}

function closeDetail() {
  productModal.style.display = 'none'
  document.body.style.overflow = ''
  const zoomOverlay = document.getElementById('image-zoom-overlay')
  if (zoomOverlay) zoomOverlay.style.display = 'none'
  const form = document.getElementById('product-modal-review-form')
  if (form) {
    form.classList.add('hidden')
    document.getElementById('review-name').value = ''
    document.getElementById('review-text').value = ''
    document.querySelectorAll('.review-star').forEach(b => {
      b.classList.add('text-gray-300')
      b.classList.remove('text-black')
    })
    const starsEl = document.getElementById('review-stars')
    delete starsEl.dataset.selected
    const feedback = document.getElementById('review-feedback')
    feedback.classList.add('hidden')
  }
}

document.addEventListener('click', e => {
  const link = e.target.closest('[data-nav]')
  if (link) {
    e.preventDefault()
    const href = link.getAttribute('href')
    navigate(href)
    window.history.pushState({}, '', href)
    return
  }
  if (e.target.closest('#menu-btn')) { toggleMenu(); return }
  if (e.target.closest('#menu-close')) { closeMenu(); return }

  if (e.target.closest('#cart-btn')) {
    openCart()
    return
  }

  if (e.target.closest('#cart-close') || e.target.closest('#cart-overlay')) {
    closeCart()
  }

  if (e.target.closest('#product-modal-close') || e.target.closest('#product-modal-overlay')) {
    closeDetail()
  }

  const modalImage = e.target.closest('#product-modal-image')
  if (modalImage) {
    const img = modalImage.querySelector('img')
    if (img && img.src) {
      document.getElementById('image-zoom-img').src = img.src
      document.getElementById('image-zoom-overlay').style.display = 'flex'
      document.body.style.overflow = 'hidden'
    }
  }

  const zoomOverlay = e.target.closest('#image-zoom-overlay')
  if (zoomOverlay && e.target === zoomOverlay) {
    document.getElementById('image-zoom-overlay').style.display = 'none'
    document.body.style.overflow = ''
  }
  if (e.target.closest('#image-zoom-close')) {
    document.getElementById('image-zoom-overlay').style.display = 'none'
    document.body.style.overflow = ''
  }

  const detailTrigger = e.target.closest('.open-detail')
  if (detailTrigger) {
    const idx = parseInt(detailTrigger.dataset.index)
    const producto = productos[idx]
    if (producto) openDetail(producto)
  }

  const thumbBtn = e.target.closest('.thumb-btn')
  if (thumbBtn) {
    const fi = parseInt(thumbBtn.dataset.fotoIndex)
    const thumbs = document.querySelectorAll('.thumb-btn')
    thumbs.forEach((t, i) => {
      t.classList.toggle('border-black', i === fi)
      t.classList.toggle('border-gray-200', i !== fi)
      t.classList.toggle('hover:border-gray-400', i !== fi)
    })
    const fotosEl = document.getElementById('product-modal-image')
    const img = thumbBtn.querySelector('img')?.src
    if (img) fotosEl.innerHTML = `<img src="${img}" alt="" class="w-full h-full object-cover transition-opacity duration-300" />`
  }

  const colorBtn = e.target.closest('.color-btn')
  if (colorBtn) {
    document.querySelectorAll('.color-btn').forEach(b => {
      b.classList.remove('border-black', 'scale-110')
      b.classList.add('border-gray-200', 'hover:border-gray-400')
    })
    colorBtn.classList.remove('border-gray-200', 'hover:border-gray-400')
    colorBtn.classList.add('border-black', 'scale-110')
    colorSeleccionado = colorBtn.dataset.color
  }

  if (e.target.closest('#checkout-btn')) {
    checkoutBtn.disabled = true
    checkoutBtn.textContent = 'Procesando…'
    iniciarCheckout()
  }

  const addBtn = e.target.closest('.add-to-cart')
  if (addBtn) {
    addToCart(
      addBtn.dataset.nombre,
      parseFloat(addBtn.dataset.precio),
      addBtn.dataset.imagen,
      addBtn.dataset.descripcion,
      addBtn.dataset.color || ''
    )
  }

  const minus = e.target.closest('.qty-minus')
  if (minus) {
    const i = parseInt(minus.dataset.index)
    cart[i].cantidad--
    if (cart[i].cantidad <= 0) cart.splice(i, 1)
    saveCart()
  }

  const plus = e.target.closest('.qty-plus')
  if (plus) {
    const i = parseInt(plus.dataset.index)
    cart[i].cantidad++
    saveCart()
  }

  const remove = e.target.closest('.remove-item')
  if (remove) {
    const i = parseInt(remove.dataset.index)
    const item = cart[i]
    if (item) {
      gtagEvent('event', 'remove_from_cart', {
        currency: 'MXN',
        value: item.precio * item.cantidad,
        items: [{ item_name: item.nombre, price: item.precio, quantity: item.cantidad }]
      })
    }
    cart.splice(i, 1)
    saveCart()
  }

  if (e.target.closest('#toggle-review-btn')) {
    const form = document.getElementById('product-modal-review-form')
    form.classList.toggle('hidden')
  }

  if (e.target.closest('#review-cancel')) {
    document.getElementById('product-modal-review-form').classList.add('hidden')
  }

  const starBtn = e.target.closest('.review-star')
  if (starBtn) {
    const val = parseInt(starBtn.dataset.val)
    document.querySelectorAll('.review-star').forEach(b => {
      const bv = parseInt(b.dataset.val)
      b.classList.toggle('text-black', bv <= val)
      b.classList.toggle('text-gray-300', bv > val)
    })
    document.getElementById('review-stars').dataset.selected = val
  }

  if (e.target.closest('#review-submit')) {
    const form = document.getElementById('product-modal-review-form')
    const producto = document.getElementById('product-modal-name')?.textContent || ''
    const nombre = document.getElementById('review-name')?.value.trim()
    const texto = document.getElementById('review-text')?.value.trim()
    const starsEl = document.getElementById('review-stars')
    const puntuacion = parseInt(starsEl?.dataset?.selected || '0')
    const feedback = document.getElementById('review-feedback')

    if (!nombre || !texto || puntuacion === 0) {
      feedback.textContent = 'Completa todos los campos y selecciona una puntuación.'
      feedback.className = 'font-body text-xs mt-2 text-red-500'
      feedback.classList.remove('hidden')
      return
    }

    const btn = document.getElementById('review-submit')
    btn.disabled = true
    btn.textContent = 'Enviando…'

    fetch('/api/submit-review', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ producto, nombre, puntuacion, texto }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          feedback.textContent = '¡Gracias! Tu reseña será revisada y publicada pronto.'
          feedback.className = 'font-body text-xs mt-2 text-green-600'
          feedback.classList.remove('hidden')
          document.getElementById('review-name').value = ''
          document.getElementById('review-text').value = ''
          document.querySelectorAll('.review-star').forEach(b => {
            b.classList.add('text-gray-300')
            b.classList.remove('text-black')
          })
          delete starsEl.dataset.selected
          setTimeout(() => form.classList.add('hidden'), 2500)
        } else {
          throw new Error(data.error || 'Error al enviar')
        }
      })
      .catch(() => {
        feedback.textContent = 'Error al enviar. Intenta de nuevo o escríbenos por WhatsApp.'
        feedback.className = 'font-body text-xs mt-2 text-red-500'
        feedback.classList.remove('hidden')
      })
      .finally(() => {
        btn.disabled = false
        btn.textContent = 'Enviar reseña'
      })
  }
})

// ─── Página Gracias ───

function renderGracias() {
  const raw = sessionStorage.getItem('ultimo_pedido')
  const container = document.getElementById('gracias-items')
  const ref = document.getElementById('order-ref')
  const emailEl = document.getElementById('order-email')
  if (!container) return
  if (!raw) {
    container.innerHTML = ''
    if (ref) ref.textContent = ''
    if (emailEl) emailEl.textContent = ''
    return
  }
  const pedido = JSON.parse(raw)
  const email = pedido.email || ''
  if (ref) ref.textContent = `${pedido.session_id ? `Pedido: ${pedido.session_id}` : ''}${pedido.fecha ? `  •  ${pedido.fecha}` : ''}`
  if (emailEl) emailEl.textContent = email ? `📧 ${email}` : ''
  container.innerHTML = pedido.items.map(i => `
    <div class="flex items-center gap-4 text-sm">
      <div class="w-14 h-14 bg-[#F5F5F5] flex-shrink-0 flex items-center justify-center overflow-hidden">
        ${i.imagen ? `<img src="${i.imagen}" alt="${i.nombre}" class="w-full h-full object-cover" />` : `<span class="font-heading text-[10px] tracking-widest uppercase text-gray-400">ED</span>`}
      </div>
      <div class="flex-1 min-w-0">
        <p class="font-heading text-xs tracking-widest uppercase truncate">${i.nombre}</p>
        <p class="font-body text-xs text-gray-500">${i.color || ''} × ${i.cantidad}</p>
      </div>
      <p class="font-heading text-xs tracking-widest">$${(i.precio * i.cantidad).toLocaleString('es-MX')}</p>
    </div>
  `).join('')
  gtagEvent('event', 'purchase', {
    transaction_id: pedido.session_id || '',
    value: pedido.items.reduce((t, i) => t + (i.precio || 0) * (i.cantidad || 0), 0),
    currency: 'MXN',
    items: pedido.items.map(i => ({ item_name: i.nombre, price: i.precio, quantity: i.cantidad }))
  })
}

async function iniciarCheckout() {
  try {
    const email = cartEmail ? cartEmail.value.trim() : ''
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      cartEmail?.focus()
      cartEmail?.classList.add('border-red-400')
      setTimeout(() => cartEmail?.classList.remove('border-red-400'), 2000)
      checkoutBtn.disabled = false
      checkoutBtn.textContent = 'Pagar ahora'
      return
    }
    saveEmail()
    gtagEvent('event', 'begin_checkout', {
      currency: 'MXN',
      value: cart.reduce((t, i) => t + i.precio * i.cantidad, 0),
      items: cart.map(i => ({ item_name: i.nombre, price: i.precio, quantity: i.cantidad }))
    })
    const promo = isPromoActiva()
    const res = await fetch('/api/create-checkout', {
      method: 'POST',
      body: JSON.stringify({
        email,
        items: cart.map(i => ({
          nombre: i.nombre,
          precio: promo ? Math.round(i.precio * 0.8) : i.precio,
          cantidad: i.cantidad,
          color: i.color || '',
        })),
      }),
    })

    const data = await res.json()

    if (data.url) {
      window.location.href = data.url
    } else {
      throw new Error(data.error || 'Error al crear el pago')
    }
  } catch (err) {
    alert('Error al procesar el pago: ' + err.message)
    checkoutBtn.disabled = false
    checkoutBtn.textContent = 'Pagar ahora'
  }
}

updateCartUI()

// ─── Éxito / Cancelado ───

const params = new URLSearchParams(window.location.search)
const sesionId = params.get('session_id')

if (params.get('exito') === '1') {
  sessionStorage.setItem('ultimo_pedido', JSON.stringify({
    items: [...cart],
    session_id: sesionId,
    fecha: new Date().toLocaleDateString('es-MX'),
    email: localStorage.getItem('espina-email') || '',
  }))
  cart = []
  saveCart()
  window.history.replaceState({}, '', '/gracias')
}

if (params.get('cancelado') === '1') {
  window.history.replaceState({}, '', '/tienda')
}

// ─── Navegar primero, luego recuperar carrito ───
navigate(window.location.pathname)

function getCookie(name) {
  const match = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)')
  return match ? decodeURIComponent(match[2]) : null
}

let recoveryRedirect = false
const cookieData = getCookie('espina_recovery')
if (cookieData) {
  try {
    const d = JSON.parse(cookieData)
    if (Array.isArray(d) && d.length > 0) { cart = d; saveCart() }
  } catch {}
  document.cookie = 'espina_recovery=; path=/; max-age=0; SameSite=Lax'
  window.history.replaceState({}, '', '/tienda')
  recoveryRedirect = true
}

const carritoEncoded = params.get('carrito')
if (carritoEncoded) {
  try {
    const data = JSON.parse(decodeURIComponent(carritoEncoded))
    if (data && Array.isArray(data) && data.length > 0) { cart = data; saveCart() }
  } catch {}
  window.history.replaceState({}, '', '/tienda')
  recoveryRedirect = true
}

if (recoveryRedirect) navigate(window.location.pathname)

// Safety fallback: si destacados/testimonios no se renderizaron, reintentar
setTimeout(() => {
  const d = document.getElementById('destacados-scroll')
  if (d && !d.children.length) { delete d.dataset.rendered; renderDestacados() }
  const t = document.getElementById('testimonios-track')
  if (t && !t.children.length) { delete t.dataset.rendered; renderTestimonios() }
}, 150)

// ─── Newsletter ───

document.getElementById('newsletter-form')?.addEventListener('submit', async e => {
  e.preventDefault()
  const input = document.getElementById('newsletter-email')
  const feedback = document.getElementById('newsletter-feedback')
  const email = input?.value.trim()
  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    feedback.textContent = 'Ingresa un correo válido.'
    feedback.className = 'font-body text-xs mt-3 text-red-500'
    feedback.classList.remove('hidden')
    return
  }
  const btn = e.target.querySelector('button[type="submit"]')
  btn.disabled = true
  btn.textContent = 'Enviando…'
  try {
    const res = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await res.json()
    if (data.ok) {
      feedback.textContent = '¡Gracias! Ahora recibirás nuestras novedades.'
      feedback.className = 'font-body text-xs mt-3 text-green-600'
      feedback.classList.remove('hidden')
      input.value = ''
    } else {
      throw new Error(data.error || 'Error al suscribir')
    }
  } catch (err) {
    feedback.textContent = 'Error al suscribir. ¿Ya estás registrado?'
    feedback.className = 'font-body text-xs mt-3 text-red-500'
    feedback.classList.remove('hidden')
  }
  btn.disabled = false
  btn.textContent = 'Suscribirme'
})

// ─── Promo Timer ───

function updatePromoTimer() {
  const bar = document.getElementById('promo-bar')
  const hoursEl = document.getElementById('promo-hours')
  const minsEl = document.getElementById('promo-minutes')
  const secsEl = document.getElementById('promo-seconds')
  const text = document.getElementById('promo-text')
  const subtext = document.getElementById('promo-subtext')
  if (!bar) return

  const now = new Date()
  const h = now.getHours()
  const m = now.getMinutes()
  const s = now.getSeconds()
  const remaining = (23 - h) * 3600 + (59 - m) * 60 + (60 - s)

  hoursEl.textContent = String(Math.floor(remaining / 3600)).padStart(2, '0')
  minsEl.textContent = String(Math.floor((remaining % 3600) / 60)).padStart(2, '0')
  secsEl.textContent = String(remaining % 60).padStart(2, '0')
  const cartCountdown = document.getElementById('cart-countdown')
  if (cartCountdown) {
    cartCountdown.textContent = `${String(Math.floor(remaining / 3600)).padStart(2, '0')}:${String(Math.floor((remaining % 3600) / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`
  }
  text.textContent = '🔥 20% OFF'
  if (subtext) subtext.textContent = 'SOLO POR HOY'
  bar.classList.remove('hidden')
}

updatePromoTimer()
setInterval(updatePromoTimer, 1000)

// ─── Scroll header ───

let ticking = false
window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(() => {
      const header = document.getElementById('site-header')
      const inner = document.getElementById('header-inner')
      const logo = document.getElementById('header-logo')
      if (window.scrollY > 80) {
        header?.classList.add('scrolled')
        inner?.classList.add('scrolled')
        logo?.classList.add('scrolled')
      } else {
        header?.classList.remove('scrolled')
        inner?.classList.remove('scrolled')
        logo?.classList.remove('scrolled')
      }
      ticking = false
    })
    ticking = true
  }
})
