import { CATALOGO, CROSS_SELL } from './catalog.generated'
import type { LineaPrecio, Producto, Totales } from './types'

export { CATALOGO, CROSS_SELL }
export type { LineaPrecio, Producto, Totales }

export const MONEDA = 'MXN'

export const PROMO = {
  porcentaje: 20,
  expiraEn: '2026-05-31T23:59:59-07:00',
} as const

export const ENVIO_GRATIS_MINIMO = 1250
export const CANTIDAD_MAXIMA = 10
// Con 7 líneas el JSON de metadata.cart nunca pasa de 500 caracteres (ver tests/pricing.test.ts)
export const LINEAS_MAXIMAS = 7

const PROMO_EXPIRA_MS = Date.parse(PROMO.expiraEn)

export function isPromoActiva(ahora: number = Date.now()): boolean {
  return ahora < PROMO_EXPIRA_MS
}

export function msRestantesPromo(ahora: number = Date.now()): number {
  return Math.max(0, PROMO_EXPIRA_MS - ahora)
}

export function precioUnitario(precioBase: number, ahora: number = Date.now()): number {
  if (!isPromoActiva(ahora)) return Math.round(precioBase)
  return Math.round(precioBase * (100 - PROMO.porcentaje) / 100)
}

export function calcularTotales(lineas: readonly LineaPrecio[], ahora: number = Date.now()): Totales {
  const promoActiva = isPromoActiva(ahora)
  let subtotal = 0
  let total = 0
  for (const linea of lineas) {
    subtotal += Math.round(linea.precio) * linea.cantidad
    total += precioUnitario(linea.precio, ahora) * linea.cantidad
  }
  return {
    subtotal,
    descuento: subtotal - total,
    total,
    promoActiva,
    envioGratis: total >= ENVIO_GRATIS_MINIMO,
  }
}

export function productosActivos(): Producto[] {
  return CATALOGO.filter(p => p.activo !== false)
}

export function buscarProductoPorSlug(slug: string): Producto | undefined {
  return CATALOGO.find(p => p.slug === slug && p.activo !== false)
}

function normalizar(texto: string): string {
  return texto.normalize('NFC').toLowerCase().trim()
}

export function buscarProductoPorNombre(nombre: string): Producto | undefined {
  const objetivo = normalizar(nombre)
  return CATALOGO.find(p => p.activo !== false && normalizar(p.nombre) === objetivo)
}

export function estaDisponible(producto: Producto): boolean {
  return producto.stock !== 'agotado'
}

export function formatearMonto(valor: number): string {
  return valor.toLocaleString('es-MX')
}
