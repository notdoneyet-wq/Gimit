import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { repositories as demoRepositories } from "@/data/repositories";
import { collectGitHubRepositories, sortRepositories } from "@/lib/repositories";
import type { GitHubProfileAnalysis } from "@/types";

const githubHeaders = (token: string) => ({
  Accept: "application/vnd.github+json",
  Authorization: `Bearer ${token}`,
  "X-GitHub-Api-Version": "2022-11-28",
});

const rotateDemoRepositories = (seenRepositoryIds: number[] = []) => {
  const offset = Math.floor(Date.now() / 60000) % demoRepositories.length;
  const rotated = [...demoRepositories.slice(offset), ...demoRepositories.slice(0, offset)];
  const unseen = rotated.filter((repository) => !seenRepositoryIds.includes(repository.id));
  return unseen.length >= 6 ? unseen : rotated;
};

export async function POST(request: NextRequest) {
  let body: { analysis?: GitHubProfileAnalysis; seenRepositoryIds?: number[] };

  try {
    body = (await request.json()) as { analysis?: GitHubProfileAnalysis; seenRepositoryIds?: number[] };
  } catch {
    return NextResponse.json({ error: "Profile analysis is required to refresh recommendations." }, { status: 400 });
  }

  if (!body.analysis?.contributorProfile) {
    return NextResponse.json({ error: "Profile analysis is required to refresh recommendations." }, { status: 400 });
  }

  const token = request.cookies.get("gimit-github-token")?.value;
  const seenRepositoryIds = Array.isArray(body.seenRepositoryIds) ? body.seenRepositoryIds : [];

  if (!token || body.analysis.demo) {
    return NextResponse.json({
      repositories: sortRepositories(
        rotateDemoRepositories(seenRepositoryIds),
        "Best Match",
        body.analysis.contributorProfile,
      ),
      updatedAt: new Date().toISOString(),
      demo: true,
    });
  }

  const repositories = await collectGitHubRepositories(body.analysis, githubHeaders(token), {
    seenRepositoryIds,
  });

  return NextResponse.json({
    repositories: repositories.length
      ? repositories
      : sortRepositories(
          rotateDemoRepositories(seenRepositoryIds),
          "Best Match",
          body.analysis.contributorProfile,
        ),
    updatedAt: new Date().toISOString(),
    demo: repositories.length === 0,
  });
}
