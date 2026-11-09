import { BREVO_BASE, BREVO_LISTA_NEWSLETTER } from '../_lib/config'
import { AppError, exigirMismoOrigen, fetchConTiempo, json, leerJson, manejar } from '../_lib/http'
import { esTrampa, validarCorreo } from '../_lib/validate'

export const onRequest = manejar(['POST'], async ({ request, env }) => {
  exigirMismoOrigen(request)
  const cuerpo = await leerJson(request, 2 * 1024)

  if (esTrampa(cuerpo.website)) {
    return json({ ok: true })
  }
  const email = validarCorreo(cuerpo.email)

  if (!env.BREVO_API_KEY) {
    throw new AppError(500, 'config_correo', 'No pudimos procesar tu suscripción por ahora.', 'BREVO_API_KEY sin configurar')
  }

  const respuesta = await fetchConTiempo(`${BREVO_BASE}/contacts`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'api-key': env.BREVO_API_KEY },
    body: JSON.stringify({ email, listIds: [BREVO_LISTA_NEWSLETTER], updateEnabled: true }),
  })

  if (!respuesta.ok) {
    const texto = await respuesta.text().catch(() => '')
    const duplicado = respuesta.status === 409 || texto.includes('duplicate_parameter')
    if (!duplicado) {
      throw new AppError(
        502,
        'suscripcion_error',
        'No pudimos completar tu suscripción. Intenta de nuevo en unos minutos.',
        `Brevo ${respuesta.status} ${texto.slice(0, 300)}`,
      )
    }
  }
  return json({ ok: true })
})
