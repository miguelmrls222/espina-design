const SCOPES = "repo,user";

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return new Response("Missing credentials", { status: 500 });
  }

  const redirectUri = `${url.origin}/callback`;
  const githubUrl = `https://github.com/login/oauth/authorize?client_id=${env.GITHUB_CLIENT_ID}&redirect_uri=${redirectUri}&scope=${SCOPES}&response_type=code`;

  return Response.redirect(githubUrl, 302);
}
