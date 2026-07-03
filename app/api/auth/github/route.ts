import { NextRequest, NextResponse } from "next/server";

const localClientIdCookie = "gimit-github-client-id";
const localClientSecretCookie = "gimit-github-client-secret";
const localOriginCookie = "gimit-github-oauth-origin";
const githubTokenCookie = "gimit-github-token";
const githubStateCookie = "gimit-github-state";

type LocalOAuthRequest = {
  clientId?: string;
  clientSecret?: string;
  origin?: string;
};

const cookieOptions = {
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 30,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

const requestOrigin = (request: NextRequest) => new URL(request.url).origin;

const validateClientId = (value: string) =>
  value.trim().length >= 10 && !/\s/.test(value.trim());

const validateClientSecret = (value: string) =>
  value.trim().length >= 20 && !/\s/.test(value.trim());

const getOAuthClientId = (request: NextRequest) => {
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    return process.env.GITHUB_CLIENT_ID;
  }

  if (process.env.NODE_ENV === "production") {
    return "";
  }

  const localOrigin = request.cookies.get(localOriginCookie)?.value;
  const localClientId = request.cookies.get(localClientIdCookie)?.value;
  const localClientSecret = request.cookies.get(localClientSecretCookie)?.value;

  if (localOrigin === requestOrigin(request) && localClientId && localClientSecret) {
    return localClientId;
  }

  return "";
};

export async function GET(request: NextRequest) {
  const clientId = getOAuthClientId(request);

  if (!clientId) {
    return NextResponse.redirect(new URL("/?github=setup-required", request.url));
  }

  const state = crypto.randomUUID();
  const redirect = new URL("https://github.com/login/oauth/authorize");
  redirect.searchParams.set("client_id", clientId);
  redirect.searchParams.set("redirect_uri", `${requestOrigin(request)}/api/auth/github/callback`);
  redirect.searchParams.set("scope", "read:user");
  redirect.searchParams.set("state", state);

  const response = NextResponse.redirect(redirect);
  response.cookies.set("gimit-github-state", state, {
    httpOnly: true,
    maxAge: 600,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      {
        error:
          "Production deployments must use server-side GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET environment variables.",
      },
      { status: 400 },
    );
  }

  let body: LocalOAuthRequest;
  try {
    body = (await request.json()) as LocalOAuthRequest;
  } catch {
    return NextResponse.json({ error: "Enter your GitHub OAuth App details." }, { status: 400 });
  }

  const clientId = body.clientId?.trim() || "";
  const clientSecret = body.clientSecret?.trim() || "";
  const origin = body.origin?.trim() || "";

  if (origin !== requestOrigin(request)) {
    return NextResponse.json(
      { error: "This OAuth App was created for a different local environment." },
      { status: 400 },
    );
  }

  if (!validateClientId(clientId)) {
    return NextResponse.json(
      { error: "The Client ID does not look like a GitHub OAuth Client ID." },
      { status: 400 },
    );
  }

  if (!validateClientSecret(clientSecret)) {
    return NextResponse.json(
      { error: "The Client Secret does not look like a GitHub OAuth Client Secret." },
      { status: 400 },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(localClientIdCookie, clientId, cookieOptions);
  response.cookies.set(localClientSecretCookie, clientSecret, cookieOptions);
  response.cookies.set(localOriginCookie, origin, cookieOptions);
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(localClientIdCookie);
  response.cookies.delete(localClientSecretCookie);
  response.cookies.delete(localOriginCookie);
  response.cookies.delete(githubTokenCookie);
  response.cookies.delete(githubStateCookie);
  return response;
}
