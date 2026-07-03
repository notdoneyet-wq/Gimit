"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { aiProviders, aiTasks } from "@/data/ai";
import { emptyKeys, keyStorageName, providerStorageName, recommendationStorageName } from "@/lib/settings";
import type { AiProviderId, AiTaskId, Repository } from "@/types";

type AIWorkspaceProps = {
  repositories: Repository[];
  initialRepositoryId: number;
};

type ApiResponse = {
  error?: string;
  message?: string;
  result?: string;
};

const cleanMarkdown = (value: string) =>
  value.replace(/\*\*/g, "").replace(/__/g, "").replace(/`/g, "");

function StructuredResponse({ content }: { content: string }) {
  return (
    <div className="structured-response">
      {content.split("\n").map((line, index) => {
        const value = line.trim();
        const key = `${index}-${value.slice(0, 24)}`;

        if (!value) {
          return <div className="response-spacer" key={key} />;
        }

        if (/^#{1,6}\s/.test(value)) {
          return <h4 key={key}>{cleanMarkdown(value.replace(/^#{1,6}\s+/, ""))}</h4>;
        }

        const listMatch = value.match(/^(?:[-*]|\d+\.)\s+(.+)/);
        const checkMatch = value.match(/^\[(x|X| )\]\s+(.+)/);

        if (checkMatch || listMatch) {
          const text = checkMatch?.[2] || listMatch?.[1] || value;
          return (
            <div className="response-list-item" key={key}>
              <span aria-hidden="true">{checkMatch?.[1]?.trim() ? "OK" : "-"}</span>
              <p>{cleanMarkdown(text)}</p>
            </div>
          );
        }

        return <p key={key}>{cleanMarkdown(value)}</p>;
      })}
    </div>
  );
}

export function AIWorkspace({ repositories, initialRepositoryId }: AIWorkspaceProps) {
  const [selectedProvider, setSelectedProvider] = useState<AiProviderId>("gemini");
  const [apiKey, setApiKey] = useState("");
  const [workspaceRepositories, setWorkspaceRepositories] = useState(repositories);
  const [selectedTask, setSelectedTask] = useState<AiTaskId>("repository-summary");
  const [selectedRepositoryId, setSelectedRepositoryId] = useState(initialRepositoryId);
  const [userContext, setUserContext] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [progressIndex, setProgressIndex] = useState(0);

  const activeTask = aiTasks.find((task) => task.id === selectedTask) || aiTasks[0];
  const activeProvider = aiProviders.find((provider) => provider.id === selectedProvider);
  const selectedRepository =
    workspaceRepositories.find((repository) => repository.id === selectedRepositoryId) ||
    workspaceRepositories[0];

  useEffect(() => {
    try {
      const savedKeys = window.localStorage.getItem(keyStorageName);
      const savedProvider = window.localStorage.getItem(providerStorageName) as AiProviderId | null;
      const parsedKeys = savedKeys ? { ...emptyKeys, ...JSON.parse(savedKeys) } : emptyKeys;
      const provider = aiProviders.some((item) => item.id === savedProvider)
        ? (savedProvider as AiProviderId)
        : "gemini";

      setSelectedProvider(provider);
      setApiKey(parsedKeys[provider] || "");
      const storedRepositories = window.sessionStorage.getItem(recommendationStorageName);
      if (storedRepositories) {
        const parsedRepositories = JSON.parse(storedRepositories) as Repository[];
        if (parsedRepositories.length) {
          setWorkspaceRepositories(parsedRepositories);
          if (!parsedRepositories.some((repository) => repository.id === initialRepositoryId)) {
            setSelectedRepositoryId(parsedRepositories[0].id);
          }
        }
      }
    } catch {
      setApiKey("");
    }
  }, [initialRepositoryId]);

  const postToProvider = async (
    payload: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<ApiResponse> => {
    const response = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    });
    const body = (await response.json()) as ApiResponse;

    if (!response.ok) {
      throw new Error(body.error || "The provider could not complete this request.");
    }

    return body;
  };

  const generate = async () => {
    if (!apiKey.trim()) {
      setError("Enter an API key before using an AI tool.");
      return;
    }

    if (activeTask.inputRequired && !userContext.trim()) {
      setError(`${activeTask.inputLabel} is required for this tool.`);
      return;
    }

    const controller = new AbortController();
    const clientTimeout = window.setTimeout(() => controller.abort(), 35000);
    const progressTimer = window.setInterval(() => {
      setProgressIndex((current) => Math.min(current + 1, activeTask.timeline.length - 1));
    }, 900);

    setIsRunning(true);
    setProgressIndex(0);
    setResult("");
    setError("");

    try {
      const response = await postToProvider(
        {
          action: "generate",
          provider: selectedProvider,
          apiKey: apiKey.trim(),
          task: selectedTask,
          repository: selectedRepository,
          userContext: userContext.trim(),
        },
        controller.signal,
      );
      setResult(response.result || "The provider returned no content.");
    } catch (requestError) {
      const message =
        requestError instanceof Error && requestError.name === "AbortError"
          ? "The request timed out. Please try again."
          : requestError instanceof Error
            ? requestError.message
            : "Gimit could not generate this response.";
      setError(message);
    } finally {
      window.clearTimeout(clientTimeout);
      window.clearInterval(progressTimer);
      setIsRunning(false);
    }
  };

  const chooseTask = (taskId: AiTaskId) => {
    setSelectedTask(taskId);
    setUserContext("");
    setResult("");
    setError("");
  };

  return (
    <div className="workspace-shell">
      <section className="workspace-hero fade-in-card">
        <div>
          <span className="eyebrow">AI Workspace</span>
          <h1>Ask for help only when reasoning adds value.</h1>
        </div>
        <p className="hero-copy">
          Choose a provider, bring your own key, and run one focused tool at a time. Repository
          browsing never triggers an AI request.
        </p>
      </section>

      <section className="workspace-grid">
        <aside className="panel provider-panel fade-in-card">
          <div className="panel-header">
            <span className="eyebrow">Workspace Setup</span>
            <h2>Focused AI, on demand.</h2>
          </div>
          <div className="active-provider-card">
            <span className="provider-mark">{(activeProvider?.name || "AI").slice(0, 1)}</span>
            <div>
              <span className="meta-label">Active Provider</span>
              <strong>{activeProvider?.name}</strong>
            </div>
          </div>
          <p className="security-note">
            Provider, API key, connection testing, and appearance now live together in Settings.
          </p>
          <Link className="secondary-button" href="/settings">
            Open Settings
          </Link>
        </aside>

        <section className="panel task-panel fade-in-card">
          <div className="panel-header split">
            <div>
              <span className="eyebrow">Focused Tools</span>
              <h2>Understanding, planning, and learning.</h2>
            </div>
            <span className="summary-pill">No automatic requests</span>
          </div>

          <div className="task-tabs" role="tablist" aria-label="AI tools">
            {aiTasks.map((task, index) => (
              <button
                aria-selected={selectedTask === task.id}
                className={selectedTask === task.id ? "task-tab active" : "task-tab"}
                key={task.id}
                onClick={() => chooseTask(task.id)}
                role="tab"
                tabIndex={selectedTask === task.id ? 0 : -1}
                type="button"
              >
                <span>0{index + 1}</span>
                {task.name}
              </button>
            ))}
          </div>

          <div className="task-composer">
            <div className="task-intro">
              <div>
                <span className="eyebrow">{activeTask.name}</span>
                <h3>{activeTask.description}</h3>
              </div>
              <div className="repository-selector">
                <label className="field-label" htmlFor="workspace-repository">
                  Repository
                </label>
                <select
                  aria-label="Choose repository"
                  id="workspace-repository"
                  onChange={(event) => setSelectedRepositoryId(Number(event.target.value))}
                  value={selectedRepositoryId}
                >
                  {workspaceRepositories.map((repository) => (
                    <option key={repository.id} value={repository.id}>
                      {repository.owner}/{repository.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label className="field-label" htmlFor="task-context">
              {activeTask.inputLabel}
              {activeTask.inputRequired ? <span>Required</span> : <span>Optional</span>}
            </label>
            <textarea
              aria-label={activeTask.inputLabel}
              id="task-context"
              maxLength={12000}
              onChange={(event) => setUserContext(event.target.value)}
              placeholder={activeTask.inputPlaceholder}
              value={userContext}
            />
            <div className="composer-footer">
              <span>{userContext.length.toLocaleString()} / 12,000 characters</span>
              <button
                className="primary-button"
                disabled={isRunning}
                onClick={generate}
                type="button"
              >
                {isRunning ? "Working..." : activeTask.buttonLabel}
              </button>
            </div>
          </div>

          {isRunning ? (
            <div className="ai-progress fade-in-card" aria-busy="true" aria-live="polite">
              <span className="eyebrow">In Progress</span>
              <div className="progress-bar" aria-hidden="true">
                <span />
              </div>
              <div className="ai-skeleton" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <div className="progress-steps">
                {activeTask.timeline.map((step, index) => (
                  <div
                    className={index <= progressIndex ? "progress-step active" : "progress-step"}
                    key={step}
                  >
                    <span>{index < progressIndex ? "OK" : index + 1}</span>
                    <p>{step}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {!isRunning && !error && !result ? (
            <section className="empty-state ai-empty-state fade-in-card" aria-live="polite">
              <span className="eyebrow">Ready When You Are</span>
              <h3>{activeTask.name}</h3>
              <p className="hero-copy">
                Pick a repository, add context if you want, and run one focused AI tool.
              </p>
            </section>
          ) : null}

          {error ? (
            <div className="status-message error fade-in-card" role="alert">
              <strong>We could not complete that request.</strong>
              <p>{error}</p>
            </div>
          ) : null}

          {result ? (
            <article className="ai-result fade-in-card" aria-live="polite">
              <div className="result-header">
                <div>
                  <span className="eyebrow">
                    <span className="gimit-word">Gimit</span> Output
                  </span>
                  <h3>{activeTask.name}</h3>
                </div>
                <span className="badge">{selectedProvider}</span>
              </div>
              <StructuredResponse content={result} />
            </article>
          ) : null}
        </section>
      </section>
    </div>
  );
}
