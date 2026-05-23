import './style.css'

const pages = {
  '': 'inicio',
  'tienda': 'tienda',
  'nosotros': 'nosotros',
  'faq': 'faq',
  'contacto': 'contacto',
}

const menu = document.getElementById('menu-mobile')

function navigate(path) {
  const page = pages[path.replace(/^\//, '')] || 'inicio'
  document.querySelectorAll('.page-section').forEach(s => s.classList.add('hidden'))
  const section = document.getElementById(`page-${page}`)
  if (section) section.classList.remove('hidden')
  document.title = page === 'inicio'
    ? 'Espina Design — Cuero Hecho a Mano'
    : `Espina Design — ${page.charAt(0).toUpperCase() + page.slice(1)}`
  closeMenu()
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

navigate(window.location.pathname)
