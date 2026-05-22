const SCOPES = "repo,user";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
      return new Response("Missing GitHub OAuth credentials", { status: 500 });
    }

    if (path === "/api/auth") {
      const redirectUri = `${url.origin}/api/callback`;
      const githubUrl = `https://github.com/login/oauth/authorize?client_id=${env.GITHUB_CLIENT_ID}&redirect_uri=${redirectUri}&scope=${SCOPES}&response_type=code`;
      return Response.redirect(githubUrl, 302);
    }

    if (path === "/api/callback") {
      const code = url.searchParams.get("code");
      if (!code) {
        return new Response("Missing authorization code", { status: 400 });
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

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Autenticación exitosa</title></head><body><script>window.opener.postMessage('authorization:github:${token}:${JSON.stringify(data)}','*');window.close()</script></body></html>`;

      return new Response(html, {
        headers: {
          "content-type": "text/html;charset=utf-8",
          "cache-control": "no-cache, no-store, must-revalidate",
        },
      });
    }

    return new Response("Not found", { status: 404 });
  },
};
