"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  contributorProfileStorageName,
  githubAnalysisStorageName,
  recommendationStorageName,
  recommendationUpdatedStorageName,
  seenRepositoryStorageName,
} from "@/lib/settings";
import type { GitHubProfileAnalysis } from "@/types";

const loadingMessages = [
  "Analyzing your profile...",
  "Finding active repositories...",
  "Ranking repositories...",
  "Preparing recommendations...",
  "Almost ready...",
];

export function ProfileAnalysis() {
  const [analysis, setAnalysis] = useState<GitHubProfileAnalysis | null>(null);
  const [error, setError] = useState("");
  const [loadingIndex, setLoadingIndex] = useState(0);

  useEffect(() => {
    const demoMode = new URLSearchParams(window.location.search).get("demo") === "1";
    const timer = window.setInterval(() => {
      setLoadingIndex((current) => Math.min(current + 1, loadingMessages.length - 1));
    }, 900);

    fetch(demoMode ? "/api/github/profile?demo=1" : "/api/github/profile")
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) {
          throw new Error(body.error || "Profile analysis failed.");
        }
        return body as GitHubProfileAnalysis;
      })
      .then((profile) => {
        window.clearInterval(timer);
        setAnalysis(profile);
        window.localStorage.setItem(
          contributorProfileStorageName,
          JSON.stringify(profile.contributorProfile),
        );
        window.localStorage.setItem(githubAnalysisStorageName, JSON.stringify(profile));
        window.localStorage.removeItem(recommendationStorageName);
        window.localStorage.removeItem(recommendationUpdatedStorageName);
        if (profile.recommendedRepositories?.length) {
          window.sessionStorage.setItem(
            recommendationStorageName,
            JSON.stringify(profile.recommendedRepositories),
          );
          window.sessionStorage.setItem(recommendationUpdatedStorageName, new Date().toISOString());
          window.sessionStorage.setItem(
            seenRepositoryStorageName,
            JSON.stringify(profile.recommendedRepositories.map((repository) => repository.id)),
          );
        }
      })
      .catch((requestError) => {
        window.clearInterval(timer);
        setError(requestError instanceof Error ? requestError.message : "Profile analysis failed.");
      });

    return () => window.clearInterval(timer);
  }, []);

  if (error) {
    return (
      <section className="panel empty-state fade-in-card">
        <span className="eyebrow">GitHub Connection</span>
        <h1>We could not read your profile.</h1>
        <p className="hero-copy">{error}</p>
        <a className="primary-button" href="/api/auth/github">
          Connect GitHub again
        </a>
      </section>
    );
  }

  if (!analysis) {
    return (
      <section className="panel analysis-loading fade-in-card" aria-busy="true" aria-live="polite">
        <span className="eyebrow">Deterministic Profile Analysis</span>
        <h1>{loadingMessages[loadingIndex]}</h1>
        <div className="progress-track">
          <span />
        </div>
        <div className="ai-skeleton" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <p className="hero-copy">
          Languages, topics, repository history, activity, organizations, and public contribution
          signals. No AI call.
        </p>
      </section>
    );
  }

  return (
    <div className="profile-shell">
      {analysis.demo ? (
        <div className="logic-note fade-in-card">
          <span className="logic-icon">D</span>
          <p>
            GitHub OAuth is not configured locally, so this preview uses a representative
            developer profile.
          </p>
        </div>
      ) : null}
      <section className="profile-hero fade-in-card">
        <img alt="" className="profile-avatar" src={analysis.avatarUrl} />
        <div>
          <span className="eyebrow">Profile Analysis Complete</span>
          <h1>{analysis.name}</h1>
          <p className="hero-copy">
            @{analysis.login} · {analysis.bio}
          </p>
        </div>
        <div className="readiness-score">
          <span className="meta-label">Open Source Readiness</span>
          <strong>{analysis.readiness.score}%</strong>
          <span>{analysis.readiness.label}</span>
        </div>
      </section>

      <section className="analysis-grid">
        <article className="panel analysis-main fade-in-card">
          <div className="panel-header">
            <span className="eyebrow">Explainable Analysis</span>
            <h2>Your public work, translated into contribution signals.</h2>
          </div>
          <div className="stats-grid profile-stats">
            <div className="stat-line">
              <span className="meta-label">Public Repositories</span>
              <strong>{analysis.publicRepositories}</strong>
            </div>
            <div className="stat-line">
              <span className="meta-label">Total Stars</span>
              <strong>{analysis.totalStars}</strong>
            </div>
            <div className="stat-line">
              <span className="meta-label">Recently Active</span>
              <strong>{analysis.recentRepositories}</strong>
            </div>
            <div className="stat-line">
              <span className="meta-label">Followers</span>
              <strong>{analysis.followers}</strong>
            </div>
            <div className="stat-line">
              <span className="meta-label">Following</span>
              <strong>{analysis.following}</strong>
            </div>
            <div className="stat-line">
              <span className="meta-label">Organizations</span>
              <strong>{analysis.organizations.length}</strong>
            </div>
            <div className="stat-line">
              <span className="meta-label">Pinned Repositories</span>
              <strong>{analysis.pinnedRepositories.length}</strong>
            </div>
            <div className="stat-line">
              <span className="meta-label">Recent Events</span>
              <strong>{analysis.recentActivity.length}</strong>
            </div>
          </div>
          <div className="analysis-section">
            <span className="meta-label">Languages</span>
            <div className="signal-list">
              {analysis.languages.map((item) => (
                <span className="summary-pill" key={item.name}>
                  {item.name} · {item.count}
                </span>
              ))}
            </div>
          </div>
          <div className="analysis-section">
            <span className="meta-label">Frameworks & Topics</span>
            <div className="signal-list">
              {[...analysis.frameworks, ...analysis.topics.slice(0, 6).map((item) => item.name)].map(
                (item) => (
                  <span className="summary-pill" key={item}>
                    {item}
                  </span>
                ),
              )}
            </div>
          </div>
        </article>

        <aside className="panel analysis-side fade-in-card">
          <div>
            <span className="meta-label">Strengths</span>
            <ul className="reason-list">
              {analysis.strengths.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <span className="meta-label">Growth Areas</span>
            <ul className="reason-list">
              {analysis.weaknesses.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <span className="meta-label">Readiness Evidence</span>
            <ul className="reason-list">
              {analysis.readiness.reasons.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          {analysis.pinnedRepositories.length ? (
            <div>
              <span className="meta-label">Pinned Work</span>
              <ul className="reason-list">
                {analysis.pinnedRepositories.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <Link className="primary-button" href="/repositories">
            View Repository Matches
          </Link>
        </aside>
      </section>
    </div>
  );
}
