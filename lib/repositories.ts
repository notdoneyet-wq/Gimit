import type {
  ContributorProfile,
  GitHubProfileAnalysis,
  Repository,
  RepositoryDiscoveryOptions,
  RepositoryInsights,
  SortOption,
} from "@/types";

export const defaultContributorProfile: ContributorProfile = {
  languages: ["Python", "TypeScript"],
  frameworks: ["FastAPI", "Next.js"],
  interests: ["AI", "Web", "Backend", "Cloud"],
  tools: ["Docker", "GitHub"],
};

type GitHubSearchRepository = {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string };
  html_url: string;
  description: string | null;
  language: string | null;
  topics?: string[];
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  archived: boolean;
  fork: boolean;
  size: number;
  updated_at: string;
  pushed_at: string;
};

type GitHubHeaders = Record<string, string>;

const clampScore = (value: number) => Math.max(0, Math.min(99, Math.round(value)));

const frameworkTopics: Record<string, string> = {
  react: "React",
  nextjs: "Next.js",
  "next-js": "Next.js",
  fastapi: "FastAPI",
  django: "Django",
  flask: "Flask",
  svelte: "Svelte",
  vue: "Vue",
  angular: "Angular",
  "react-native": "React Native",
  pytorch: "PyTorch",
  tensorflow: "TensorFlow",
  express: "Express",
  nodejs: "Node.js",
  "node-js": "Node.js",
  rails: "Rails",
  spring: "Spring",
  tokio: "Tokio",
};

const interestTopics: Record<string, string> = {
  ai: "AI",
  "machine-learning": "AI",
  "artificial-intelligence": "AI",
  frontend: "Frontend",
  backend: "Backend",
  web: "Web",
  cloud: "Cloud",
  devops: "DevOps",
  security: "Cybersecurity",
  mobile: "App Development",
  "computer-vision": "Computer Vision",
  documentation: "Documentation",
  "developer-tools": "Developer Tools",
};

const languageTools: Record<string, string[]> = {
  TypeScript: ["GitHub Actions"],
  JavaScript: ["Node.js"],
  Python: ["Pytest"],
  Go: ["Docker"],
  Rust: ["Cargo"],
  Java: ["Maven"],
};

const discoveryCategories: Record<string, string[]> = {
  AI: ["machine-learning", "ai", "pytorch", "tensorflow", "llm"],
  "Web Development": ["web", "fullstack", "api", "typescript", "javascript"],
  Frontend: ["frontend", "react", "nextjs", "vue", "svelte"],
  Backend: ["backend", "api", "fastapi", "nodejs", "django"],
  "Full Stack": ["fullstack", "nextjs", "nodejs", "database"],
  DevOps: ["devops", "docker", "kubernetes", "github-actions", "ci-cd"],
  Mobile: ["mobile", "react-native", "android", "ios", "flutter"],
  "Data Science": ["data-science", "python", "notebooks", "analytics"],
  Cybersecurity: ["security", "cybersecurity", "security-tools"],
  "Open Source Tools": ["open-source", "cli", "automation"],
  "Developer Tools": ["developer-tools", "dx", "cli", "productivity"],
  Cloud: ["cloud", "cloud-native", "aws", "serverless"],
  APIs: ["api", "rest-api", "graphql", "openapi"],
  "Beginner Projects": ["good-first-issue", "beginner-friendly", "first-timers-only"],
  "System Design": ["distributed-systems", "systems", "observability", "database"],
};

const adjacentTopics: Record<string, string[]> = {
  React: ["nextjs", "testing-library", "storybook", "graphql"],
  "Next.js": ["react", "vercel", "edge", "serverless"],
  TypeScript: ["nodejs", "graphql", "testing", "github-actions"],
  JavaScript: ["nodejs", "typescript", "testing", "webpack"],
  Python: ["fastapi", "data-science", "testing", "docker"],
  FastAPI: ["python", "api", "openapi", "docker"],
  Backend: ["docker", "ci-cd", "database", "graphql"],
  Frontend: ["testing-library", "storybook", "accessibility", "design-systems"],
  Cloud: ["terraform", "kubernetes", "observability", "docker"],
  AI: ["data-science", "python", "notebooks", "computer-vision"],
};

const starRanges = ["stars:20..300", "stars:300..1500", "stars:1500..8000", "stars:>8000"];
const sizeRanges = ["size:50..8000", "size:8000..50000", "size:50000..180000"];
const sortModes = ["updated", "stars", "help-wanted-issues"] as const;

const daysSince = (date: string) => {
  const timestamp = new Date(date).getTime();
  if (Number.isNaN(timestamp)) {
    return 365;
  }
  return Math.max(0, Math.floor((Date.now() - timestamp) / 86400000));
};

const getDifficultyLabel = (repository: Repository) => {
  if (repository.goodFirstIssues + (repository.helpWantedIssues || 0) >= 16) {
    return "Easy";
  }

  if (repository.goodFirstIssues + (repository.helpWantedIssues || 0) >= 7) {
    return "Medium";
  }

  return "Hard";
};

const getEstimatedSetupTime = (
  repository: GitHubSearchRepository,
  hasReadme: boolean,
  languageCount: number,
) => {
  const languageCost =
    repository.language === "Java" || repository.language === "C++" || repository.language === "Rust"
      ? 16
      : repository.language === "Go" || repository.language === "Python"
        ? 10
        : 8;
  const sizeCost = Math.min(Math.round(repository.size / 8500), 18);
  const docsDiscount = hasReadme ? 8 : 0;
  return Math.max(8, Math.min(70, languageCost + sizeCost + languageCount * 3 - docsDiscount));
};

const setupLabel = (minutes: number) => {
  if (minutes <= 15) {
    return "1-3 hours";
  }
  if (minutes <= 30) {
    return "3-6 hours";
  }
  if (minutes <= 45) {
    return "6-10 hours";
  }
  return "10+ hours";
};

const parseLastPageCount = (linkHeader: string | null, fallback: number) => {
  if (!linkHeader) {
    return fallback;
  }

  const match = linkHeader.match(/[?&]page=(\d+)>;\s*rel="last"/);
  return match ? Number(match[1]) : fallback;
};

const githubJson = async <T>(url: string, headers: GitHubHeaders, fallback: T): Promise<T> => {
  try {
    const response = await fetch(url, { headers, next: { revalidate: 900 } });
    if (!response.ok) {
      return fallback;
    }
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
};

const githubCount = async (url: string, headers: GitHubHeaders) => {
  try {
    const response = await fetch(url, { headers, next: { revalidate: 900 } });
    if (!response.ok) {
      return 0;
    }
    const body = (await response.json()) as { total_count?: number };
    return body.total_count || 0;
  } catch {
    return 0;
  }
};

const githubCommitCount = async (fullName: string, headers: GitHubHeaders) => {
  const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString();
  const url = `https://api.github.com/repos/${fullName}/commits?since=${encodeURIComponent(since)}&per_page=1`;
  try {
    const response = await fetch(url, { headers, next: { revalidate: 900 } });
    if (!response.ok) {
      return 0;
    }
    const commits = (await response.json()) as unknown[];
    return parseLastPageCount(response.headers.get("link"), commits.length);
  } catch {
    return 0;
  }
};

const normalizeTopic = (value: string) => value.toLowerCase().replace(/\s+/g, "-");

const hashText = (value: string) =>
  [...value].reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) % 100000, 17);

const pickRotating = <T,>(items: T[], count: number, seed: number) => {
  if (!items.length) {
    return [];
  }

  return Array.from({ length: Math.min(count, items.length) }, (_, index) => items[(seed + index) % items.length]);
};

const uniqueValues = (items: string[]) => [...new Set(items.map(normalizeTopic).filter(Boolean))];

const profileDiscoveryTopics = (analysis: GitHubProfileAnalysis) => {
  const directTopics = uniqueValues([
    ...analysis.contributorProfile.frameworks,
    ...analysis.contributorProfile.interests,
    ...analysis.topics.slice(0, 8).map((item) => item.name),
    ...analysis.skills,
  ]);
  const adjacent = uniqueValues(
    [
      ...analysis.contributorProfile.frameworks,
      ...analysis.contributorProfile.interests,
      ...analysis.contributorProfile.languages,
    ].flatMap((item) => adjacentTopics[item] || []),
  );
  const categoryTopics = uniqueValues(
    analysis.contributorProfile.interests.flatMap((interest) => discoveryCategories[interest] || []),
  );

  return {
    direct: uniqueValues([...directTopics, ...categoryTopics]),
    adjacent,
  };
};

const buildSearchQueries = (analysis: GitHubProfileAnalysis, seenRepositoryIds: number[] = []) => {
  const cutoff = new Date(Date.now() - 1000 * 60 * 60 * 24 * 180).toISOString().slice(0, 10);
  const languages = analysis.contributorProfile.languages.slice(0, 4);
  const { direct, adjacent } = profileDiscoveryTopics(analysis);
  const seed =
    hashText(`${analysis.login}-${new Date().toDateString()}-${seenRepositoryIds.length}`) +
    Math.floor(Date.now() / 45000);
  const base = `archived:false fork:false pushed:>=${cutoff}`;
  const matchedTopics = pickRotating(direct, 10, seed);
  const adjacentPicks = pickRotating(adjacent, 4, seed + 3);
  const languageQueries = languages.flatMap((language, index) => [
    {
      q: `${base} language:${language} ${starRanges[(seed + index) % starRanges.length]}`,
      sort: sortModes[(seed + index) % sortModes.length],
      page: ((seed + index) % 4) + 1,
    },
    {
      q: `${base} language:${language} good-first-issues ${sizeRanges[(seed + index) % sizeRanges.length]}`,
      sort: "updated" as const,
      page: ((seed + index + 1) % 3) + 1,
    },
  ]);
  const topicQueries = matchedTopics.map((topic, index) => ({
    q: `${base} topic:${topic} ${index % 2 === 0 ? "good-first-issues" : "help-wanted"} ${starRanges[(seed + index) % starRanges.length]}`,
    sort: sortModes[(seed + index + 1) % sortModes.length],
    page: ((seed + index + 2) % 5) + 1,
  }));
  const explorationQueries = adjacentPicks.map((topic, index) => ({
    q: `${base} topic:${topic} ${sizeRanges[(seed + index) % sizeRanges.length]}`,
    sort: sortModes[(seed + index + 2) % sortModes.length],
    page: ((seed + index + 3) % 4) + 1,
  }));

  return [...languageQueries, ...topicQueries, ...explorationQueries].slice(0, 22);
};

const mapCandidate = async (
  repository: GitHubSearchRepository,
  headers: GitHubHeaders,
): Promise<Repository | null> => {
  if (repository.archived || repository.fork || !repository.description || repository.size <= 0) {
    return null;
  }

  const fullName = repository.full_name;
  const [languages, readme, goodFirstIssues, helpWantedIssues, contributors, recentCommits] =
    await Promise.all([
      githubJson<Record<string, number>>(
        `https://api.github.com/repos/${fullName}/languages`,
        headers,
        repository.language ? { [repository.language]: 1 } : {},
      ),
      fetch(`https://api.github.com/repos/${fullName}/readme`, {
        headers,
        next: { revalidate: 900 },
      }).then((response) => response.ok).catch(() => false),
      githubCount(
        `https://api.github.com/search/issues?q=${encodeURIComponent(`repo:${fullName} state:open label:"good first issue"`)}`,
        headers,
      ),
      githubCount(
        `https://api.github.com/search/issues?q=${encodeURIComponent(`repo:${fullName} state:open label:"help wanted"`)}`,
        headers,
      ),
      githubJson<Array<{ id: number }>>(
        `https://api.github.com/repos/${fullName}/contributors?per_page=20`,
        headers,
        [],
      ),
      githubCommitCount(fullName, headers),
    ]);

  if (!goodFirstIssues && !helpWantedIssues) {
    return null;
  }

  const languageNames = Object.keys(languages);
  const topics = repository.topics || [];
  const frameworks = [
    ...new Set(
      topics.flatMap((topic) => (frameworkTopics[topic.toLowerCase()] ? [frameworkTopics[topic.toLowerCase()]] : [])),
    ),
  ];
  const interests = [
    ...new Set(
      topics.flatMap((topic) => (interestTopics[topic.toLowerCase()] ? [interestTopics[topic.toLowerCase()]] : [])),
    ),
  ];
  const setupMinutes = getEstimatedSetupTime(repository, readme, languageNames.length);
  const lastUpdatedDaysAgo = daysSince(repository.pushed_at || repository.updated_at);
  const documentationQuality = Math.min(
    99,
    (readme ? 62 : 28) +
      Math.min((repository.description || "").length, 140) * 0.12 +
      Math.min(topics.length * 4, 20),
  );

  return {
    id: repository.id,
    name: repository.name,
    owner: repository.owner.login,
    description: repository.description,
    url: repository.html_url,
    languages: languageNames.length ? languageNames : repository.language ? [repository.language] : [],
    frameworks,
    tools: [
      "GitHub",
      ...new Set(languageNames.flatMap((language) => languageTools[language] || [])),
    ].slice(0, 6),
    interests: interests.length ? interests : topics.slice(0, 4),
    tags: [
      ...topics.slice(0, 5),
      goodFirstIssues ? "good-first-issue" : "",
      helpWantedIssues ? "help-wanted" : "",
    ].filter(Boolean),
    topics,
    stars: repository.stargazers_count,
    forks: repository.forks_count,
    goodFirstIssues,
    helpWantedIssues,
    lastUpdatedDaysAgo,
    recentCommits,
    documentationQuality: Math.round(documentationQuality),
    activeContributors: contributors.length,
    issueResponseHours: Math.max(4, Math.min(96, lastUpdatedDaysAgo * 8)),
    setupMinutes,
    status: "Maintained",
    estimatedTime: setupLabel(setupMinutes),
  };
};

export async function collectGitHubRepositories(
  analysis: GitHubProfileAnalysis,
  headers: GitHubHeaders,
  options: RepositoryDiscoveryOptions = {},
) {
  const seenRepositoryIds = new Set(options.seenRepositoryIds || []);
  const queries = buildSearchQueries(analysis, [...seenRepositoryIds]);
  const searchPages = await Promise.all(
    queries.map((strategy) =>
      githubJson<{ items?: GitHubSearchRepository[] }>(
        `https://api.github.com/search/repositories?q=${encodeURIComponent(strategy.q)}&sort=${strategy.sort}&order=desc&per_page=10&page=${strategy.page}`,
        headers,
        { items: [] },
      ),
    ),
  );
  const deduped = new Map<number, GitHubSearchRepository>();

  searchPages
    .flatMap((page) => page.items || [])
    .filter((repository) => !repository.archived && !repository.fork && repository.open_issues_count > 0)
    .forEach((repository) => deduped.set(repository.id, repository));

  const candidates = [...deduped.values()]
    .sort((left, right) => {
      const leftSeenPenalty = seenRepositoryIds.has(left.id) ? 1 : 0;
      const rightSeenPenalty = seenRepositoryIds.has(right.id) ? 1 : 0;
      if (leftSeenPenalty !== rightSeenPenalty) {
        return leftSeenPenalty - rightSeenPenalty;
      }
      const leftActivity = daysSince(left.pushed_at || left.updated_at);
      const rightActivity = daysSince(right.pushed_at || right.updated_at);
      return leftActivity - rightActivity || right.stargazers_count - left.stargazers_count;
    })
    .slice(0, 44);

  const repositories = (await Promise.all(candidates.map((candidate) => mapCandidate(candidate, headers))))
    .filter((repository): repository is Repository => Boolean(repository));
  const sortedRepositories = sortRepositories(repositories, "Best Match", analysis.contributorProfile);
  const diverseRepositories: Repository[] = [];
  const ownerCounts = new Map<string, number>();
  const languageCounts = new Map<string, number>();

  for (const repository of sortedRepositories) {
    const ownerCount = ownerCounts.get(repository.owner) || 0;
    const primaryLanguage = repository.languages[0] || "Unknown";
    const languageCount = languageCounts.get(primaryLanguage) || 0;
    const alreadySeen = seenRepositoryIds.has(repository.id);

    if (diverseRepositories.length < 18 && !alreadySeen && ownerCount < 2 && languageCount < 8) {
      diverseRepositories.push(repository);
      ownerCounts.set(repository.owner, ownerCount + 1);
      languageCounts.set(primaryLanguage, languageCount + 1);
    }
  }

  if (diverseRepositories.length < 12) {
    for (const repository of sortedRepositories) {
      if (!diverseRepositories.some((item) => item.id === repository.id)) {
        diverseRepositories.push(repository);
      }
      if (diverseRepositories.length >= 18) {
        break;
      }
    }
  }

  return diverseRepositories;
}

export function getRepositoryInsights(
  repository: Repository,
  contributorProfile: ContributorProfile = defaultContributorProfile,
): RepositoryInsights {
  const stackScore =
    Math.min(
      repository.languages.filter((item) => contributorProfile.languages.includes(item)).length *
        18,
      18,
    ) +
    repository.frameworks.filter((item) => contributorProfile.frameworks.includes(item)).length * 12 +
    Math.min(
      repository.tools.filter((item) => contributorProfile.tools.includes(item)).length * 3,
      6,
    ) +
    Math.min(
      repository.interests.filter((item) => contributorProfile.interests.includes(item)).length * 4,
      8,
    );

  const beginnerIssueCount = repository.goodFirstIssues + (repository.helpWantedIssues || 0);
  const issueScore = Math.min(repository.goodFirstIssues * 1.2 + (repository.helpWantedIssues || 0) * 0.6, 14);
  const docsScore = repository.documentationQuality * 0.12;
  const activityScore =
    Math.max(10 - repository.lastUpdatedDaysAgo * 0.7, 0) +
    Math.min(repository.recentCommits * 0.25, 7) +
    Math.min(repository.activeContributors * 0.4, 7);

  const responseScore = Math.max(8 - repository.issueResponseHours * 0.18, 0);
  const setupScore = Math.max(5 - repository.setupMinutes / 8, 0);
  const rawScore = stackScore + issueScore + docsScore + activityScore + responseScore + setupScore;
  const matchScore = clampScore(rawScore);
  const confidenceScore = clampScore(
    repository.documentationQuality * 0.5 +
      Math.max(25 - repository.lastUpdatedDaysAgo, 0) +
      Math.min(beginnerIssueCount * 2, 16) +
      Math.min(repository.activeContributors, 12),
  );
  const recommendation =
    matchScore >= 80
      ? "pick"
      : matchScore >= 68 &&
          confidenceScore >= 90 &&
          repository.documentationQuality >= 88 &&
          repository.lastUpdatedDaysAgo <= 5 &&
          beginnerIssueCount >= 6
        ? "stretch"
        : null;
  const activityLabel = repository.lastUpdatedDaysAgo <= 5 ? "Recent" : "Steady";
  const healthLabel =
    repository.status === "Archived"
      ? "Archived"
      : repository.documentationQuality >= 88 && repository.lastUpdatedDaysAgo <= 14
        ? "Strong"
        : "Healthy";

  const whyPicked: string[] = [];
  const knownLanguage = repository.languages.find((item) => contributorProfile.languages.includes(item));

  if (knownLanguage) {
    whyPicked.push(`You already know ${knownLanguage}.`);
  }
  if (repository.frameworks.some((item) => contributorProfile.frameworks.includes(item))) {
    whyPicked.push("This project uses frameworks matching your profile.");
  }
  if (repository.goodFirstIssues > 0) {
    whyPicked.push(`${repository.goodFirstIssues} open good-first-issue labels were found.`);
  }
  if (repository.helpWantedIssues) {
    whyPicked.push(`${repository.helpWantedIssues} open help-wanted issues were found.`);
  }
  if (repository.activeContributors >= 5 || repository.lastUpdatedDaysAgo <= 7) {
    whyPicked.push("Maintainer activity is visible from recent repository metadata.");
  }
  if (repository.documentationQuality >= 85) {
    whyPicked.push("Documentation is available.");
  }
  if (repository.setupMinutes <= 20) {
    whyPicked.push(`Setup complexity looks low for a ${getDifficultyLabel(repository).toLowerCase()} first pass.`);
  }
  const requirements = [
    ...repository.languages.filter((item) => !contributorProfile.languages.includes(item)),
    ...repository.frameworks.filter((item) => !contributorProfile.frameworks.includes(item)),
    ...repository.tools.filter((item) => !contributorProfile.tools.includes(item) && item !== "GitHub"),
  ].slice(0, 4);
  const statusBadges: RepositoryInsights["statusBadges"] = [];

  if (recommendation === "pick") {
    statusBadges.push({ label: "AI Pick", tone: "accent" });
  }
  if (recommendation === "stretch") {
    statusBadges.push({ label: "Gimit Stretch Pick", tone: "gold" });
  }
  if (beginnerIssueCount >= 7) {
    statusBadges.push({ label: "Beginner Friendly", tone: "neutral" });
  }
  if (repository.lastUpdatedDaysAgo <= 7 || repository.activeContributors >= 8) {
    statusBadges.push({ label: "Active", tone: "neutral" });
  }
  if (repository.documentationQuality >= 88) {
    statusBadges.push({ label: "Great Docs", tone: "neutral" });
  }
  if (repository.setupMinutes <= 20) {
    statusBadges.push({ label: "Fast Setup", tone: "neutral" });
  }

  return {
    recommended: recommendation === "pick",
    recommendation,
    matchScore,
    confidenceScore,
    activityScore: clampScore(activityScore * 2.4),
    healthLabel,
    healthDetails: {
      documentationLabel:
        repository.documentationQuality >= 90
          ? "Excellent"
          : repository.documentationQuality >= 75
            ? "Good"
            : "Needs Work",
      issueResponseLabel:
        repository.lastUpdatedDaysAgo <= 3
          ? "Very Active"
          : repository.lastUpdatedDaysAgo <= 14
            ? "Active"
            : "Slower",
      recencyLabel: activityLabel,
    },
    whyPicked: whyPicked.slice(0, 5),
    requirements,
    statusBadges: statusBadges.slice(0, 4),
  };
}

export function sortRepositories(
  items: Repository[],
  sortBy: SortOption,
  contributorProfile: ContributorProfile = defaultContributorProfile,
) {
  const sorted = [...items];

  sorted.sort((left, right) => {
    const leftInsights = getRepositoryInsights(left, contributorProfile);
    const rightInsights = getRepositoryInsights(right, contributorProfile);

    switch (sortBy) {
      case "Most Stars":
        return right.stars - left.stars;
      case "Recently Updated":
        return left.lastUpdatedDaysAgo - right.lastUpdatedDaysAgo;
      case "Most Active":
        return rightInsights.activityScore - leftInsights.activityScore;
      case "Beginner Friendly":
        return (
          right.goodFirstIssues +
          (right.helpWantedIssues || 0) -
          (left.goodFirstIssues + (left.helpWantedIssues || 0)) ||
          right.documentationQuality - left.documentationQuality
        );
      case "Best Match":
      default:
        return rightInsights.matchScore - leftInsights.matchScore;
    }
  });

  return sorted;
}
