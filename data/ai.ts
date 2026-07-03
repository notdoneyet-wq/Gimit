import type { AiProviderOption, AiTaskOption } from "@/types";

export const aiProviders: AiProviderOption[] = [
  {
    id: "gemini",
    name: "Gemini",
    description: "Google's fast multimodal model family.",
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "OpenAI reasoning and instruction models.",
  },
  {
    id: "claude",
    name: "Claude",
    description: "Anthropic models built for careful analysis.",
  },
];

export const aiTasks: AiTaskOption[] = [
  {
    id: "repository-summary",
    name: "Repository Summary",
    description: "Understand the purpose, features, stack, folders, and best starting point.",
    buttonLabel: "Generate Repository Summary",
    inputLabel: "Optional README or folder tree",
    inputPlaceholder:
      "Paste a short README excerpt or folder tree for a more accurate overview. Gimit will not invent missing files.",
    inputRequired: false,
    timeline: ["Repository Analysis", "AI Processing", "Summary Generation"],
  },
  {
    id: "issue-explainer",
    name: "Issue Explainer",
    description: "Translate an issue into clear scope, likely files, difficulty, and next steps.",
    buttonLabel: "Explain Issue",
    inputLabel: "Issue title and description",
    inputPlaceholder: "Paste the issue title, description, and acceptance criteria...",
    inputRequired: true,
    timeline: ["Issue Analysis", "Scope Mapping", "Explanation Generation"],
  },
  {
    id: "roadmap",
    name: "Contribution Roadmap",
    description: "Create a practical path from local setup to a focused first pull request.",
    buttonLabel: "Generate Roadmap",
    inputLabel: "Optional contribution goal",
    inputPlaceholder: "Example: I want to start with a small documentation or API task.",
    inputRequired: false,
    timeline: ["Goal Analysis", "Step Planning", "Roadmap Generation"],
  },
  {
    id: "pr-planner",
    name: "PR Planner",
    description: "Plan what to read, edit, test, and watch before implementation.",
    buttonLabel: "Generate PR Plan",
    inputLabel: "Issue or implementation goal",
    inputPlaceholder: "Describe the change you want to make or paste the selected issue...",
    inputRequired: true,
    timeline: ["Change Analysis", "Implementation Planning", "Checklist Generation"],
  },
  {
    id: "learning-path",
    name: "Learning Path",
    description: "Compare your current skills with the repository and order what to learn.",
    buttonLabel: "Generate Learning Path",
    inputLabel: "Your current skills and goal",
    inputPlaceholder:
      "Example: I know JavaScript and React. I want to contribute to backend issues.",
    inputRequired: true,
    timeline: ["Skill Analysis", "Gap Mapping", "Learning Path Generation"],
  },
];
