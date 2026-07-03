import type { AiProviderId } from "@/types";

const requestTimeoutMs = 30000;

export class AiProviderError extends Error {
  constructor(
    message: string,
    public readonly status = 502,
  ) {
    super(message);
    this.name = "AiProviderError";
  }
}

export interface AiProvider {
  testConnection(apiKey: string): Promise<void>;
  generate(apiKey: string, prompt: string): Promise<string>;
}

const providerMessage = (status: number, fallback?: string) => {
  if (status === 401 || status === 403) {
    return "The API key was rejected. Check the key and try again.";
  }

  if (status === 429) {
    return "This provider is rate limiting requests. Please wait a moment and try again.";
  }

  if (status >= 500) {
    return "The AI provider is temporarily unavailable. Please try again shortly.";
  }

  return fallback || "The provider could not complete this request.";
};

async function readProviderError(response: Response) {
  let detail = "";

  try {
    const body = (await response.json()) as {
      error?: { message?: string };
      message?: string;
    };
    detail = body.error?.message || body.message || "";
  } catch {
    // Provider error bodies are not always JSON.
  }

  throw new AiProviderError(providerMessage(response.status, detail), response.status);
}

async function providerFetch(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      await readProviderError(response);
    }

    return response;
  } catch (error) {
    if (error instanceof AiProviderError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new AiProviderError("The provider took too long to respond. Please try again.", 504);
    }

    throw new AiProviderError(
      "Gimit could not reach the provider. Check your network connection and try again.",
      503,
    );
  } finally {
    clearTimeout(timeout);
  }
}

class GeminiProvider implements AiProvider {
  private readonly baseUrl = "https://generativelanguage.googleapis.com/v1beta";
  private readonly model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  async testConnection(apiKey: string) {
    await providerFetch(`${this.baseUrl}/models`, {
      headers: { "x-goog-api-key": apiKey },
    });
  }

  async generate(apiKey: string, prompt: string) {
    const response = await providerFetch(
      `${this.baseUrl}/models/${this.model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1200,
          },
        }),
      },
    );

    const body = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = body.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim();

    if (!text) {
      throw new AiProviderError("Gemini returned an empty response. Please try again.");
    }

    return text;
  }
}

class OpenAiProvider implements AiProvider {
  private readonly baseUrl = "https://api.openai.com/v1";
  private readonly model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

  private headers(apiKey: string) {
    return {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };
  }

  async testConnection(apiKey: string) {
    await providerFetch(`${this.baseUrl}/models`, {
      headers: this.headers(apiKey),
    });
  }

  async generate(apiKey: string, prompt: string) {
    const response = await providerFetch(`${this.baseUrl}/responses`, {
      method: "POST",
      headers: this.headers(apiKey),
      body: JSON.stringify({
        model: this.model,
        input: prompt,
        max_output_tokens: 1200,
        store: false,
      }),
    });

    const body = (await response.json()) as {
      output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
    };
    const text = body.output
      ?.flatMap((item) => item.content || [])
      .filter((item) => item.type === "output_text")
      .map((item) => item.text || "")
      .join("\n")
      .trim();

    if (!text) {
      throw new AiProviderError("OpenAI returned an empty response. Please try again.");
    }

    return text;
  }
}

class ClaudeProvider implements AiProvider {
  private readonly baseUrl = "https://api.anthropic.com/v1";
  private readonly model = process.env.CLAUDE_MODEL || "claude-haiku-4-5";

  private headers(apiKey: string) {
    return {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    };
  }

  async testConnection(apiKey: string) {
    await providerFetch(`${this.baseUrl}/models`, {
      headers: this.headers(apiKey),
    });
  }

  async generate(apiKey: string, prompt: string) {
    const response = await providerFetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: this.headers(apiKey),
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1200,
        temperature: 0.2,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const body = (await response.json()) as {
      content?: Array<{ type?: string; text?: string }>;
    };
    const text = body.content
      ?.filter((item) => item.type === "text")
      .map((item) => item.text || "")
      .join("\n")
      .trim();

    if (!text) {
      throw new AiProviderError("Claude returned an empty response. Please try again.");
    }

    return text;
  }
}

const providers: Record<AiProviderId, AiProvider> = {
  gemini: new GeminiProvider(),
  openai: new OpenAiProvider(),
  claude: new ClaudeProvider(),
};

export function getAiProvider(providerId: AiProviderId) {
  return providers[providerId];
}
