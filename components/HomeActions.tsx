"use client";

import { useMemo, useState } from "react";

type HomeActionsProps = {
  callbackUrl: string;
  githubFailed: boolean;
  initialShowSetup?: boolean;
  oauthConfigured: boolean;
  origin: string;
  productionMode: boolean;
};

const developerSettingsUrl = "https://github.com/settings/developers";
const setupGuideUrl =
  "https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app";

const hasWhitespace = (value: string) => /\s/.test(value);

const validateClientId = (value: string) => {
  if (!value.trim()) {
    return "Client ID is required.";
  }

  if (value.trim().length < 10 || hasWhitespace(value)) {
    return "This does not look like a GitHub Client ID.";
  }

  return "";
};

const validateClientSecret = (value: string) => {
  if (!value.trim()) {
    return "Client Secret is required.";
  }

  if (value.trim().length < 20 || hasWhitespace(value)) {
    return "This does not look like a GitHub Client Secret.";
  }

  return "";
};

export function HomeActions({
  callbackUrl,
  githubFailed,
  initialShowSetup = false,
  oauthConfigured,
  origin,
  productionMode,
}: HomeActionsProps) {
  const [showSetup, setShowSetup] = useState(initialShowSetup);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [copiedField, setCopiedField] = useState("");
  const [openedGitHub, setOpenedGitHub] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(
    githubFailed ? "GitHub could not verify that configuration. Please check the app details." : "",
  );
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  const clientIdError = clientId ? validateClientId(clientId) : "";
  const clientSecretError = clientSecret ? validateClientSecret(clientSecret) : "";
  const canSubmit =
    !productionMode &&
    !validateClientId(clientId) &&
    !validateClientSecret(clientSecret) &&
    !verifying &&
    !verified;
  const checklist = useMemo(
    () => [
      { label: "OAuth App Created", done: openedGitHub },
      { label: "Client ID Added", done: !validateClientId(clientId) },
      { label: "Client Secret Added", done: !validateClientSecret(clientSecret) },
      { label: "Configuration Verified", done: verified },
      { label: "Ready to Analyze Profile", done: oauthConfigured || verified },
    ],
    [clientId, clientSecret, oauthConfigured, openedGitHub, verified],
  );

  const copyValue = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(label);
      window.setTimeout(() => setCopiedField(""), 1400);
    } catch {
      setError("Copy was blocked by the browser. You can still select and copy the value.");
    }
  };

  const configure = async () => {
    const nextClientIdError = validateClientId(clientId);
    const nextClientSecretError = validateClientSecret(clientSecret);

    if (nextClientIdError || nextClientSecretError) {
      setError(nextClientIdError || nextClientSecretError);
      return;
    }

    setVerifying(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/auth/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: clientId.trim(),
          clientSecret: clientSecret.trim(),
          origin,
        }),
      });
      const body = (await response.json()) as { error?: string; ok?: boolean };

      if (!response.ok || !body.ok) {
        throw new Error(body.error || "GitHub configuration could not be saved.");
      }

      setVerified(true);
      setMessage("GitHub configured successfully. Ready to analyze your profile.");
      window.setTimeout(() => {
        window.location.assign("/api/auth/github");
      }, 900);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "GitHub configuration could not be saved.",
      );
    } finally {
      setVerifying(false);
    }
  };

  if (oauthConfigured && !showSetup) {
    return (
      <div className="home-actions onboarding-actions">
        <a className="primary-button github-button" href="/api/auth/github">
          <span aria-hidden="true">+</span>
          Continue with GitHub
        </a>
        {githubFailed ? (
          <div className="status-message error fade-in-card" role="alert">
            <p>GitHub could not complete sign in. Please try connecting again.</p>
          </div>
        ) : null}
      </div>
    );
  }

  if (!showSetup) {
    return (
      <div className="home-actions onboarding-actions">
        <button className="primary-button github-button" onClick={() => setShowSetup(true)} type="button">
          <span aria-hidden="true">+</span>
          Continue with GitHub
        </button>
      </div>
    );
  }

  return (
    <div className="home-actions onboarding-actions setup-layout">
      <section className="setup-wizard fade-in-card" aria-label="GitHub OAuth setup wizard">
        <div className="setup-header">
          <span className="eyebrow">Two-Minute Setup</span>
          <h2>Connect a GitHub OAuth App.</h2>
          <p>
            Production deployments should use secure server-side environment variables. This local
            setup is development-only and scoped to this browser environment.
          </p>
        </div>

        <div className="setup-step">
          <span className="step-index">01</span>
          <div>
            <h3>Create a GitHub OAuth App.</h3>
            <p>Use GitHub's official developer settings. Keep this page open for the URLs below.</p>
            <a
              className="secondary-button"
              href={developerSettingsUrl}
              onClick={() => setOpenedGitHub(true)}
              rel="noreferrer"
              target="_blank"
            >
              Open GitHub Developer Settings
            </a>
          </div>
        </div>

        <div className="setup-step">
          <span className="step-index">02</span>
          <div>
            <h3>Use these URLs in GitHub.</h3>
            <div className="copy-field">
              <label htmlFor="homepage-url">Homepage URL</label>
              <input id="homepage-url" readOnly value={origin} />
              <button onClick={() => copyValue("homepage", origin)} type="button">
                {copiedField === "homepage" ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="copy-field">
              <label htmlFor="callback-url">Authorization Callback URL</label>
              <input id="callback-url" readOnly value={callbackUrl} />
              <button onClick={() => copyValue("callback", callbackUrl)} type="button">
                {copiedField === "callback" ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        </div>

        <div className="setup-step">
          <span className="step-index">03</span>
          <div>
            <h3>Add your app credentials.</h3>
            {productionMode ? (
              <p className="status-message error">
                For production, add GitHub OAuth credentials as server-side environment variables:
                GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.
              </p>
            ) : null}
            <label className="field-label" htmlFor="github-client-id">
              Client ID
            </label>
            <input
              autoComplete="off"
              className="search-input"
              disabled={productionMode || verifying || verified}
              id="github-client-id"
              onChange={(event) => setClientId(event.target.value)}
              placeholder="Paste your GitHub Client ID"
              value={clientId}
            />
            {clientIdError ? <p className="field-error">{clientIdError}</p> : null}
            <label className="field-label" htmlFor="github-client-secret">
              Client Secret
            </label>
            <input
              autoComplete="off"
              className="search-input"
              disabled={productionMode || verifying || verified}
              id="github-client-secret"
              onChange={(event) => setClientSecret(event.target.value)}
              placeholder="Paste your GitHub Client Secret"
              type="password"
              value={clientSecret}
            />
            {clientSecretError ? <p className="field-error">{clientSecretError}</p> : null}
          </div>
        </div>

        <div className="setup-step">
          <span className={verified ? "success-check" : "step-index"}>{verified ? "OK" : "04"}</span>
          <div>
            <h3>{verified ? "GitHub configured successfully." : "Connect GitHub."}</h3>
            <p>
              {verified
                ? "Ready to analyze your profile."
                : "Gimit will start GitHub's official OAuth flow after setup is verified."}
            </p>
            <button
              className="primary-button"
              disabled={!canSubmit}
              onClick={configure}
              type="button"
            >
              {verifying ? <span className="button-spinner" aria-hidden="true" /> : null}
              {verified ? "Starting GitHub..." : verifying ? "Verifying..." : "Connect GitHub"}
            </button>
          </div>
        </div>

        {message ? <p className="status-message success fade-in-card">{message}</p> : null}
        {error ? (
          <div className="status-message error fade-in-card" role="alert">
            <p>{error}</p>
          </div>
        ) : null}
      </section>

      <aside className="setup-side fade-in-card">
        <div className="setup-card">
          <h3>Setup Checklist</h3>
          <ul className="setup-checklist">
            {checklist.map((item) => (
              <li className={item.done ? "done" : ""} key={item.label}>
                <span aria-hidden="true">{item.done ? "OK" : "-"}</span>
                {item.label}
              </li>
            ))}
          </ul>
        </div>
        <div className="setup-card">
          <h3>Why does Gimit need GitHub?</h3>
          <ul className="reason-list">
            <li>Analyze your programming skills.</li>
            <li>Detect technologies you already know.</li>
            <li>Recommend repositories matching your experience.</li>
            <li>Generate personalized contribution roadmaps.</li>
          </ul>
          <p>Gimit never modifies your GitHub account.</p>
        </div>
        <div className="setup-card">
          <h3>Trust</h3>
          <ul className="setup-checklist compact">
            <li className="done">
              <span aria-hidden="true">OK</span>
              Development credentials stay on this machine.
            </li>
            <li className="done">
              <span aria-hidden="true">OK</span>
              OAuth follows GitHub's official authentication flow.
            </li>
            <li className="done">
              <span aria-hidden="true">OK</span>
              Gimit only requests the permissions it needs.
            </li>
          </ul>
        </div>
        <div className="setup-help">
          <span>Need help setting up GitHub OAuth?</span>
          <a href={setupGuideUrl} rel="noreferrer" target="_blank">
            Read Setup Guide
          </a>
        </div>
        <div className="demo-entry">
          <span>Just exploring Gimit?</span>
          <p>You can explore Gimit using a sample developer profile without configuring GitHub OAuth.</p>
          <a className="secondary-button muted-button" href="/profile?demo=1">
            Continue with Demo Profile
          </a>
        </div>
      </aside>
    </div>
  );
}
