import { ORIGEN, emailOrigen, telefonoOrigen } from '../_lib/config'
import { AppError, json, leerTexto, manejar } from '../_lib/http'
import { buscarZona, crearGuia, type DireccionEnvio } from '../_lib/skydropx'
import { actualizarMetadataSesion, detalleEnvioDe, obtenerSesion, parsearEvento, verificarFirma } from '../_lib/stripe'
import type { Env } from '../_lib/types'

const EVENTOS_ATENDIDOS = new Set(['checkout.session.completed', 'checkout.session.async_payment_succeeded'])
const BLOQUEO_MS = 10 * 60_000
const PREFIJO_PROCESANDO = 'procesando:'

function extraerNumero(calle: string): string {
  const coincidencia = calle.match(/#\s*(\d+)/)
  return coincidencia ? coincidencia[1] : ''
}

function motivoDe(error: unknown): string {
  if (error instanceof AppError) return error.detalle || error.message
  return error instanceof Error ? error.message : String(error)
}

async function procesarSesion(env: Env, sesionId: string): Promise<Response> {
  const sesion = await obtenerSesion(env, sesionId)
  if (sesion.payment_status !== 'paid') {
    return json({ ok: true, ignorado: 'sin_pago' })
  }

  const meta = sesion.metadata ?? {}
  const estado = meta.envio_estado ?? ''
  if (estado === 'creado') {
    return json({ ok: true, duplicado: true })
  }
  if (estado.startsWith(PREFIJO_PROCESANDO)) {
    const desde = Number(estado.slice(PREFIJO_PROCESANDO.length))
    if (Number.isFinite(desde) && Date.now() - desde < BLOQUEO_MS) {
      throw new AppError(409, 'en_proceso', 'El envío de este pedido ya se está procesando.')
    }
  }

  const rateId = meta.rate_id
  const detalle = detalleEnvioDe(sesion)
  const direccion = detalle?.address
  if (!rateId || !direccion) {
    console.error(`[webhook] sesión ${sesion.id} sin rate_id o dirección de envío; no se crea guía`)
    return json({ ok: true, ignorado: 'sin_datos_de_envio' })
  }

  await actualizarMetadataSesion(env, sesion.id, { envio_estado: `${PREFIJO_PROCESANDO}${Date.now()}` })

  try {
    const codigoPostal = meta.zip_to || direccion.postal_code || ''
    const zona = await buscarZona(codigoPostal)
    const calle = direccion.line1 || ''
    const nombreCliente = detalle?.name || 'Cliente'

    const origen: DireccionEnvio = {
      alias: 'Taller Espina Design',
      tipo: 'from',
      nombre: ORIGEN.name,
      empresa: ORIGEN.company,
      telefono: telefonoOrigen(env),
      email: emailOrigen(env),
      calle: ORIGEN.street1,
      numero: ORIGEN.street_number,
      interior: '',
      codigoPostal: ORIGEN.postal_code,
      estado: ORIGEN.area_level1,
      municipio: ORIGEN.area_level2,
      colonia: ORIGEN.area_level3,
      pais: ORIGEN.country_code,
      referencia: ORIGEN.reference,
    }

    const destino: DireccionEnvio = {
      alias: `Cliente: ${nombreCliente}`.slice(0, 60),
      tipo: 'to',
      nombre: nombreCliente,
      empresa: '',
      telefono: meta.telefono || telefonoOrigen(env),
      email: sesion.customer_details?.email || meta.email || '',
      calle,
      numero: extraerNumero(calle),
      interior: direccion.line2 || '',
      codigoPostal,
      estado: zona?.estado || direccion.state || '',
      municipio: zona?.municipio || direccion.city || '',
      colonia: zona?.colonia || 'Centro',
      pais: direccion.country || 'MX',
      referencia: '',
    }

    const guia = await crearGuia(env, origen, destino, rateId, `Pedido ${sesion.id}`)

    try {
      await actualizarMetadataSesion(env, sesion.id, {
        envio_estado: 'creado',
        envio_guia: guia.rastreo,
        envio_id: guia.id,
      })
    } catch (error) {
      console.error(`[webhook] guía ${guia.rastreo} creada pero no se pudo marcar la sesión ${sesion.id}: ${motivoDe(error)}`)
    }

    console.log(`[webhook] guía ${guia.rastreo || guia.id} creada para ${sesion.id}`)
    return json({ ok: true, guia: guia.rastreo })
  } catch (error) {
    await actualizarMetadataSesion(env, sesion.id, { envio_estado: `error:${motivoDe(error).slice(0, 400)}` }).catch(() => undefined)
    throw error
  }
}

export const onRequest = manejar(['POST'], async ({ request, env }) => {
  const secreto = env.STRIPE_WEBHOOK_SECRET
  if (!secreto) {
    throw new AppError(500, 'config_webhook', 'Webhook no configurado.', 'STRIPE_WEBHOOK_SECRET sin configurar')
  }
  const firma = request.headers.get('stripe-signature')
  if (!firma) {
    throw new AppError(400, 'sin_firma', 'Falta la firma.')
  }

  const crudo = await leerTexto(request, 1024 * 1024)
  if (!(await verificarFirma(crudo, firma, secreto))) {
    throw new AppError(400, 'firma_invalida', 'Firma inválida.')
  }

  const evento = parsearEvento(crudo)
  if (!EVENTOS_ATENDIDOS.has(evento.type)) {
    return json({ ok: true, ignorado: evento.type })
  }
  const sesionId = evento.data.object.id
  if (typeof sesionId !== 'string') {
    throw new AppError(400, 'evento_invalido', 'Evento sin identificador de sesión.')
  }
  return procesarSesion(env, sesionId)
})
