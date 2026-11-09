import type { Manejador, PagesContext } from './types'

export class AppError extends Error {
  readonly status: number
  readonly code: string
  readonly detalle: string

  constructor(status: number, code: string, message: string, detalle = '') {
    super(message)
    this.name = 'AppError'
    this.status = status
    this.code = code
    this.detalle = detalle
  }
}

const CABECERAS_JSON = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
} as const

export function json(datos: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(datos), {
    status,
    headers: { ...CABECERAS_JSON, ...extra },
  })
}

export function errorJson(error: AppError): Response {
  return json({ ok: false, error: error.message, code: error.code }, error.status)
}

export function manejar(metodos: readonly string[], manejador: Manejador): (contexto: PagesContext) => Promise<Response> {
  const permitidos = metodos.join(', ')
  return async contexto => {
    if (!metodos.includes(contexto.request.method)) {
      return json({ ok: false, error: 'Método no permitido', code: 'metodo_no_permitido' }, 405, { allow: permitidos })
    }
    try {
      return await manejador(contexto)
    } catch (error) {
      if (error instanceof AppError) {
        if (error.status >= 500) console.error(`[${error.code}] ${error.message}${error.detalle ? ` | ${error.detalle}` : ''}`)
        return errorJson(error)
      }
      const detalle = error instanceof Error ? error.message : String(error)
      console.error(`[error_interno] ${detalle}`)
      return json({ ok: false, error: 'Error interno. Intenta de nuevo en unos minutos.', code: 'error_interno' }, 500)
    }
  }
}

export async function leerTexto(request: Request, maxBytes: number): Promise<string> {
  const declarado = Number(request.headers.get('content-length'))
  if (Number.isFinite(declarado) && declarado > maxBytes) {
    throw new AppError(413, 'payload_grande', 'La solicitud es demasiado grande.')
  }
  const texto = await request.text()
  if (new TextEncoder().encode(texto).byteLength > maxBytes) {
    throw new AppError(413, 'payload_grande', 'La solicitud es demasiado grande.')
  }
  return texto
}

export async function leerJson(request: Request, maxBytes = 16 * 1024): Promise<Record<string, unknown>> {
  const texto = await leerTexto(request, maxBytes)
  let valor: unknown
  try {
    valor = JSON.parse(texto)
  } catch {
    throw new AppError(400, 'json_invalido', 'La solicitud no tiene un formato válido.')
  }
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
    throw new AppError(400, 'json_invalido', 'La solicitud no tiene un formato válido.')
  }
  return valor as Record<string, unknown>
}

export function exigirMismoOrigen(request: Request): void {
  const origen = request.headers.get('origin')
  if (origen && origen !== new URL(request.url).origin) {
    throw new AppError(403, 'origen_no_permitido', 'Origen no permitido.')
  }
}

export async function fetchConTiempo(url: string, init: RequestInit = {}, ms = 10_000): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(ms) })
  } catch (error) {
    const motivo = error instanceof Error && error.name === 'TimeoutError' ? 'tiempo agotado' : 'sin respuesta'
    throw new AppError(504, 'servicio_externo', `Servicio externo sin respuesta (${motivo}).`)
  }
}
