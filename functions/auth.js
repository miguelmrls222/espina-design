const SCOPES = "repo,user";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
      return new Response("GitHub OAuth credentials not configured", { status: 500 });
    }

    if (path === "/api/auth" && request.method === "GET") {
      const provider = url.searchParams.get("provider") || "github";
      return Response.redirect(
        `https://github.com/login/oauth/authorize?client_id=${env.GITHUB_CLIENT_ID}&redirect_uri=${url.origin}/api/callback&scope=${SCOPES}&provider=${provider}`,
        302
      );
    }

    if (path === "/api/callback" && request.method === "GET") {
      const code = url.searchParams.get("code");
      if (!code) {
        return new Response("No code provided", { status: 400 });
      }

      const tokenResponse = await fetch(
        "https://github.com/login/oauth/access_token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            client_id: env.GITHUB_CLIENT_ID,
            client_secret: env.GITHUB_CLIENT_SECRET,
            code,
          }),
        }
      );

      const data = await tokenResponse.json();
      const token = data.access_token;

      if (!token) {
        return new Response(JSON.stringify(data), { status: 400 });
      }

      const html = `<!doctype html><html><head><meta charset="utf-8"><title>Autenticación exitosa</title></head><body><script>(function(){function receiveMessage(e){window.opener.postMessage('authorization:github:${token}:${JSON.stringify(data)}', e.origin);window.close();}window.addEventListener("message",receiveMessage,false);window.opener.postMessage("authorizing:github","*");})();</script><p>Autenticación exitosa. Cerrando ventana...</p></body></html>`;

      return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return new Response("Not found", { status: 404 });
  }
};
