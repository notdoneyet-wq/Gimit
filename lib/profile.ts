import type { GitHubProfileAnalysis } from "@/types";

type GitHubUser = {
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  html_url: string;
  public_repos: number;
  followers: number;
  following?: number;
};

export type GitHubRepository = {
  name?: string;
  full_name?: string;
  language: string | null;
  languages?: Record<string, number>;
  topics?: string[];
  stargazers_count: number;
  forks_count?: number;
  fork: boolean;
  archived: boolean;
  has_issues: boolean;
  description: string | null;
  updated_at: string;
  pushed_at?: string;
};

type AnalysisExtras = {
  organizations?: string[];
  pinnedRepositories?: string[];
  recentActivity?: string[];
};

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
  robotics: "Robotics",
  mobile: "App Development",
  "game-development": "Game Development",
  "computer-vision": "Computer Vision",
  cli: "Developer Tools",
  "developer-tools": "Developer Tools",
  documentation: "Documentation",
};

const languageTools: Record<string, string[]> = {
  TypeScript: ["GitHub Actions"],
  JavaScript: ["Node.js"],
  Python: ["Pytest"],
  Go: ["Docker"],
  Rust: ["Cargo"],
  Java: ["Maven"],
};

const countValues = (values: string[]) =>
  [...values.reduce((counts, value) => counts.set(value, (counts.get(value) || 0) + 1), new Map<string, number>())]
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));

const languageNames = (repository: GitHubRepository) => {
  const fromLanguages = repository.languages ? Object.keys(repository.languages) : [];
  return fromLanguages.length ? fromLanguages : repository.language ? [repository.language] : [];
};

export function analyzeGitHubProfile(
  user: GitHubUser,
  repositories: GitHubRepository[],
  demo = false,
  extras: AnalysisExtras = {},
): GitHubProfileAnalysis {
  const originalRepositories = repositories.filter((repository) => !repository.fork);
  const languages = countValues(originalRepositories.flatMap(languageNames));
  const topics = countValues(originalRepositories.flatMap((repository) => repository.topics || []));
  const frameworks = [
    ...new Set(
      topics.flatMap((topic) => {
        const normalizedTopic = topic.name.toLowerCase();
        return frameworkTopics[normalizedTopic] ? [frameworkTopics[normalizedTopic]] : [];
      }),
    ),
  ];
  const interests = [
    ...new Set(
      topics.flatMap((topic) => {
        const normalizedTopic = topic.name.toLowerCase();
        return interestTopics[normalizedTopic] ? [interestTopics[normalizedTopic]] : [];
      }),
    ),
  ];
  const recentCutoff = Date.now() - 1000 * 60 * 60 * 24 * 90;
  const recentRepositories = originalRepositories.filter((repository) => {
    const activityDate = repository.pushed_at || repository.updated_at;
    return new Date(activityDate).getTime() >= recentCutoff;
  }).length;
  const documentedRepositories = originalRepositories.filter(
    (repository) => (repository.description || "").trim().length >= 24,
  ).length;
  const issueReadyRepositories = originalRepositories.filter(
    (repository) => repository.has_issues && !repository.archived,
  ).length;
  const totalStars = originalRepositories.reduce(
    (total, repository) => total + repository.stargazers_count,
    0,
  );
  const totalForks = originalRepositories.reduce(
    (total, repository) => total + (repository.forks_count || 0),
    0,
  );
  const documentedRatio = originalRepositories.length
    ? documentedRepositories / originalRepositories.length
    : 0;
  const readinessScore = Math.min(
    99,
    Math.round(
      20 +
        Math.min(languages.length * 4, 18) +
        Math.min(recentRepositories * 4, 20) +
        documentedRatio * 18 +
        Math.min(issueReadyRepositories * 2, 14) +
        Math.min((extras.recentActivity?.length || 0) * 2, 8) +
        Math.min(extras.organizations?.length || 0, 6),
    ),
  );
  const strengths = [
    languages.length >= 3 ? `Breadth across ${languages.length} public languages` : null,
    recentRepositories >= 3 ? "Consistent recent repository activity" : null,
    documentedRatio >= 0.7 ? "Strong repository descriptions and project context" : null,
    totalStars >= 10 ? "Work has earned community validation" : null,
    (extras.organizations?.length || 0) > 0 ? "Connected to public GitHub organizations" : null,
  ].filter((value): value is string => Boolean(value));
  const weaknesses = [
    recentRepositories < 2 ? "Recent public activity is limited" : null,
    documentedRatio < 0.7 ? "Some repositories need clearer descriptions" : null,
    topics.length < 3 ? "Repository topics do not yet communicate a clear focus" : null,
    originalRepositories.length < 4 ? "A small public history limits match confidence" : null,
  ].filter((value): value is string => Boolean(value));
  const tools = [
    "GitHub",
    ...new Set(languages.flatMap((item) => languageTools[item.name] || [])),
  ].slice(0, 8);

  return {
    login: user.login,
    name: user.name || user.login,
    avatarUrl: user.avatar_url,
    bio: user.bio || "Open source developer",
    githubUrl: user.html_url,
    publicRepositories: user.public_repos,
    followers: user.followers,
    following: user.following || 0,
    organizations: extras.organizations || [],
    totalStars,
    recentRepositories,
    pinnedRepositories: extras.pinnedRepositories || [],
    recentActivity: extras.recentActivity || [],
    languages: languages.slice(0, 8),
    topics: topics.slice(0, 10),
    frameworks,
    skills: [...languages.slice(0, 5).map((item) => item.name), ...frameworks].slice(0, 8),
    interests: interests.length ? interests : topics.slice(0, 5).map((item) => item.name),
    strengths: strengths.length ? strengths : ["A public foundation ready to build on"],
    weaknesses: weaknesses.length ? weaknesses : ["Add more issue-driven contribution history"],
    readiness: {
      score: readinessScore,
      label:
        readinessScore >= 80
          ? "Ready to contribute"
          : readinessScore >= 60
            ? "Nearly ready"
            : "Building foundations",
      reasons: [
        `${originalRepositories.length} original public repositories analyzed`,
        `${recentRepositories} repositories active in the last 90 days`,
        `${Math.round(documentedRatio * 100)}% include useful descriptions`,
        `${totalStars.toLocaleString()} stars and ${totalForks.toLocaleString()} forks across public work`,
      ],
    },
    contributorProfile: {
      languages: languages.slice(0, 6).map((item) => item.name),
      frameworks,
      interests,
      tools,
    },
    demo,
  };
}

export const demoProfile = analyzeGitHubProfile(
  {
    login: "octo-contributor",
    name: "Alex Morgan",
    avatar_url: "https://github.com/identicons/gimit-demo.png",
    bio: "Backend-minded TypeScript and Python developer exploring open source.",
    html_url: "https://github.com",
    public_repos: 12,
    followers: 28,
    following: 16,
  },
  [
    {
      language: "TypeScript",
      languages: { TypeScript: 92000, CSS: 8000 },
      topics: ["nextjs", "web", "frontend"],
      stargazers_count: 18,
      forks_count: 4,
      fork: false,
      archived: false,
      has_issues: true,
      description: "A thoughtfully documented developer dashboard project.",
      updated_at: new Date().toISOString(),
    },
    {
      language: "Python",
      languages: { Python: 86000 },
      topics: ["fastapi", "backend", "ai"],
      stargazers_count: 11,
      forks_count: 3,
      fork: false,
      archived: false,
      has_issues: true,
      description: "An API experiment with contribution notes and tests.",
      updated_at: new Date(Date.now() - 86400000 * 8).toISOString(),
    },
    {
      language: "TypeScript",
      languages: { TypeScript: 72000 },
      topics: ["cloud", "devops"],
      stargazers_count: 6,
      forks_count: 2,
      fork: false,
      archived: false,
      has_issues: true,
      description: "Cloud deployment helpers with practical documentation.",
      updated_at: new Date(Date.now() - 86400000 * 34).toISOString(),
    },
    {
      language: "Python",
      languages: { Python: 64000 },
      topics: ["machine-learning"],
      stargazers_count: 4,
      forks_count: 1,
      fork: false,
      archived: false,
      has_issues: true,
      description: "Small machine learning exercises and reproducible notebooks.",
      updated_at: new Date(Date.now() - 86400000 * 140).toISOString(),
    },
  ],
  true,
  {
    organizations: ["open-source-labs"],
    pinnedRepositories: ["issue-orbit", "fastapi-starter-kit"],
    recentActivity: ["Pushed commits", "Opened issues", "Starred repositories"],
  },
);
