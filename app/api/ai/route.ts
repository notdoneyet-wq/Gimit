import { NextResponse } from "next/server";
import { buildAiPrompt } from "@/lib/ai/prompts";
import { AiProviderError, getAiProvider } from "@/lib/ai/providers";
import type { AiTaskRequest } from "@/types";

export const runtime = "nodejs";

const providerIds = new Set(["gemini", "openai", "claude"]);
const taskIds = new Set([
  "repository-summary",
  "issue-explainer",
  "roadmap",
  "pr-planner",
  "learning-path",
]);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AiTaskRequest;

    if (!providerIds.has(body.provider) || !body.apiKey?.trim()) {
      return NextResponse.json(
        { error: "Choose a provider and enter a valid API key." },
        { status: 400 },
      );
    }

    const provider = getAiProvider(body.provider);

    if (body.action === "test") {
      await provider.testConnection(body.apiKey.trim());
      return NextResponse.json({ message: "Connection successful." });
    }

    if (body.action !== "generate" || !body.task || !taskIds.has(body.task)) {
      return NextResponse.json({ error: "Choose a valid AI task." }, { status: 400 });
    }

    if ((body.userContext?.length || 0) > 12000) {
      return NextResponse.json(
        { error: "Additional context must be 12,000 characters or fewer." },
        { status: 400 },
      );
    }

    const prompt = buildAiPrompt(body.task, body.repository, body.userContext);
    const result = await provider.generate(body.apiKey.trim(), prompt);

    return NextResponse.json({ result });
  } catch (error) {
    if (error instanceof AiProviderError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: "Something went wrong while processing the request. Please try again." },
      { status: 500 },
    );
  }
}
