var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// abandoned-cart-worker.js
var abandoned_cart_worker_default = {
  async scheduled(event, env, ctx) {
    await processAbandoned(env);
  },
  async fetch(request, env) {
    if (request.headers.get("X-Cron-Secret") === env.CRON_SECRET) {
      await processAbandoned(env);
      return new Response("OK");
    }
    return new Response("Unauthorized", { status: 401 });
  }
};
async function processAbandoned(env) {
  const stripeKey = env.STRIPE_SECRET_KEY;
  const brevoKey = env.BREVO_API_KEY;
  if (!stripeKey || !brevoKey) return;
  const MINUTOS_ESPERA = 30;
  const ahora = Math.floor(Date.now() / 1e3);
  const desde = ahora - 86400;
  let hasMore = true;
  let startingAfter = null;
  while (hasMore) {
    let url = `https://api.stripe.com/v1/checkout/sessions?limit=100&created[gte]=${desde}&created[lte]=${ahora}&expand[]=data.line_items`;
    if (startingAfter) url += `&starting_after=${startingAfter}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${stripeKey}` }
    });
    if (!res.ok) break;
    const body = await res.json();
    for (const session of body.data || []) {
      if (session.status !== "open") continue;
      if (!session.customer_email) continue;
      if (!session.metadata?.cart) continue;
      const creadaEn = session.created;
      const edadMinutos = (ahora - creadaEn) / 60;
      if (edadMinutos < MINUTOS_ESPERA) continue;
      const yaEnviado = await env.ABANDONED_CARTS?.get(`sent:${session.id}`);
      if (yaEnviado) continue;
      const ok = await enviarEmailRecuperacion(session, brevoKey);
      if (ok) {
        await env.ABANDONED_CARTS?.put(`sent:${session.id}`, "1", { expirationTtl: 604800 });
      }
    }
    hasMore = body.has_more;
    if (body.data?.length) startingAfter = body.data[body.data.length - 1].id;
  }
}
__name(processAbandoned, "processAbandoned");
async function enviarEmailRecuperacion(session, brevoKey) {
  const email = session.customer_email;
  const items = (() => {
    try {
      return JSON.parse(session.metadata?.cart || "[]");
    } catch {
      return [];
    }
  })();
  const listaItems = items.map(
    (i) => `\u2022 ${i.n}${i.col ? ` (${i.col})` : ""} \u2014 $${(i.p || 0).toLocaleString("es-MX")} MXN \xD7 ${i.c || 1}`
  ).join("\n");
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "api-key": brevoKey
      },
      body: JSON.stringify({
        sender: { name: "Espina Design", email: "mikemorales222@hotmail.com" },
        to: [{ email }],
        subject: "\xBFOlvidaste algo? \u2014 Tu carrito te espera \u{1F6D2}",
        htmlContent: `
<!doctype html>
<html>
<body style="font-family:Helvetica,Arial,sans-serif;background:#f5f5f5;padding:20px;margin:0">
<table style="max-width:520px;margin:0 auto;background:#fff;padding:32px">
<tr><td style="text-align:center;padding-bottom:8px">
<h1 style="font-size:16px;text-transform:uppercase;letter-spacing:.12em;color:#000;margin:0">Espina Design</h1>
<p style="font-size:13px;color:#666;margin:8px 0 20px">Cuero hecho a mano \u2014 Hermosillo, Sonora</p>
</td></tr>
<tr><td>
<h2 style="font-size:15px;color:#000;margin:0 0 6px">\xA1Tu carrito sigue aqu\xED!</h2>
<p style="font-size:13px;color:#555;line-height:1.5;margin:0 0 16px">Hace un momento nos visitaste y dejaste estos productos pendientes. \xBFQuieres completar tu pedido?</p>
<div style="background:#f9f9f9;padding:14px;border-radius:4px;margin:0 0 20px;font-size:13px;color:#333;line-height:1.6;white-space:pre-wrap">${listaItems}</div>
<a href="https://espinadesign.com/api/recover-cart?session_id=${session.id}" style="display:block;text-align:center;background:#000;color:#fff;text-decoration:none;padding:12px;font-size:13px;text-transform:uppercase;letter-spacing:.08em;border-radius:2px">Completar mi pedido</a>
</td></tr>
<tr><td style="text-align:center;padding-top:24px;font-size:11px;color:#999">
<p style="margin:0">Si tienes dudas, responde a este correo o escr\xEDbenos por WhatsApp.</p>
<p style="margin:6px 0 0">Espina Design \u2014 Hermosillo, Sonora, M\xE9xico</p>
</td></tr>
</table>
</body>
</html>`
      })
    });
    return res.ok;
  } catch {
    return false;
  }
}
__name(enviarEmailRecuperacion, "enviarEmailRecuperacion");
export {
  abandoned_cart_worker_default as default
};
//# sourceMappingURL=abandoned-cart-worker.js.map
