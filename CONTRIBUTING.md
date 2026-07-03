# Contributing to Gimit

First of all, thank you for your interest in contributing to Gimit.

Our goal is to build a clean, scalable, and maintainable AI-powered developer workspace that improves the open-source onboarding experience.

---

## Getting Started

1. Fork the repository
2. Clone your fork

```bash
git clone https://github.com/<your-username>/Gimit.git
```

3. Install dependencies

```bash
npm install
```

4. Configure environment variables

Create a `.env.local` file and add the required GitHub OAuth and AI provider credentials.

5. Start the development server

```bash
npm run dev
```

---

## Branch Naming

Please use descriptive branch names.

Examples:

```
feature/github-oauth
feature/repository-search
feature/ai-workspace
fix/auth-callback
fix/repository-filter
docs/readme-update
```

---

## Commit Messages

Use clear and descriptive commit messages.

Examples:

```
feat: add repository recommendation engine

fix: resolve GitHub OAuth callback issue

docs: update installation guide

refactor: simplify API route handling
```

---

## Pull Requests

Before opening a pull request, please ensure:

- Code builds successfully
- No TypeScript errors
- No linting errors
- Existing functionality remains unaffected
- Documentation is updated if necessary

Pull requests should include:

- Description of changes
- Screenshots (if UI changes)
- Related issues (if applicable)

---

## Coding Guidelines

### TypeScript

- Prefer strong typing
- Avoid `any` where possible

### React

- Keep components modular
- Reuse existing UI components

### Styling

- Use Tailwind CSS
- Maintain consistent spacing and typography
- Keep the interface clean and minimal

### File Naming

Use descriptive names.

Good examples:

```
RepositoryCard.tsx
ProfileOverview.tsx
GitHubService.ts
AIProvider.ts
```

Avoid generic names like:

```
test.ts
new.ts
component.tsx
```

---

## Documentation

When introducing new features, please update:

- README.md
- Technical Documentation (if applicable)
- Screenshots (if UI changes)

---

## Code Review

Every contribution should aim for:

- Readability
- Simplicity
- Reusability
- Maintainability

Prefer small, focused pull requests over large unrelated changes.

---

## Reporting Bugs

When reporting a bug, please include:

- Operating System
- Browser
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots (if applicable)

---

## Feature Requests

Feature requests are welcome.

Please describe:

- The problem
- Proposed solution
- Expected benefits
- Any implementation ideas

---

## Community

Please be respectful and constructive.

We value collaboration, thoughtful discussions, and high-quality contributions that improve the project for everyone.

Thank you for helping make Gimit better.
