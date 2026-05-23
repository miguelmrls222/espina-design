import './style.css'

const pages = {
  '': 'inicio',
  'tienda': 'tienda',
  'nosotros': 'nosotros',
  'faq': 'faq',
  'contacto': 'contacto',
}

const menu = document.getElementById('menu-mobile')

// ─── Routing ───

function navigate(path) {
  const page = pages[path.replace(/^\//, '')] || 'inicio'
  document.querySelectorAll('.page-section').forEach(s => s.classList.add('hidden'))
  const section = document.getElementById(`page-${page}`)
  if (section) section.classList.remove('hidden')
  document.title = page === 'inicio'
    ? 'Espina Design — Cuero Hecho a Mano'
    : `Espina Design — ${page.charAt(0).toUpperCase() + page.slice(1)}`
  closeMenu()
  if (page === 'inicio') {
    renderDestacados()
    renderTestimonios()
  }
  if (page === 'tienda') renderProductos()
}

function closeMenu() {
  if (menu) menu.style.display = 'none'
}

function toggleMenu() {
  if (!menu) return
  menu.style.display = menu.style.display === 'flex' ? 'none' : 'flex'
}

document.addEventListener('click', e => {
  const link = e.target.closest('[data-nav]')
  if (link) {
    e.preventDefault()
    const href = link.getAttribute('href')
    navigate(href)
    window.history.pushState({}, '', href)
  }
  const btn = e.target.closest('#menu-btn')
  if (btn) toggleMenu()
})

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

    return `
      <div class="group flex flex-col ${agotado ? 'opacity-50' : ''}">
        <div class="aspect-[4/5] bg-[#F5F5F5] mb-4 overflow-hidden relative cursor-pointer open-detail" data-index="${i}">
          ${img ? `<img src="${img}" alt="${p.nombre}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />` : ''}
          <div class="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300 flex items-center justify-center">
            <span class="text-white text-xs tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/60 px-4 py-2">Ver más</span>
          </div>
          ${agotado ? '<span class="absolute inset-0 flex items-center justify-center text-sm tracking-widest uppercase bg-white/70">Agotado</span>' : ''}
        </div>
        <div class="flex flex-col flex-1">
          <h3 class="font-heading text-sm tracking-widest uppercase mb-1 cursor-pointer open-detail" data-index="${i}">${p.nombre}</h3>
          <p class="font-body text-sm text-gray-500 mb-3">$${p.precio.toLocaleString('es-MX')} MXN</p>
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

  const top = productos.slice(0, 4)

  if (top.length === 0) {
    container.closest('.max-w-6xl').classList.add('hidden')
    return
  }

  container.innerHTML = top.map((p, i) => {
    const prodIndex = productos.indexOf(p)
    const img = p.fotos?.[0] ? p.fotos[0] : ''
    const agotado = p.stock === 'agotado'
    return `
      <div class="flex-shrink-0 w-[220px] sm:w-[260px] group flex flex-col ${agotado ? 'opacity-50' : ''}">
        <div class="aspect-[4/5] bg-[#F5F5F5] mb-4 overflow-hidden relative cursor-pointer open-detail" data-index="${prodIndex}">
          ${img ? `<img src="${img}" alt="${p.nombre}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />` : '<div class="w-full h-full flex items-center justify-center text-gray-300"><svg class="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg></div>'}
          <div class="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300 flex items-center justify-center">
            <span class="text-white text-xs tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/60 px-4 py-2">Ver más</span>
          </div>
          ${agotado ? '<span class="absolute inset-0 flex items-center justify-center text-sm tracking-widest uppercase bg-white/70">Agotado</span>' : ''}
        </div>
        <div class="flex flex-col flex-1">
          <h3 class="font-heading text-sm tracking-widest uppercase mb-1 truncate cursor-pointer open-detail" data-index="${prodIndex}">${p.nombre}</h3>
          <p class="font-body text-sm text-gray-500 mb-3">$${p.precio.toLocaleString('es-MX')} MXN</p>
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

  document.getElementById('destacados-prev').addEventListener('click', () => {
    container.scrollBy({ left: -280, behavior: 'smooth' })
  })
  document.getElementById('destacados-next').addEventListener('click', () => {
    container.scrollBy({ left: 280, behavior: 'smooth' })
  })
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

  const cards = testimonios.map(t => `
    <div class="flex-shrink-0 w-[280px] sm:w-[320px] bg-[#F5F5F5] p-6 flex flex-col justify-between">
      <p class="font-body text-sm text-gray-700 leading-relaxed mb-4">${t.texto}</p>
      <p class="font-heading text-xs tracking-widest uppercase text-gray-500">${t.autor}</p>
    </div>
  `).join('')

  track.innerHTML = cards + cards
}

// ─── Carrito ───

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

function saveCart() {
  localStorage.setItem('espina-cart', JSON.stringify(cart))
  updateCartUI()
}

function isPromoActiva() {
  const now = new Date()
  const h = now.getHours()
  return h >= 6 && h < 18
}

function updateCartUI() {
  const count = cart.reduce((s, i) => s + i.cantidad, 0)
  cartCount.textContent = count
  cartCount.classList.toggle('hidden', count === 0)

  if (cart.length === 0) {
    cartItems.innerHTML = '<p class="text-sm text-gray-500 text-center py-10">Tu carrito está vacío</p>'
    cartFooter.classList.add('hidden')
    return
  }

  cartFooter.classList.remove('hidden')
  cartItems.innerHTML = cart.map((item, i) => `
    <div class="flex gap-4 pb-4 border-b border-gray-100">
      ${item.imagen ? `<img src="${item.imagen}" alt="${item.nombre}" class="w-20 h-20 object-cover bg-[#F5F5F5]" />` : ''}
      <div class="flex-1 min-w-0">
        <h4 class="font-heading text-xs tracking-widest uppercase truncate">${item.nombre}</h4>
        ${item.color ? `<p class="font-body text-xs text-gray-400 mt-0.5">Color: ${item.color}</p>` : ''}
        <p class="text-sm text-gray-500 mt-1">$${(item.precio * item.cantidad).toLocaleString('es-MX')} MXN</p>
        <div class="flex items-center gap-3 mt-2">
          <button class="qty-minus text-xs border border-gray-300 w-6 h-6 rounded" data-index="${i}">−</button>
          <span class="text-sm">${item.cantidad}</span>
          <button class="qty-plus text-xs border border-gray-300 w-6 h-6 rounded" data-index="${i}">+</button>
          <button class="ml-auto text-xs text-gray-400 hover:text-black transition-colors remove-item" data-index="${i}">Eliminar</button>
        </div>
      </div>
    </div>
  `).join('')

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
    envioIcon.className = 'w-7 h-7 flex items-center justify-center rounded-full bg-green-500 border-2 border-green-500 flex-shrink-0 transition-all duration-500 scale-110'
    envioIcon.innerHTML = '<svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>'
    envioTexto.textContent = '🎉 ¡Envío gratis!'
    envioTexto.className = 'font-heading text-xs tracking-widest uppercase text-green-600 mt-2'
  } else {
    const falta = envioMeta - subtotal
    envioIcon.className = 'w-7 h-7 flex items-center justify-center rounded-full border-2 border-gray-300 flex-shrink-0 transition-all duration-500'
    envioIcon.innerHTML = `<svg class="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`
    envioTexto.textContent = `Falta $${falta.toLocaleString('es-MX')} MXN para envío gratis`
    envioTexto.className = 'font-body text-xs text-gray-500 mt-2'
  }
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

function addToCart(nombre, precio, imagen, descripcion, color) {
  color = color || ''
  const exist = cart.find(i => i.nombre === nombre && i.color === color)
  if (exist) {
    exist.cantidad++
  } else {
    cart.push({ nombre, precio, imagen, descripcion, color, cantidad: 1 })
  }
  saveCart()
  openCart()
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

function openDetail(producto) {
  const img = producto.fotos?.[0] ? producto.fotos[0] : ''
  const agotado = producto.stock === 'agotado'

  const colorMap = {
    'verde': '#4a7c59',
    'gris': '#8c8c8c',
    'vino': '#722f37',
    'cafe oscuro': '#4a3728',
  }

  productModalImage.innerHTML = img
    ? `<img src="${img}" alt="${producto.nombre}" class="w-full h-full object-cover" />`
    : '<div class="w-full h-full flex items-center justify-center text-gray-300"><svg class="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg></div>'

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
}

document.addEventListener('click', e => {
  if (e.target.closest('#cart-btn')) {
    openCart()
  }

  if (e.target.closest('#cart-close') || e.target.closest('#cart-overlay')) {
    closeCart()
  }

  if (e.target.closest('#product-modal-close') || e.target.closest('#product-modal-overlay')) {
    closeDetail()
  }

  const detailTrigger = e.target.closest('.open-detail')
  if (detailTrigger) {
    const idx = parseInt(detailTrigger.dataset.index)
    const producto = productos[idx]
    if (producto) openDetail(producto)
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
    cart.splice(i, 1)
    saveCart()
  }
})

async function iniciarCheckout() {
  try {
    const promo = isPromoActiva()
    const res = await fetch('/api/create-checkout', {
      method: 'POST',
      body: JSON.stringify({
        items: cart.map(i => ({
          nombre: i.color ? `${i.nombre} (${i.color})` : i.nombre,
          precio: promo ? Math.round(i.precio * 0.8) : i.precio,
          descripcion: i.descripcion,
          imagen: i.imagen?.startsWith('http') ? i.imagen : `https://espinadesign.com${i.imagen || ''}`,
          cantidad: i.cantidad,
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
if (params.get('exito') === '1') {
  cart = []
  saveCart()
  alert('¡Gracias por tu compra! Recibirás un correo con los detalles de tu pedido.')
  window.history.replaceState({}, '', '/')
}

if (params.get('cancelado') === '1') {
  alert('El pago fue cancelado. Puedes intentar de nuevo cuando quieras.')
  window.history.replaceState({}, '', '/tienda')
}

navigate(window.location.pathname)

// ─── Promo Timer ───

let promoActivaAnterior = null

function updatePromoTimer() {
  const bar = document.getElementById('promo-bar')
  const hoursEl = document.getElementById('promo-hours')
  const minsEl = document.getElementById('promo-minutes')
  const secsEl = document.getElementById('promo-seconds')
  const text = document.getElementById('promo-text')
  if (!bar) return

  const now = new Date()
  const h = now.getHours()
  const m = now.getMinutes()
  const s = now.getSeconds()
  const total = 12 * 3600

  if (isPromoActiva()) {
    const elapsed = (h - 6) * 3600 + m * 60 + s
    const remaining = total - elapsed
    hoursEl.textContent = String(Math.floor(remaining / 3600)).padStart(2, '0')
    minsEl.textContent = String(Math.floor((remaining % 3600) / 60)).padStart(2, '0')
    secsEl.textContent = String(remaining % 60).padStart(2, '0')
    text.textContent = '🔥 20% OFF HOY'
    bar.classList.remove('hidden')
  } else {
    hoursEl.textContent = '00'
    minsEl.textContent = '00'
    secsEl.textContent = '00'
    text.textContent = '🔥 20% OFF — Vuelve mañana a las 6:00 AM'
    bar.classList.remove('hidden')
  }

  const promoActual = isPromoActiva()
  if (promoActual !== promoActivaAnterior) {
    promoActivaAnterior = promoActual
    updateCartUI()
  }
}

updatePromoTimer()
setInterval(updatePromoTimer, 1000)
