import { NextRequest, NextResponse } from "next/server";
import { repositories as demoRepositories } from "@/data/repositories";
import { analyzeGitHubProfile, demoProfile, type GitHubRepository } from "@/lib/profile";
import { collectGitHubRepositories } from "@/lib/repositories";

type GitHubOrg = {
  login: string;
};

type GitHubEvent = {
  type: string;
  repo?: { name: string };
};

type GitHubPinnedResponse = {
  data?: {
    viewer?: {
      pinnedItems?: {
        nodes?: Array<{ nameWithOwner?: string }>;
      };
    };
  };
};

const githubHeaders = (token: string) => ({
  Accept: "application/vnd.github+json",
  Authorization: `Bearer ${token}`,
  "X-GitHub-Api-Version": "2022-11-28",
});

const demoResponse = () =>
  NextResponse.json({
    ...demoProfile,
    recommendedRepositories: demoRepositories,
  });

const fetchGitHubJson = async <T>(url: string, headers: Record<string, string>, fallback: T) => {
  try {
    const response = await fetch(url, { headers, cache: "no-store" });
    if (!response.ok) {
      return fallback;
    }
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
};

const fetchPinnedRepositories = async (token: string) => {
  try {
    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query:
          "query { viewer { pinnedItems(first: 6, types: REPOSITORY) { nodes { ... on Repository { nameWithOwner } } } } }",
      }),
      cache: "no-store",
    });
    if (!response.ok) {
      return [];
    }
    const body = (await response.json()) as GitHubPinnedResponse;
    return (
      body.data?.viewer?.pinnedItems?.nodes
        ?.map((node) => node.nameWithOwner)
        .filter((value): value is string => Boolean(value)) || []
    );
  } catch {
    return [];
  }
};

const withRepositoryLanguages = async (
  repositories: GitHubRepository[],
  headers: Record<string, string>,
) => {
  const enriched = await Promise.all(
    repositories.slice(0, 60).map(async (repository) => {
      if (!repository.full_name) {
        return repository;
      }
      const languages = await fetchGitHubJson<Record<string, number>>(
        `https://api.github.com/repos/${repository.full_name}/languages`,
        headers,
        {},
      );
      return { ...repository, languages };
    }),
  );

  return [...enriched, ...repositories.slice(60)];
};

export async function GET(request: NextRequest) {
  const token = request.cookies.get("gimit-github-token")?.value;

  if (!token || request.nextUrl.searchParams.get("demo") === "1") {
    return demoResponse();
  }

  const headers = githubHeaders(token);
  let userResponse: Response;

  try {
    userResponse = await fetch("https://api.github.com/user", { headers, cache: "no-store" });
  } catch {
    return NextResponse.json(
      { error: "GitHub profile could not be reached. Please try connecting again." },
      { status: 502 },
    );
  }

  if (userResponse.status === 401 || userResponse.status === 403) {
    return NextResponse.json(
      { error: "GitHub profile access expired or hit a rate limit. Please connect again." },
      { status: userResponse.status },
    );
  }

  if (!userResponse.ok) {
    return demoResponse();
  }

  const user = await userResponse.json();
  const pageCount = Math.max(1, Math.ceil((user.public_repos || 0) / 100));
  const [orgs, events, pinnedRepositories, repositoryPages] = await Promise.all([
    fetchGitHubJson<GitHubOrg[]>("https://api.github.com/user/orgs?per_page=100", headers, []),
    fetchGitHubJson<GitHubEvent[]>(
      `https://api.github.com/users/${user.login}/events/public?per_page=30`,
      headers,
      [],
    ),
    fetchPinnedRepositories(token),
    Promise.all(
      Array.from({ length: pageCount }, (_, index) =>
        fetchGitHubJson<GitHubRepository[]>(
          `https://api.github.com/user/repos?per_page=100&page=${index + 1}&sort=updated&type=public`,
          headers,
          [],
        ),
      ),
    ),
  ]);
  const enrichedRepositories = await withRepositoryLanguages(repositoryPages.flat(), headers);
  const analysis = analyzeGitHubProfile(user, enrichedRepositories, false, {
    organizations: orgs.map((org) => org.login),
    pinnedRepositories,
    recentActivity: events
      .map((event) => `${event.type.replace(/Event$/, "")}${event.repo?.name ? ` in ${event.repo.name}` : ""}`)
      .slice(0, 8),
  });
  const recommendedRepositories = await collectGitHubRepositories(analysis, headers);

  return NextResponse.json({
    ...analysis,
    recommendedRepositories: recommendedRepositories.length ? recommendedRepositories : demoRepositories,
  });
}
