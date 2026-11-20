import { folioDesdeSesion } from '../../src/data/folio'
import { AppError, json, manejar } from '../_lib/http'
import { StripeError, detalleEnvioDe, obtenerSesion } from '../_lib/stripe'

// Datos NO sensibles para el ticket de confirmación. El id de sesión de Stripe
// es el comprobante de acceso; no se devuelve calle ni teléfono.
export const onRequest = manejar(['GET'], async ({ request, env }) => {
  const id = new URL(request.url).searchParams.get('session_id') ?? ''
  let sesion
  try {
    sesion = await obtenerSesion(env, id)
  } catch (error) {
    if (error instanceof StripeError) {
      throw new AppError(404, 'pedido_no_encontrado', 'No encontramos ese pedido.', `${error.status} ${error.code}`)
    }
    throw error
  }
  if (sesion.payment_status !== 'paid') {
    throw new AppError(404, 'pedido_no_pagado', 'No encontramos ese pedido.')
  }

  const total = Math.round((sesion.amount_total ?? 0) / 100)
  const envio = Math.max(0, Math.round(Number(sesion.metadata?.envio_monto ?? 0)) || 0)
  const direccion = detalleEnvioDe(sesion)?.address
  return json({
    ok: true,
    folio: folioDesdeSesion(sesion.id),
    fecha: sesion.created ? new Date(sesion.created * 1000).toISOString() : null,
    email: sesion.customer_details?.email ?? sesion.metadata?.email ?? '',
    subtotal: Math.max(0, total - envio),
    envio,
    total,
    destino: direccion ? { ciudad: direccion.city ?? '', estado: direccion.state ?? '', cp: direccion.postal_code ?? '' } : null,
  })
})
