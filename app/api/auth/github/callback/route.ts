import { NextRequest, NextResponse } from "next/server";

const localClientIdCookie = "gimit-github-client-id";
const localClientSecretCookie = "gimit-github-client-secret";
const localOriginCookie = "gimit-github-oauth-origin";

const requestOrigin = (request: NextRequest) => new URL(request.url).origin;

const getOAuthCredentials = (request: NextRequest) => {
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    return {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      local: false,
    };
  }

  if (process.env.NODE_ENV === "production") {
    return null;
  }

  const localOrigin = request.cookies.get(localOriginCookie)?.value;
  const clientId = request.cookies.get(localClientIdCookie)?.value;
  const clientSecret = request.cookies.get(localClientSecretCookie)?.value;

  if (localOrigin === requestOrigin(request) && clientId && clientSecret) {
    return { clientId, clientSecret, local: true };
  }

  return null;
};

const authErrorRedirect = (request: NextRequest, reason: string) => {
  const errorUrl = new URL("/auth/github/error", request.url);
  errorUrl.searchParams.set("reason", reason);
  const response = NextResponse.redirect(errorUrl);
  response.cookies.delete("gimit-github-state");
  return response;
};

const exchangeCodeForToken = async (
  request: NextRequest,
  credentials: { clientId: string; clientSecret: string },
  code: string,
) => {
  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      code,
      redirect_uri: `${requestOrigin(request)}/api/auth/github/callback`,
    }),
    cache: "no-store",
  });
  const tokenText = await tokenResponse.text();
  let tokenBody: { access_token?: string; error?: string; error_description?: string };

  try {
    tokenBody = JSON.parse(tokenText) as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };
  } catch {
    throw new Error(`GitHub token exchange returned invalid JSON with status ${tokenResponse.status}.`);
  }

  if (!tokenResponse.ok || tokenBody.error) {
    throw new Error(tokenBody.error_description || tokenBody.error || "GitHub token exchange failed.");
  }

  return tokenBody.access_token || "";
};

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const savedState = request.cookies.get("gimit-github-state")?.value;
  const credentials = getOAuthCredentials(request);

  if (!code) {
    return authErrorRedirect(request, "missing-code");
  }

  if (!state || state !== savedState) {
    return authErrorRedirect(request, "state");
  }

  if (!credentials) {
    return authErrorRedirect(request, "credentials");
  }

  let accessToken = "";

  try {
    accessToken = await exchangeCodeForToken(request, credentials, code);
  } catch (error) {
    console.error(error);
    return authErrorRedirect(request, "token");
  }

  if (!accessToken) {
    return authErrorRedirect(request, "token");
  }

  const response = NextResponse.redirect(new URL("/profile", request.url));
  response.cookies.set("gimit-github-token", accessToken, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  response.cookies.delete("gimit-github-state");
  return response;
}
