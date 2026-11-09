export interface Env {
  STRIPE_SECRET_KEY?: string
  STRIPE_WEBHOOK_SECRET?: string
  SKYDROP_CLIENT_ID?: string
  SKYDROP_CLIENT_SECRET?: string
  BREVO_API_KEY?: string
  ORIGEN_TELEFONO?: string
  ORIGEN_EMAIL?: string
  MAIL_REMITENTE?: string
  MAIL_RESENAS_DESTINO?: string
}

export interface PagesContext {
  request: Request
  env: Env
  waitUntil(promesa: Promise<unknown>): void
}

export type Manejador = (contexto: PagesContext) => Promise<Response>
