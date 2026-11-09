import { CP_API_BASE, ORIGEN, PAQUETE, SKYDROP_BASE } from './config'
import { AppError, fetchConTiempo } from './http'
import type { Env } from './types'

export interface TarifaEnvio {
  rateId: string
  monto: number
  proveedor: string
  servicio: string
}

export interface DatosZona {
  estado: string
  municipio: string
  colonia: string
}

export interface DireccionEnvio {
  alias: string
  tipo: 'from' | 'to'
  nombre: string
  empresa: string
  telefono: string
  email: string
  calle: string
  numero: string
  interior: string
  codigoPostal: string
  estado: string
  municipio: string
  colonia: string
  pais: string
  referencia: string
}

export interface GuiaCreada {
  id: string
  rastreo: string
}

interface TarifaCruda {
  id?: string
  success?: boolean
  total?: string | number | null
  provider_display_name?: string
  provider_name?: string
  provider_service_name?: string
}

interface CotizacionCruda {
  id?: string
  is_completed?: boolean
  rates?: TarifaCruda[]
}

const MENSAJE_ENVIO = 'No pudimos calcular el envío para tu código postal. Intenta de nuevo o escríbenos por WhatsApp.'
const ESPERA_COTIZACION_MS = 8_000
const INTERVALO_COTIZACION_MS = 800

function fallo(detalle: string): AppError {
  return new AppError(502, 'envio_no_disponible', MENSAJE_ENVIO, detalle)
}

async function solicitar<T>(token: string, ruta: string, metodo: 'GET' | 'POST', cuerpo?: unknown): Promise<T> {
  const headers: Record<string, string> = { authorization: `Bearer ${token}` }
  if (cuerpo !== undefined) headers['content-type'] = 'application/json'
  const respuesta = await fetchConTiempo(
    `${SKYDROP_BASE}${ruta}`,
    { method: metodo, headers, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) },
    12_000,
  )
  if (!respuesta.ok) {
    const texto = await respuesta.text().catch(() => '')
    throw fallo(`SkyDropx ${metodo} ${ruta} -> ${respuesta.status} ${texto.slice(0, 300)}`)
  }
  return (await respuesta.json()) as T
}

export async function obtenerToken(env: Env): Promise<string> {
  if (!env.SKYDROP_CLIENT_ID || !env.SKYDROP_CLIENT_SECRET) {
    throw new AppError(500, 'config_skydrop', MENSAJE_ENVIO, 'SKYDROP_CLIENT_ID o SKYDROP_CLIENT_SECRET sin configurar')
  }
  const respuesta = await fetchConTiempo(
    `${SKYDROP_BASE}/api/v1/oauth/token`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: env.SKYDROP_CLIENT_ID,
        client_secret: env.SKYDROP_CLIENT_SECRET,
      }),
    },
    12_000,
  )
  if (!respuesta.ok) throw fallo(`SkyDropx token -> ${respuesta.status}`)
  const datos = (await respuesta.json()) as { access_token?: string }
  if (!datos.access_token) throw fallo('SkyDropx token sin access_token')
  return datos.access_token
}

export async function buscarZona(codigoPostal: string): Promise<DatosZona | null> {
  try {
    const respuesta = await fetchConTiempo(`${CP_API_BASE}/${encodeURIComponent(codigoPostal)}`, {}, 5_000)
    if (!respuesta.ok) return null
    const cuerpo = (await respuesta.json()) as { data?: Array<Record<string, string>> }
    const primero = cuerpo?.data?.[0]
    if (!primero) return null
    return { estado: primero.d_estado, municipio: primero.D_mnpio, colonia: primero.d_asenta }
  } catch {
    return null
  }
}

function tarifaMasBarata(rates: readonly TarifaCruda[]): TarifaCruda | null {
  const validas = rates.filter(r => r.success === true && r.id && r.total != null && Number.parseFloat(String(r.total)) > 0)
  if (validas.length === 0) return null
  validas.sort((a, b) => Number.parseFloat(String(a.total)) - Number.parseFloat(String(b.total)))
  return validas[0]
}

const esperar = (ms: number) => new Promise<void>(resolver => setTimeout(resolver, ms))

export async function cotizarEnvio(env: Env, codigoPostalDestino: string): Promise<TarifaEnvio> {
  const token = await obtenerToken(env)
  const zona = (await buscarZona(codigoPostalDestino)) ?? { estado: 'N/A', municipio: 'N/A', colonia: 'Centro' }

  const creada = await solicitar<CotizacionCruda>(token, '/api/v1/quotations', 'POST', {
    quotation: {
      zip_from: ORIGEN.postal_code,
      zip_to: codigoPostalDestino,
      parcel: PAQUETE,
      address_from: {
        country_code: ORIGEN.country_code,
        postal_code: ORIGEN.postal_code,
        area_level1: ORIGEN.area_level1,
        area_level2: ORIGEN.area_level2,
        area_level3: ORIGEN.area_level3,
      },
      address_to: {
        country_code: 'MX',
        postal_code: codigoPostalDestino,
        area_level1: zona.estado,
        area_level2: zona.municipio,
        area_level3: zona.colonia,
      },
    },
  })
  if (!creada.id) throw fallo('Cotización sin id')

  const inicio = Date.now()
  let completa: CotizacionCruda | null = null
  while (Date.now() - inicio < ESPERA_COTIZACION_MS) {
    const estado = await solicitar<CotizacionCruda>(token, `/api/v1/quotations/${encodeURIComponent(creada.id)}`, 'GET')
    if (estado.is_completed) {
      completa = estado
      break
    }
    await esperar(INTERVALO_COTIZACION_MS)
  }
  if (!completa) throw fallo('Tiempo de espera agotado para la cotización')

  const tarifa = tarifaMasBarata(completa.rates ?? [])
  if (!tarifa || !tarifa.id) throw fallo('Sin tarifas disponibles para el destino')

  return {
    rateId: tarifa.id,
    monto: Math.round(Number.parseFloat(String(tarifa.total))),
    proveedor: tarifa.provider_display_name || tarifa.provider_name || 'Paquetería',
    servicio: tarifa.provider_service_name || '',
  }
}

async function crearDireccion(token: string, direccion: DireccionEnvio): Promise<string> {
  const respuesta = await solicitar<{ data?: { id?: string } }>(token, '/api/v1/address_templates', 'POST', {
    address_template: {
      alias_name: direccion.alias,
      address_type: direccion.tipo,
      address_attributes: {
        name: direccion.nombre,
        company: direccion.empresa,
        phone: direccion.telefono,
        email: direccion.email,
        street1: direccion.calle,
        street_number: direccion.numero,
        apartment_number: direccion.interior,
        postal_code: direccion.codigoPostal,
        area_level1: direccion.estado,
        area_level2: direccion.municipio,
        area_level3: direccion.colonia,
        country_code: direccion.pais,
        reference: direccion.referencia,
      },
    },
  })
  const id = respuesta.data?.id
  if (!id) throw fallo('Dirección creada sin id')
  return id
}

export async function crearGuia(
  env: Env,
  origen: DireccionEnvio,
  destino: DireccionEnvio,
  rateId: string,
  referencia: string,
): Promise<GuiaCreada> {
  const token = await obtenerToken(env)
  const origenId = await crearDireccion(token, origen)
  const destinoId = await crearDireccion(token, destino)
  const envio = await solicitar<{ data?: { id?: string; attributes?: { tracking_number?: string } } }>(
    token,
    '/api/v1/shipments',
    'POST',
    {
      shipment: {
        address_from_id: origenId,
        address_to_id: destinoId,
        parcel: PAQUETE,
        rate_id: rateId,
        reference: referencia,
      },
    },
  )
  return { id: envio.data?.id ?? '', rastreo: envio.data?.attributes?.tracking_number ?? '' }
}
