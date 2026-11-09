import type { Env, PagesContext } from '../functions/_lib/types'

export type Llamada = { url: string; method: string; headers: Record<string, string>; body: string }
type Respuesta = { status?: number; body?: unknown }
type Ruta = (llamada: Llamada) => Respuesta | undefined

export function instalarFetch(rutas: Ruta[]): { llamadas: Llamada[]; restaurar: () => void } {
  const original = globalThis.fetch
  const llamadas: Llamada[] = []
  globalThis.fetch = (async (entrada: RequestInfo | URL, init?: RequestInit) => {
    const headers: Record<string, string> = {}
    new Headers(init?.headers).forEach((valor, clave) => { headers[clave] = valor })
    const llamada: Llamada = {
      url: String(entrada),
      method: init?.method ?? 'GET',
      headers,
      body: typeof init?.body === 'string' ? init.body : '',
    }
    llamadas.push(llamada)
    for (const ruta of rutas) {
      const respuesta = ruta(llamada)
      if (respuesta) {
        return new Response(JSON.stringify(respuesta.body ?? {}), {
          status: respuesta.status ?? 200,
          headers: { 'content-type': 'application/json' },
        })
      }
    }
    return new Response('{}', { status: 404 })
  }) as typeof fetch
  return { llamadas, restaurar: () => { globalThis.fetch = original } }
}

export function contexto(request: Request, env: Env = {}): PagesContext {
  return { request, env, waitUntil: () => undefined }
}

export function peticionJson(url: string, cuerpo: unknown, extra: Record<string, string> = {}): Request {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...extra },
    body: JSON.stringify(cuerpo),
  })
}

export async function firmarStripe(payload: string, secreto: string, marca = Math.floor(Date.now() / 1000)): Promise<string> {
  const codificador = new TextEncoder()
  const llave = await crypto.subtle.importKey('raw', codificador.encode(secreto), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const firma = await crypto.subtle.sign('HMAC', llave, codificador.encode(`${marca}.${payload}`))
  const hex = Array.from(new Uint8Array(firma), b => b.toString(16).padStart(2, '0')).join('')
  return `t=${marca},v1=${hex}`
}
