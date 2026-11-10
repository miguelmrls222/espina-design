import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const carpeta = join(raiz, 'src', 'data', 'productos')
const salida = join(raiz, 'src', 'data', 'catalog.generated.ts')

const archivos = readdirSync(carpeta)
  .filter(nombre => nombre.endsWith('.json'))
  .sort()

const SLUG_VALIDO = /^[a-z0-9]+(-[a-z0-9]+)*$/
const errores = []

function normalizarFotos(valor) {
  const lista = Array.isArray(valor) ? valor : typeof valor === 'string' ? [valor] : []
  return lista.map(foto => (typeof foto === 'string' ? foto.trim() : '')).filter(Boolean)
}

function leerProducto(nombreArchivo) {
  const producto = JSON.parse(readFileSync(join(carpeta, nombreArchivo), 'utf8'))
  const fotos = normalizarFotos(producto.fotos)
  if (typeof producto.slug !== 'string' || !SLUG_VALIDO.test(producto.slug)) {
    errores.push(`${nombreArchivo}: el slug "${producto.slug}" no es válido (solo minúsculas, números y guiones, ej. tarjetero-dmc)`)
  }
  if (typeof producto.nombre !== 'string' || !producto.nombre.trim()) errores.push(`${nombreArchivo}: falta el nombre`)
  if (typeof producto.precio !== 'number' || !(producto.precio > 0)) errores.push(`${nombreArchivo}: el precio debe ser un número mayor que 0`)
  for (const foto of fotos) {
    if (foto.startsWith('/') && !existsSync(join(raiz, 'public', decodeURIComponent(foto)))) {
      errores.push(`${nombreArchivo}: la imagen ${foto} no existe en public/ (revisa mayúsculas, espacios y extensión)`)
    }
  }
  return { ...producto, fotos }
}

const productos = archivos.map(leerProducto)
const repetidos = productos.map(p => p.slug).filter((slug, i, todos) => todos.indexOf(slug) !== i)
if (repetidos.length) errores.push(`slugs repetidos: ${[...new Set(repetidos)].join(', ')}`)
if (errores.length) throw new Error(`Catálogo inválido:\n - ${errores.join('\n - ')}`)

const crudo = JSON.parse(readFileSync(join(raiz, 'src', 'data', 'cross-sell.json'), 'utf8'))
const slugsCrossSell = Array.isArray(crudo) ? crudo : crudo.items
if (!Array.isArray(slugsCrossSell) || slugsCrossSell.some(slug => typeof slug !== 'string')) {
  throw new Error('cross-sell.json debe ser un arreglo de slugs o { "items": [...] }')
}

const contenido = `import type { Producto } from './types'

export const CATALOGO: readonly Producto[] = ${JSON.stringify(productos, null, 2)}

export const CROSS_SELL: readonly string[] = ${JSON.stringify(slugsCrossSell, null, 2)}
`

writeFileSync(salida, contenido)
console.log(`catalog.generated.ts: ${archivos.length} productos`)
