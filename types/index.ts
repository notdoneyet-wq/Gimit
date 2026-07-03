export type RepositoryStatus = "Maintained" | "Archived";

export type Repository = {
  id: number;
  name: string;
  owner: string;
  description: string;
  url?: string;
  languages: string[];
  frameworks: string[];
  tools: string[];
  interests: string[];
  tags: string[];
  topics: string[];
  stars: number;
  forks: number;
  goodFirstIssues: number;
  helpWantedIssues?: number;
  lastUpdatedDaysAgo: number;
  recentCommits: number;
  documentationQuality: number;
  activeContributors: number;
  issueResponseHours: number;
  setupMinutes: number;
  status: RepositoryStatus;
  estimatedTime: string;
};

export type RepositoryInsights = {
  recommended: boolean;
  recommendation: "pick" | "stretch" | null;
  matchScore: number;
  confidenceScore: number;
  activityScore: number;
  healthLabel: string;
  healthDetails: {
    documentationLabel: string;
    issueResponseLabel: string;
    recencyLabel: string;
  };
  whyPicked: string[];
  requirements: string[];
  statusBadges: Array<{
    label: string;
    tone: "neutral" | "accent" | "gold";
  }>;
};

export type RepositoryDiscoveryOptions = {
  seenRepositoryIds?: number[];
};

export type ContributorProfile = {
  languages: string[];
  frameworks: string[];
  interests: string[];
  tools: string[];
};

export type GitHubProfileAnalysis = {
  login: string;
  name: string;
  avatarUrl: string;
  bio: string;
  githubUrl: string;
  publicRepositories: number;
  followers: number;
  following: number;
  organizations: string[];
  totalStars: number;
  recentRepositories: number;
  pinnedRepositories: string[];
  recentActivity: string[];
  languages: Array<{ name: string; count: number }>;
  topics: Array<{ name: string; count: number }>;
  frameworks: string[];
  skills: string[];
  interests: string[];
  strengths: string[];
  weaknesses: string[];
  readiness: {
    score: number;
    label: string;
    reasons: string[];
  };
  contributorProfile: ContributorProfile;
  recommendedRepositories?: Repository[];
  demo?: boolean;
};

export type SortOption =
  | "Best Match"
  | "Most Stars"
  | "Recently Updated"
  | "Most Active"
  | "Beginner Friendly";

export type AiProviderId = "gemini" | "openai" | "claude";

export type AiTaskId =
  | "repository-summary"
  | "issue-explainer"
  | "roadmap"
  | "pr-planner"
  | "learning-path";

export type AiProviderOption = {
  id: AiProviderId;
  name: string;
  description: string;
};

export type AiTaskOption = {
  id: AiTaskId;
  name: string;
  description: string;
  buttonLabel: string;
  inputLabel: string;
  inputPlaceholder: string;
  inputRequired: boolean;
  timeline: string[];
};

export type AiTaskRequest = {
  provider: AiProviderId;
  apiKey: string;
  task?: AiTaskId;
  repository?: Repository;
  userContext?: string;
  action: "test" | "generate";
};
