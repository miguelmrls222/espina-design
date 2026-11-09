# Recordatorio de carrito abandonado por WhatsApp

El Worker `espina-design-abandoned` revisa cada 15 minutos las Checkout Sessions de Stripe de las últimas 24 h.
Envía un WhatsApp (y el correo, si hay email) a las que siguen `open` con 60 minutos o más, una sola vez por carrito.
Si el cliente pagó otra compra con el mismo teléfono o correo, no recibe recordatorio.
Los envíos solo ocurren entre las 9:00 y las 21:00 hora de Hermosillo; lo que cae fuera de ese horario sale en el primer cron del día.

## Plantilla en Meta (WhatsApp Manager → Plantillas de mensajes)

- Nombre: `carrito_abandonado` · Idioma: Español (México) · Categoría: Marketing
- Cuerpo:

```
*ESPINA DESIGN*
*Cuero hecho a mano — Hermosillo, Sonora*

*¡Tu carrito sigue aquí!*
Hace un momento nos visitaste y dejaste estos productos pendientes: {{1}}. ¿Quieres completar tu pedido?
```

- Botón: Visitar sitio web · tipo dinámico · texto `Completar mi pedido` · URL
  `https://espinadesign.com/api/recover-cart?session_id={{1}}`

## Configuración del Worker

Secretos (Cloudflare → Workers → espina-design-abandoned → Settings → Variables and Secrets):

| Nombre | Valor |
| --- | --- |
| `WHATSAPP_TOKEN` | Token permanente del usuario del sistema de Meta |
| `WHATSAPP_PHONE_NUMBER_ID` | ID del número de WhatsApp Business (no el teléfono) |

Variables opcionales: `WHATSAPP_TEMPLATE` (por defecto `carrito_abandonado`) y `WHATSAPP_LANG` (por defecto `es_MX`).
Sin `WHATSAPP_TOKEN` el Worker sigue enviando solo el correo.
