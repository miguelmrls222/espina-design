import './style.css'

const pages = {
  '': 'inicio',
  'tienda': 'tienda',
  'nosotros': 'nosotros',
  'faq': 'faq',
  'contacto': 'contacto',
}

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
  document.getElementById('menu-mobile')?.classList.add('hidden')
}

function toggleMenu() {
  document.getElementById('menu-mobile')?.classList.toggle('hidden')
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
