import Link from "next/link";

type GitHubAuthErrorPageProps = {
  searchParams: Promise<{ reason?: string }>;
};

const authErrorCopy: Record<string, { detail: string; title: string }> = {
  "missing-code": {
    title: "GitHub did not return an authorization code.",
    detail: "The authorization step was interrupted before Gimit could verify your GitHub account.",
  },
  state: {
    title: "GitHub could not verify this sign-in request.",
    detail: "The security check for this OAuth session did not match. This can happen after a stale tab or expired setup session.",
  },
  credentials: {
    title: "GitHub OAuth credentials are missing.",
    detail: "Gimit could not find the OAuth App details for this local workspace.",
  },
  token: {
    title: "GitHub could not complete the token exchange.",
    detail: "The OAuth App details or callback URL may not match the app configured in GitHub.",
  },
};

export default async function GitHubAuthErrorPage({ searchParams }: GitHubAuthErrorPageProps) {
  const params = await searchParams;
  const copy = authErrorCopy[params.reason || ""] || {
    title: "GitHub sign-in could not be completed.",
    detail: "Something went wrong while GitHub was returning you to Gimit.",
  };

  return (
    <main className="page-shell auth-error-shell">
      <section className="panel empty-state fade-in-card auth-error-panel">
        <span className="eyebrow">GitHub OAuth</span>
        <h1>{copy.title}</h1>
        <p className="hero-copy">{copy.detail}</p>
        <div className="cta-row">
          <Link className="primary-button" href="/?setup=1&github=failed">
            Return to GitHub setup
          </Link>
          <Link className="secondary-button" href="/profile?demo=1">
            Continue with Demo
          </Link>
        </div>
      </section>
    </main>
  );
}
