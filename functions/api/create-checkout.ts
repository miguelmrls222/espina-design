import {
  CANTIDAD_MAXIMA,
  LINEAS_MAXIMAS,
  MONEDA,
  buscarProductoPorSlug,
  calcularTotales,
  estaDisponible,
  isPromoActiva,
  precioUnitario,
} from '../../src/data/pricing'
import type { Producto } from '../../src/data/types'
import { AppError, exigirMismoOrigen, json, leerJson, manejar } from '../_lib/http'
import { validarMetadata } from '../_lib/metadata'
import { cotizarEnvio } from '../_lib/skydropx'
import { StripeError, crearSesion } from '../_lib/stripe'
import { validarCodigoPostal, validarCorreo, validarEntero, validarTelefono } from '../_lib/validate'

interface LineaPedido {
  producto: Producto
  color: string
  cantidad: number
}

function parsearLineas(valor: unknown): LineaPedido[] {
  if (!Array.isArray(valor) || valor.length === 0) {
    throw new AppError(400, 'carrito_vacio', 'Tu carrito está vacío.')
  }
  if (valor.length > LINEAS_MAXIMAS) {
    throw new AppError(400, 'carrito_grande', `Tu carrito puede tener hasta ${LINEAS_MAXIMAS} artículos distintos.`)
  }
  const lineas = new Map<string, LineaPedido>()
  for (const crudo of valor) {
    if (typeof crudo !== 'object' || crudo === null) {
      throw new AppError(400, 'item_invalido', 'Hay un artículo inválido en tu carrito.')
    }
    const { slug, color, cantidad } = crudo as Record<string, unknown>
    if (typeof slug !== 'string') {
      throw new AppError(400, 'item_invalido', 'Hay un artículo inválido en tu carrito.')
    }
    const producto = buscarProductoPorSlug(slug)
    if (!producto) {
      throw new AppError(400, 'producto_desconocido', 'Uno de los productos de tu carrito ya no está disponible.')
    }
    if (!estaDisponible(producto)) {
      throw new AppError(409, 'agotado', `${producto.nombre} está agotado.`)
    }
    const colores = producto.colores ?? []
    const colorElegido = typeof color === 'string' ? color.trim() : ''
    if (colores.length > 0 && !colores.includes(colorElegido)) {
      throw new AppError(400, 'color_invalido', `Selecciona un color válido para ${producto.nombre}.`)
    }
    const colorFinal = colores.length > 0 ? colorElegido : ''
    const unidades = validarEntero(cantidad, 'La cantidad', 1, CANTIDAD_MAXIMA)
    const clave = `${producto.slug}|${colorFinal}`
    const previa = lineas.get(clave)
    const total = (previa?.cantidad ?? 0) + unidades
    if (total > CANTIDAD_MAXIMA) {
      throw new AppError(400, 'cantidad_excedida', `Máximo ${CANTIDAD_MAXIMA} piezas por artículo.`)
    }
    lineas.set(clave, { producto, color: colorFinal, cantidad: total })
  }
  return [...lineas.values()]
}

export const onRequest = manejar(['POST'], async ({ request, env }) => {
  exigirMismoOrigen(request)
  const cuerpo = await leerJson(request)

  const email = validarCorreo(cuerpo.email)
  const telefono = validarTelefono(cuerpo.telefono)
  const codigoPostal = validarCodigoPostal(cuerpo.zip_to)
  const lineas = parsearLineas(cuerpo.items)

  const ahora = Date.now()
  const promoActiva = isPromoActiva(ahora)
  if (typeof cuerpo.promo === 'boolean' && cuerpo.promo !== promoActiva) {
    throw new AppError(
      409,
      'promo_cambio',
      promoActiva
        ? 'La promoción sigue activa. Actualizamos tu total, revísalo e intenta pagar de nuevo.'
        : 'La promoción terminó. Actualizamos tu total, revísalo e intenta pagar de nuevo.',
    )
  }

  const totales = calcularTotales(
    lineas.map(linea => ({ precio: linea.producto.precio, cantidad: linea.cantidad })),
    ahora,
  )

  const tarifa = await cotizarEnvio(env, codigoPostal)
  const costoEnvio = totales.envioGratis ? 0 : tarifa.monto

  const metadata = validarMetadata({
    email,
    telefono,
    zip_to: codigoPostal,
    rate_id: tarifa.rateId,
    promo: promoActiva ? '1' : '0',
    envio_monto: String(costoEnvio),
    // Formato que leen el Worker de carritos abandonados y /api/recover-cart: [{ n, p, c, col }]
    cart: JSON.stringify(
      lineas.map(l => ({ n: l.producto.nombre, p: precioUnitario(l.producto.precio, ahora), c: l.cantidad, col: l.color })),
    ),
  })

  const origen = new URL(request.url).origin
  const params = new URLSearchParams()
  params.set('mode', 'payment')
  params.set('success_url', `${origen}/gracias?exito=1&session_id={CHECKOUT_SESSION_ID}`)
  params.set('cancel_url', `${origen}/tienda?cancelado=1`)
  params.set('shipping_address_collection[allowed_countries][0]', 'MX')
  params.set('custom_text[submit][message]', '🎁 Incluye un llavero totalmente 𝐆𝐑𝐀𝐓𝐈𝐒 🎁')
  params.set('customer_email', email)
  for (const [clave, valor] of Object.entries(metadata)) params.set(`metadata[${clave}]`, valor)

  lineas.forEach((linea, i) => {
    const prefijo = `line_items[${i}]`
    params.set(`${prefijo}[price_data][currency]`, MONEDA.toLowerCase())
    params.set(`${prefijo}[price_data][product_data][name]`, linea.color ? `${linea.producto.nombre} — ${linea.color}` : linea.producto.nombre)
    if (linea.producto.descripcion) {
      params.set(`${prefijo}[price_data][product_data][description]`, linea.producto.descripcion)
    }
    const foto = linea.producto.fotos?.[0]
    if (foto) {
      params.set(`${prefijo}[price_data][product_data][images][0]`, foto.startsWith('http') ? foto : `${origen}${foto}`)
    }
    params.set(`${prefijo}[price_data][unit_amount]`, String(precioUnitario(linea.producto.precio, ahora) * 100))
    params.set(`${prefijo}[quantity]`, String(linea.cantidad))
  })

  const indiceEnvio = lineas.length
  const nombreEnvio = `${totales.envioGratis ? 'Envío gratis' : 'Envío'} (${tarifa.proveedor}${tarifa.servicio ? ` — ${tarifa.servicio}` : ''})`
  params.set(`line_items[${indiceEnvio}][price_data][currency]`, MONEDA.toLowerCase())
  params.set(`line_items[${indiceEnvio}][price_data][product_data][name]`, nombreEnvio)
  params.set(`line_items[${indiceEnvio}][price_data][product_data][description]`, `Envío a CP ${codigoPostal}`)
  params.set(`line_items[${indiceEnvio}][price_data][unit_amount]`, String(costoEnvio * 100))
  params.set(`line_items[${indiceEnvio}][quantity]`, '1')

  let sesion
  try {
    sesion = await crearSesion(env, params)
  } catch (error) {
    if (error instanceof StripeError) {
      throw new AppError(
        502,
        'stripe_error',
        'No pudimos iniciar el pago. Intenta de nuevo en unos minutos.',
        `${error.status} ${error.code} ${error.message}`,
      )
    }
    throw error
  }
  if (!sesion.url) {
    throw new AppError(502, 'stripe_sin_url', 'No pudimos iniciar el pago. Intenta de nuevo en unos minutos.')
  }
  return json({ ok: true, url: sesion.url })
})
