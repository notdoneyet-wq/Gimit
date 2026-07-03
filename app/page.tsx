import { cookies, headers } from "next/headers";
import { HomeActions } from "@/components/HomeActions";

type HomeProps = {
  searchParams: Promise<{ github?: string; setup?: string }>;
};

const localClientIdCookie = "gimit-github-client-id";
const localClientSecretCookie = "gimit-github-client-secret";
const localOriginCookie = "gimit-github-oauth-origin";

const getRequestOrigin = async () => {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") || headerStore.get("host") || "localhost:3000";
  const protocol =
    headerStore.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");

  return `${protocol}://${host}`;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const origin = await getRequestOrigin();
  const cookieStore = await cookies();
  const hasEnvOAuth = Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
  const hasLocalOAuth =
    process.env.NODE_ENV !== "production" &&
    Boolean(cookieStore.get(localClientIdCookie)?.value) &&
    Boolean(cookieStore.get(localClientSecretCookie)?.value) &&
    cookieStore.get(localOriginCookie)?.value === origin;
  const oauthConfigured = hasEnvOAuth || hasLocalOAuth;

  return (
    <main className="page-shell home-shell onboarding-shell">
      <nav className="home-nav fade-in-card" aria-label="Primary">
        <div className="home-brand">
          <span className="brand-mark">G</span>
          <span className="gimit-word">Gimit</span>
        </div>
        <a className="text-link home-demo-link" href="/profile?demo=1">
          Continue with Demo <span aria-hidden="true">&rarr;</span>
        </a>
      </nav>

      <section className="home-hero onboarding-hero fade-in-card">
        <div className="home-hero-copy">
          <span className="eyebrow">Open Source Copilot</span>
          <h1>
            The First Commit Is The Hardest.
            <br />
            <span>We Make It Easy.</span>
          </h1>
          <p className="hero-copy onboarding-copy">
            Gimit analyzes your GitHub profile to recommend repositories that match your skills.
            This takes about 2 minutes and only needs to be done once.
          </p>
        </div>
        <div className="hero-action-stack">
          <HomeActions
            callbackUrl={`${origin}/api/auth/github/callback`}
            githubFailed={params.github === "failed"}
            initialShowSetup={params.setup === "1"}
            oauthConfigured={oauthConfigured}
            origin={origin}
            productionMode={process.env.NODE_ENV === "production"}
          />
          <p className="setup-time">Setup takes about 2 minutes</p>
          <div className="home-demo-row">
            <span>Just exploring?</span>
            <a className="text-link" href="/profile?demo=1">
              Continue with Demo <span aria-hidden="true">&rarr;</span>
            </a>
          </div>
        </div>
      </section>

      <section className="trust-band fade-in-card" aria-labelledby="trust-heading">
        <h2 id="trust-heading">Safe. Private. Built for developers.</h2>
        <div className="trust-grid">
          {[
            ["Read-Only Access", "We only read your public GitHub profile data."],
            ["Never Modify", "We never modify your repositories or data."],
            ["GitHub OAuth", "Authentication happens securely through GitHub."],
            ["Your Data, Yours", "Your credentials stay under your control."],
          ].map(([title, copy], index) => (
            <article className="trust-item" key={title}>
              <span className="trust-icon" aria-hidden="true">
                {index + 1}
              </span>
              <div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="home-process fade-in-card" aria-labelledby="process-heading">
        <h2 id="process-heading">How Gimit works</h2>
        <div className="process-grid">
          {[
            ["1", "Connect GitHub", "Securely connect your GitHub account in seconds."],
            ["2", "We Analyze", "Our engine analyzes your skills, experience, and interests."],
            ["3", "Get Recommendations", "Discover the best repositories to contribute to."],
          ].map(([number, title, copy]) => (
            <article className="process-step" key={number}>
              <span className="process-orb" aria-hidden="true">
                {number}
              </span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
        <div className="journey-callout">
          <span aria-hidden="true">+</span>
          <div>
            <strong>Start your open source journey with confidence.</strong>
            <p>Gimit helps you find the perfect first issue.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
