import type { AiProviderId } from "@/types";

export const keyStorageName = "gimit-ai-provider-keys";
export const providerStorageName = "gimit-ai-provider";
export const themeStorageName = "gimit-theme";
export const bookmarkStorageName = "gimit-bookmarks";
export const contributorProfileStorageName = "gimit-contributor-profile";
export const githubAnalysisStorageName = "gimit-github-analysis";
export const recommendationStorageName = "gimit-recommendations";
export const recommendationUpdatedStorageName = "gimit-recommendations-updated-at";
export const seenRepositoryStorageName = "gimit-seen-repositories";

export type StoredKeys = Record<AiProviderId, string>;

export const emptyKeys: StoredKeys = {
  gemini: "",
  openai: "",
  claude: "",
};
