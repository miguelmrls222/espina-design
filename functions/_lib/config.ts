import type { Env } from './types'

export const SKYDROP_BASE = 'https://pro.skydropx.com'
export const CP_API_BASE = 'https://mexico-api.devaleff.com/api/codigo-postal'
export const BREVO_BASE = 'https://api.brevo.com/v3'
export const STRIPE_BASE = 'https://api.stripe.com/v1'
export const BREVO_LISTA_NEWSLETTER = 3

export const PAQUETE = { weight: 0.5, height: 5, width: 20, length: 25 } as const

export const ORIGEN = {
  name: 'Espina Design',
  company: 'Espina Design',
  street1: 'República de Jamaica #51',
  street_number: '51',
  postal_code: '83170',
  area_level1: 'Sonora',
  area_level2: 'Hermosillo',
  area_level3: 'Adolfo López Mateos',
  country_code: 'MX',
  reference: 'Entre Jesus Siqueiros y Luis Orcí',
} as const

const TELEFONO_ORIGEN_DEFECTO = '526624142998'
const EMAIL_ORIGEN_DEFECTO = 'espinadesignhmo@gmail.com'
const CORREO_RESENAS_DEFECTO = 'miguelmrls222@gmail.com'

export function telefonoOrigen(env: Env): string {
  return env.ORIGEN_TELEFONO?.replace(/\D/g, '') || TELEFONO_ORIGEN_DEFECTO
}

export function emailOrigen(env: Env): string {
  return env.ORIGEN_EMAIL || EMAIL_ORIGEN_DEFECTO
}

export function remitenteCorreo(env: Env): { name: string; email: string } {
  return { name: 'Espina Design', email: env.MAIL_REMITENTE || CORREO_RESENAS_DEFECTO }
}

export function destinoResenas(env: Env): string {
  return env.MAIL_RESENAS_DESTINO || CORREO_RESENAS_DEFECTO
}
