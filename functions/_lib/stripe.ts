import { STRIPE_BASE } from './config'
import { AppError, fetchConTiempo } from './http'
import type { Env } from './types'

export interface DireccionStripe {
  line1?: string | null
  line2?: string | null
  city?: string | null
  state?: string | null
  postal_code?: string | null
  country?: string | null
}

export interface DetalleEnvioStripe {
  name?: string | null
  address?: DireccionStripe | null
}

export interface SesionStripe {
  id: string
  url?: string | null
  payment_status?: string
  metadata?: Record<string, string> | null
  customer_details?: { email?: string | null } | null
  shipping_details?: DetalleEnvioStripe | null
  collected_information?: { shipping_details?: DetalleEnvioStripe | null } | null
}

export interface EventoStripe {
  id: string
  type: string
  data: { object: Record<string, unknown> }
}

export class StripeError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'StripeError'
    this.status = status
    this.code = code
  }
}

const TOLERANCIA_FIRMA_SEG = 300

function aHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), byte => byte.toString(16).padStart(2, '0')).join('')
}

function igualesEnTiempoConstante(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diferencia = 0
  for (let i = 0; i < a.length; i++) diferencia |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diferencia === 0
}

export async function verificarFirma(
  payload: string,
  cabecera: string,
  secreto: string,
  ahora: number = Date.now(),
  toleranciaSeg: number = TOLERANCIA_FIRMA_SEG,
): Promise<boolean> {
  let marca = ''
  const firmas: string[] = []
  for (const parte of cabecera.split(',')) {
    const igual = parte.indexOf('=')
    if (igual < 0) continue
    const clave = parte.slice(0, igual).trim()
    const valor = parte.slice(igual + 1).trim()
    if (clave === 't') marca = valor
    else if (clave === 'v1') firmas.push(valor)
  }
  if (!/^\d{1,12}$/.test(marca) || firmas.length === 0) return false
  if (Math.abs(ahora / 1000 - Number(marca)) > toleranciaSeg) return false

  const codificador = new TextEncoder()
  const llave = await crypto.subtle.importKey(
    'raw',
    codificador.encode(secreto),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const firma = await crypto.subtle.sign('HMAC', llave, codificador.encode(`${marca}.${payload}`))
  const esperada = aHex(firma)
  return firmas.some(candidata => igualesEnTiempoConstante(esperada, candidata))
}

export function parsearEvento(texto: string): EventoStripe {
  let valor: unknown
  try {
    valor = JSON.parse(texto)
  } catch {
    throw new AppError(400, 'evento_invalido', 'Evento con formato inválido.')
  }
  if (typeof valor !== 'object' || valor === null) {
    throw new AppError(400, 'evento_invalido', 'Evento con formato inválido.')
  }
  const evento = valor as { id?: unknown; type?: unknown; data?: { object?: unknown } }
  const objeto = evento.data?.object
  if (
    typeof evento.id !== 'string' || !evento.id.startsWith('evt_') ||
    typeof evento.type !== 'string' ||
    typeof objeto !== 'object' || objeto === null
  ) {
    throw new AppError(400, 'evento_invalido', 'Evento con formato inválido.')
  }
  return { id: evento.id, type: evento.type, data: { object: objeto as Record<string, unknown> } }
}

async function solicitar<T>(env: Env, ruta: string, metodo: 'GET' | 'POST', params?: URLSearchParams): Promise<T> {
  if (!env.STRIPE_SECRET_KEY) {
    throw new AppError(500, 'config_stripe', 'El pago no está disponible por el momento.', 'STRIPE_SECRET_KEY no configurada')
  }
  const headers: Record<string, string> = { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` }
  if (params) headers['Content-Type'] = 'application/x-www-form-urlencoded'
  const respuesta = await fetchConTiempo(`${STRIPE_BASE}${ruta}`, { method: metodo, headers, body: params?.toString() }, 15_000)
  const cuerpo = (await respuesta.json().catch(() => null)) as
    | { error?: { code?: string; message?: string } }
    | null
  if (!respuesta.ok) {
    throw new StripeError(
      respuesta.status,
      cuerpo?.error?.code ?? 'desconocido',
      cuerpo?.error?.message ?? `Stripe respondió ${respuesta.status}`,
    )
  }
  return cuerpo as T
}

function validarIdSesion(id: string): string {
  if (!/^cs_[A-Za-z0-9_]{8,200}$/.test(id)) {
    throw new AppError(400, 'sesion_invalida', 'Identificador de sesión inválido.')
  }
  return id
}

export function crearSesion(env: Env, params: URLSearchParams): Promise<SesionStripe> {
  return solicitar<SesionStripe>(env, '/checkout/sessions', 'POST', params)
}

export function obtenerSesion(env: Env, id: string): Promise<SesionStripe> {
  return solicitar<SesionStripe>(env, `/checkout/sessions/${validarIdSesion(id)}`, 'GET')
}

export function actualizarMetadataSesion(env: Env, id: string, metadata: Record<string, string>): Promise<SesionStripe> {
  const params = new URLSearchParams()
  for (const [clave, valor] of Object.entries(metadata)) params.set(`metadata[${clave}]`, valor)
  return solicitar<SesionStripe>(env, `/checkout/sessions/${validarIdSesion(id)}`, 'POST', params)
}

export function detalleEnvioDe(sesion: SesionStripe): DetalleEnvioStripe | null {
  return sesion.collected_information?.shipping_details ?? sesion.shipping_details ?? null
}
