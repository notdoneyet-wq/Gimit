"use client";

import type { Dispatch, SetStateAction } from "react";
import { useEffect, useMemo, useState } from "react";
import { RepositoryCard } from "@/components/RepositoryCard";
import { interestFilters, repositories as demoRepositories, stackFilters } from "@/data/repositories";
import { getRepositoryInsights, sortRepositories } from "@/lib/repositories";
import {
  bookmarkStorageName,
  contributorProfileStorageName,
  githubAnalysisStorageName,
  recommendationStorageName,
  recommendationUpdatedStorageName,
  seenRepositoryStorageName,
} from "@/lib/settings";
import type { ContributorProfile, GitHubProfileAnalysis, Repository, SortOption } from "@/types";

const sortOptions: SortOption[] = [
  "Best Match",
  "Most Stars",
  "Recently Updated",
  "Most Active",
  "Beginner Friendly",
];

const formatUpdatedAt = (value: string) => {
  const timestamp = new Date(value).getTime();
  if (!timestamp || Number.isNaN(timestamp)) {
    return "Not yet";
  }

  const minutes = Math.floor((Date.now() - timestamp) / 60000);
  if (minutes <= 0) {
    return "Just now";
  }
  if (minutes === 1) {
    return "1 minute ago";
  }
  if (minutes < 60) {
    return `${minutes} minutes ago`;
  }

  const hours = Math.floor(minutes / 60);
  return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
};

export function RepositoryExplorer() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStack, setSelectedStack] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>("Best Match");
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [contributorProfile, setContributorProfile] = useState<ContributorProfile>();
  const [repositories, setRepositories] = useState<Repository[]>(demoRepositories);
  const [usingDemoRepositories, setUsingDemoRepositories] = useState(true);
  const [profileReady, setProfileReady] = useState<boolean | null>(null);
  const [analysis, setAnalysis] = useState<GitHubProfileAnalysis | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const [clockTick, setClockTick] = useState(0);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(bookmarkStorageName);
      if (stored) {
        setBookmarks(JSON.parse(stored));
      }
      const storedProfile = window.localStorage.getItem(contributorProfileStorageName);
      if (storedProfile) {
        setContributorProfile(JSON.parse(storedProfile));
      }
      const storedAnalysis = window.localStorage.getItem(githubAnalysisStorageName);
      if (storedAnalysis) {
        setAnalysis(JSON.parse(storedAnalysis));
      }
      window.localStorage.removeItem(recommendationStorageName);
      window.localStorage.removeItem(recommendationUpdatedStorageName);
      const storedRepositories = window.sessionStorage.getItem(recommendationStorageName);
      if (storedRepositories) {
        const parsedRepositories = JSON.parse(storedRepositories) as Repository[];
        if (parsedRepositories.length) {
          setRepositories(parsedRepositories);
          setUsingDemoRepositories(false);
        }
      }
      setUpdatedAt(window.sessionStorage.getItem(recommendationUpdatedStorageName) || "");
      setProfileReady(Boolean(storedProfile));
    } catch {
      window.localStorage.removeItem(bookmarkStorageName);
      window.localStorage.removeItem(contributorProfileStorageName);
      window.localStorage.removeItem(githubAnalysisStorageName);
      window.localStorage.removeItem(recommendationStorageName);
      window.localStorage.removeItem(recommendationUpdatedStorageName);
      window.sessionStorage.removeItem(recommendationStorageName);
      window.sessionStorage.removeItem(recommendationUpdatedStorageName);
      window.sessionStorage.removeItem(seenRepositoryStorageName);
      setProfileReady(false);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(bookmarkStorageName, JSON.stringify(bookmarks));
  }, [bookmarks]);

  useEffect(() => {
    const timer = window.setInterval(() => setClockTick((current) => current + 1), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const availableStackFilters = useMemo(
    () => [
      ...new Set([
        ...stackFilters,
        ...repositories.flatMap((repository) => [
          ...repository.languages,
          ...repository.frameworks,
          ...repository.tools,
        ]),
      ]),
    ].filter(Boolean),
    [repositories],
  );
  const availableInterestFilters = useMemo(
    () => [
      ...new Set([
        ...interestFilters,
        ...repositories.flatMap((repository) => repository.interests),
      ]),
    ].filter(Boolean),
    [repositories],
  );
  const filteredRepositories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const visibleRepositories = repositories.filter((repository) => {
      const searchableText = [
        repository.name,
        repository.owner,
        repository.description,
        ...repository.languages,
        ...repository.frameworks,
        ...repository.tools,
        ...repository.interests,
        ...repository.tags,
        ...repository.topics,
      ]
        .join(" ")
        .toLowerCase();

      const repositoryStack = [
        ...repository.languages,
        ...repository.frameworks,
        ...repository.tools,
      ];

      const matchesQuery = !query || searchableText.includes(query);
      const matchesStack =
        selectedStack.length === 0 ||
        selectedStack.every((item) => repositoryStack.includes(item));
      const matchesInterest =
        selectedInterests.length === 0 ||
        selectedInterests.every((item) => repository.interests.includes(item));

      return matchesQuery && matchesStack && matchesInterest;
    });

    return sortRepositories(visibleRepositories, sortBy, contributorProfile);
  }, [contributorProfile, repositories, searchQuery, selectedInterests, selectedStack, sortBy]);

  const recommendedCount = filteredRepositories.filter(
    (repository) => getRepositoryInsights(repository, contributorProfile).recommended,
  ).length;
  const averageMatch = filteredRepositories.length
    ? Math.round(
        filteredRepositories.reduce(
          (total, repository) =>
            total + getRepositoryInsights(repository, contributorProfile).matchScore,
          0,
        ) / filteredRepositories.length,
      )
    : 0;
  const beginnerIssues = filteredRepositories.reduce(
    (total, repository) => total + repository.goodFirstIssues + (repository.helpWantedIssues || 0),
    0,
  );
  const metrics = [
    { label: "Average Match Score", value: `${averageMatch}%` },
    { label: "Beginner-Friendly Issues", value: beginnerIssues.toLocaleString() },
    { label: "Repository Source", value: usingDemoRepositories ? "Demo" : "GitHub" },
  ];
  const relativeUpdatedAt = clockTick >= 0 ? formatUpdatedAt(updatedAt) : "Not yet";

  const toggleValue = (
    value: string,
    setSelectedValues: Dispatch<SetStateAction<string[]>>,
  ) => {
    setSelectedValues((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  };

  const toggleBookmark = (repositoryId: number) => {
    setBookmarks((current) =>
      current.includes(repositoryId)
        ? current.filter((item) => item !== repositoryId)
        : [...current, repositoryId],
    );
  };

  const refreshRecommendations = async () => {
    if (!analysis) {
      setRefreshError("Profile analysis is missing. Reconnect GitHub to refresh recommendations.");
      return;
    }

    setRefreshing(true);
    setRefreshError("");

    try {
      const seenRepositoryIds = [
        ...new Set([
          ...repositories.map((repository) => repository.id),
          ...(JSON.parse(
            window.sessionStorage.getItem(seenRepositoryStorageName) || "[]",
          ) as number[]),
        ]),
      ];
      const response = await fetch("/api/github/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis, seenRepositoryIds }),
      });
      const body = (await response.json()) as {
        demo?: boolean;
        error?: string;
        repositories?: Repository[];
        updatedAt?: string;
      };

      if (!response.ok || !body.repositories?.length || !body.updatedAt) {
        throw new Error(body.error || "Recommendations could not be refreshed.");
      }

      setRepositories(body.repositories);
      setUsingDemoRepositories(Boolean(body.demo));
      setUpdatedAt(body.updatedAt);
      window.sessionStorage.setItem(recommendationStorageName, JSON.stringify(body.repositories));
      window.sessionStorage.setItem(recommendationUpdatedStorageName, body.updatedAt);
      window.sessionStorage.setItem(
        seenRepositoryStorageName,
        JSON.stringify([
          ...new Set([...seenRepositoryIds, ...body.repositories.map((repository) => repository.id)]),
        ]),
      );
    } catch (requestError) {
      setRefreshError(
        requestError instanceof Error
          ? requestError.message
          : "Recommendations could not be refreshed.",
      );
    } finally {
      setRefreshing(false);
    }
  };

  if (profileReady === null) {
    return (
      <section className="panel analysis-loading fade-in-card" aria-busy="true">
        <span className="eyebrow">Preparing Recommendations</span>
        <h1>Finding active repositories...</h1>
        <div className="ai-skeleton" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </section>
    );
  }

  if (!profileReady) {
    return (
      <section className="panel empty-state fade-in-card">
        <span className="eyebrow">Profile Required</span>
        <h1>Recommendations start with your GitHub profile.</h1>
        <p className="hero-copy">Connect GitHub first so every match is grounded in your actual languages, interests, and public work.</p>
        <a className="primary-button" href="/api/auth/github">Continue with GitHub</a>
      </section>
    );
  }

  return (
    <div className="explorer-shell">
      <section className="hero-panel compact fade-in-card">
        <div>
          <span className="eyebrow">Repository Discovery</span>
          <h1>Minimal guidance, clear repository fit, and no hidden options.</h1>
          <p className="hero-copy">
            <span className="gimit-word">Gimit</span> keeps every repository visible and uses deterministic signals to explain which
            ones are most contributor-friendly.
          </p>
        </div>
        <div className="hero-stats">
          {metrics.map((metric) => (
            <div className="stat-card" key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </div>
          ))}
          <div className="refresh-card">
            <button
              aria-label="Refresh repository recommendations"
              className="primary-button"
              disabled={refreshing}
              onClick={refreshRecommendations}
              type="button"
            >
              {refreshing ? <span className="button-spinner" aria-hidden="true" /> : null}
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
            <p>Find a new set of repositories based on your current profile.</p>
            <span>Recommendations updated {relativeUpdatedAt}</span>
          </div>
        </div>
      </section>
      {refreshError ? (
        <div className="status-message error fade-in-card" role="alert">
          <p>{refreshError}</p>
        </div>
      ) : null}

      <section className="dashboard-grid">
        <aside className="panel fade-in-card">
          <div className="panel-header">
            <span className="eyebrow">Search & Filters</span>
            <h2>One global search across repositories, owners, descriptions, topics, and tags.</h2>
          </div>
          <input
            aria-label="Search repositories"
            className="search-input"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search repositories, owners, topics, languages..."
            type="search"
          />

          <div className="filter-group">
            <h3>Sorting</h3>
            <div className="filter-list">
              {sortOptions.map((item) => (
                <button
                  aria-pressed={sortBy === item}
                  type="button"
                  className={sortBy === item ? "filter-chip active" : "filter-chip"}
                  key={item}
                  onClick={() => setSortBy(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <h3>Technical Stack</h3>
            <div className="filter-list">
              {availableStackFilters.map((item) => (
                <button
                  aria-pressed={selectedStack.includes(item)}
                  type="button"
                  className={selectedStack.includes(item) ? "filter-chip active" : "filter-chip"}
                  key={item}
                  onClick={() => toggleValue(item, setSelectedStack)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <h3>Interests</h3>
            <div className="filter-list">
              {availableInterestFilters.map((item) => (
                <button
                  aria-pressed={selectedInterests.includes(item)}
                  type="button"
                  className={
                    selectedInterests.includes(item) ? "filter-chip active" : "filter-chip"
                  }
                  key={item}
                  onClick={() => toggleValue(item, setSelectedInterests)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="panel fade-in-card">
          <div className="panel-header split">
            <div>
              <span className="eyebrow">Recommendation Logic</span>
              <h2>Fast, transparent results calculated from repository metadata.</h2>
            </div>
            <div className="summary-stack">
              <span className="summary-pill">{filteredRepositories.length} visible repositories</span>
              <span className="summary-pill">{recommendedCount} strong matches</span>
              <span className="summary-pill">{bookmarks.length} saved</span>
            </div>
          </div>

          <div className="logic-note">
            <span className="logic-icon" aria-hidden="true">
              01
            </span>
            <div>
              <strong>No AI calls are used here.</strong>
              <p>
                Match, health, difficulty, and ordering come from skills, activity,
                documentation, setup time, and beginner issue metadata.
              </p>
            </div>
          </div>

          <div className="repository-grid">
            {filteredRepositories.length ? (
              filteredRepositories.map((repository) => (
                <RepositoryCard
                  bookmarked={bookmarks.includes(repository.id)}
                  contributorProfile={contributorProfile}
                  key={repository.id}
                  onToggleBookmark={toggleBookmark}
                  repository={repository}
                />
              ))
            ) : (
              <section className="empty-state compact-empty">
                <span className="eyebrow">No repositories found.</span>
                <h2>Try refreshing recommendations or adjusting your filters.</h2>
                <button className="primary-button" disabled={refreshing} onClick={refreshRecommendations} type="button">
                  {refreshing ? "Refreshing..." : "Refresh Recommendations"}
                </button>
              </section>
            )}
          </div>
        </section>
      </section>
    </div>
  );
}
