import { buscarProductoPorNombre } from '../../src/data/pricing'
import { BREVO_BASE, destinoResenas, remitenteCorreo } from '../_lib/config'
import { AppError, exigirMismoOrigen, fetchConTiempo, json, leerJson, manejar } from '../_lib/http'
import { escaparHtml, esTrampa, limpiarTexto, validarEntero } from '../_lib/validate'

function construirHtml(producto: string, cliente: string, puntuacion: number, comentario: string): string {
  const estrellas = '★'.repeat(puntuacion) + '☆'.repeat(5 - puntuacion)
  const comentarioHtml = escaparHtml(comentario).replace(/\n/g, '<br>')
  return `<!doctype html>
<html>
<body style="font-family:Helvetica,Arial,sans-serif;background:#f5f5f5;padding:20px;margin:0">
<table style="max-width:520px;margin:0 auto;background:#fff;padding:32px">
<tr><td style="padding-bottom:16px">
<h1 style="font-size:13px;text-transform:uppercase;letter-spacing:.12em;color:#000;margin:0">Nueva reseña de producto</h1>
</td></tr>
<tr><td>
<table style="width:100%;font-size:13px;color:#333;line-height:1.6">
<tr><td style="padding:6px 0;font-weight:bold;color:#000;width:100px">Producto</td><td>${escaparHtml(producto)}</td></tr>
<tr><td style="padding:6px 0;font-weight:bold;color:#000">Cliente</td><td>${escaparHtml(cliente)}</td></tr>
<tr><td style="padding:6px 0;font-weight:bold;color:#000">Puntuación</td><td>${estrellas} (${puntuacion}/5)</td></tr>
<tr><td style="padding:6px 0;font-weight:bold;color:#000;vertical-align:top">Comentario</td><td>${comentarioHtml}</td></tr>
</table>
</td></tr>
<tr><td style="text-align:center;padding-top:24px;font-size:11px;color:#999">
<p style="margin:0">Para publicar esta reseña, agrégala desde el CMS (/admin) en la colección de Productos.</p>
</td></tr>
</table>
</body>
</html>`
}

export const onRequest = manejar(['POST'], async ({ request, env }) => {
  exigirMismoOrigen(request)
  const cuerpo = await leerJson(request, 8 * 1024)

  if (esTrampa(cuerpo.website)) {
    return json({ ok: true })
  }

  const nombreProducto = limpiarTexto(cuerpo.producto, 'El producto', 1, 120)
  const producto = buscarProductoPorNombre(nombreProducto)
  if (!producto) {
    throw new AppError(400, 'producto_desconocido', 'No encontramos ese producto.')
  }
  const nombre = limpiarTexto(cuerpo.nombre, 'Tu nombre', 2, 60)
  const texto = limpiarTexto(cuerpo.texto, 'Tu comentario', 10, 1000, true)
  const puntuacion = validarEntero(cuerpo.puntuacion, 'La puntuación', 1, 5)

  if (!env.BREVO_API_KEY) {
    throw new AppError(500, 'config_correo', 'No pudimos recibir tu reseña por ahora. Escríbenos por WhatsApp.', 'BREVO_API_KEY sin configurar')
  }

  const respuesta = await fetchConTiempo(`${BREVO_BASE}/smtp/email`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'api-key': env.BREVO_API_KEY },
    body: JSON.stringify({
      sender: remitenteCorreo(env),
      to: [{ email: destinoResenas(env) }],
      replyTo: { email: destinoResenas(env) },
      subject: `Nueva reseña — ${producto.nombre}`,
      htmlContent: construirHtml(producto.nombre, nombre, puntuacion, texto),
    }),
  })
  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => '')
    throw new AppError(
      502,
      'correo_error',
      'No pudimos enviar tu reseña. Intenta de nuevo o escríbenos por WhatsApp.',
      `Brevo ${respuesta.status} ${detalle.slice(0, 300)}`,
    )
  }
  return json({ ok: true })
})
