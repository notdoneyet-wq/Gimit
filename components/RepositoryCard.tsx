import Link from "next/link";
import { getRepositoryInsights } from "@/lib/repositories";
import { ContributorProfile, Repository } from "@/types";

type RepositoryCardProps = {
  repository: Repository;
  bookmarked?: boolean;
  contributorProfile?: ContributorProfile;
  onToggleBookmark?: (repositoryId: number) => void;
};

const formatRelativeUpdate = (days: number) => {
  if (days === 0) {
    return "Today";
  }

  if (days === 1) {
    return "1 day ago";
  }

  return `${days} days ago`;
};

const getDifficulty = (repository: Repository) => {
  const beginnerIssues = repository.goodFirstIssues + (repository.helpWantedIssues || 0);

  if (beginnerIssues >= 16) {
    return "Easy";
  }

  if (beginnerIssues >= 7) {
    return "Medium";
  }

  return "Hard";
};

export function RepositoryCard({
  repository,
  bookmarked = false,
  contributorProfile,
  onToggleBookmark,
}: RepositoryCardProps) {
  const insights = getRepositoryInsights(repository, contributorProfile);
  const cardClassName =
    insights.recommendation === "pick"
      ? "repository-card fade-in-card interactive-card gimit-pick-card"
      : insights.recommendation === "stretch"
        ? "repository-card fade-in-card interactive-card stretch-pick-card"
        : "repository-card fade-in-card interactive-card";
  const primaryLanguage = repository.languages[0] || "Multiple";
  const quickFacts = [
    ["Primary Language", primaryLanguage],
    ["Stars", repository.stars.toLocaleString()],
    ["Forks", repository.forks.toLocaleString()],
    ["Good First Issues", repository.goodFirstIssues.toLocaleString()],
    ["Last Updated", formatRelativeUpdate(repository.lastUpdatedDaysAgo)],
    ["Setup", `${repository.setupMinutes} min`],
  ];

  return (
    <article className={cardClassName}>
      <div className="card-head">
        <div>
          <p className="repo-owner">{repository.owner}</p>
          <h3>{repository.name}</h3>
        </div>
        <div className="card-actions">
          {onToggleBookmark ? (
            <button
              aria-label={bookmarked ? "Remove bookmark" : "Bookmark repository"}
              aria-pressed={bookmarked}
              className={bookmarked ? "bookmark-button active" : "bookmark-button"}
              onClick={() => onToggleBookmark(repository.id)}
              type="button"
            >
              Save
            </button>
          ) : null}
        </div>
      </div>

      {insights.statusBadges.length ? (
        <div className="status-badge-row" aria-label="Repository status">
          {insights.statusBadges.map((badge) => (
            <span className={`status-badge ${badge.tone}`} key={badge.label}>
              {badge.label}
            </span>
          ))}
        </div>
      ) : null}

      <p className="repo-description">{repository.description}</p>

      {insights.recommendation === "pick" ? (
        <p className="pick-callout">
          <span className="gimit-word">Gimit</span> Pick · Best fit for your current profile
        </p>
      ) : null}
      {insights.recommendation === "stretch" ? (
        <p className="stretch-warning">
          This repository is slightly beyond your current skill level but offers exceptional
          learning value.
        </p>
      ) : null}

      <div className="quick-facts">
        {quickFacts.map(([label, value]) => (
          <div className="quick-fact" key={label}>
            <span className="meta-label">{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <div className="badge-row">
        <span className="badge">{insights.matchScore}% Match</span>
        <span className="badge">Difficulty: {getDifficulty(repository)}</span>
        <span className="badge">Confidence: {insights.confidenceScore}%</span>
      </div>

      <div className="meta-block">
        <div>
          <span className="meta-label">Repository Health</span>
          <p>
            {insights.healthLabel} / {insights.healthDetails.recencyLabel} commits /{" "}
            {insights.healthDetails.documentationLabel} docs /{" "}
            {insights.healthDetails.issueResponseLabel} maintainer activity
          </p>
        </div>
        <div>
          <span className="meta-label">Technical Stack</span>
          <p>{[...repository.languages, ...repository.frameworks, ...repository.tools].join(" / ")}</p>
        </div>
        <div>
          <span className="meta-label">Why Gimit Picked This</span>
          <ul className="insight-list">
            {insights.whyPicked.map((reason) => (
              <li key={reason}>
                <span aria-hidden="true">OK</span>
                {reason}
              </li>
            ))}
          </ul>
        </div>
        {insights.requirements.length ? (
          <div>
            <span className="meta-label">You'll Need</span>
            <ul className="insight-list need-list">
              {insights.requirements.map((requirement) => (
                <li key={requirement}>
                  <span aria-hidden="true">!</span>
                  {requirement}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="card-link-row">
        <Link className="card-workspace-link" href={`/ai-workspace?repository=${repository.id}`}>
          Open in AI Workspace
          <span aria-hidden="true">&rarr;</span>
        </Link>
        {repository.url ? (
          <a className="card-workspace-link" href={repository.url} rel="noreferrer" target="_blank">
            View on GitHub
            <span aria-hidden="true">&rarr;</span>
          </a>
        ) : null}
      </div>
    </article>
  );
}
