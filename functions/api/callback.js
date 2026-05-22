export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return new Response("Missing code", { status: 400 });
  }

  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return new Response("Missing credentials", { status: 500 });
  }

  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const data = await res.json();
  const token = data.access_token;

  if (!token) {
    return new Response(JSON.stringify(data), { status: 400, headers: { "content-type": "application/json" } });
  }

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Success</title></head><body><script>window.opener.postMessage('authorization:github:${token}:${JSON.stringify(data)}','*');window.close()</script></body></html>`;

  return new Response(html, {
    headers: {
      "content-type": "text/html;charset=utf-8",
      "cache-control": "no-cache, no-store, must-revalidate",
    },
  });
}
