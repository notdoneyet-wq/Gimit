import Link from "next/link";
import { AIWorkspace } from "@/components/AIWorkspace";
import { repositories } from "@/data/repositories";

type AiWorkspacePageProps = {
  searchParams: Promise<{ repository?: string }>;
};

export default async function AiWorkspacePage({ searchParams }: AiWorkspacePageProps) {
  const params = await searchParams;
  const requestedId = Number(params.repository);
  const initialRepositoryId = Number.isFinite(requestedId)
    ? requestedId
    : repositories[0].id;

  return (
    <main className="page-shell">
      <nav className="top-nav fade-in-card" aria-label="Primary">
        <Link className="brand-lockup" href="/">
          <span className="brand-mark">G</span>
          <span className="gimit-word">Gimit</span>
        </Link>
        <div className="nav-links">
          <Link className="text-link" href="/repositories">
            Repositories
          </Link>
          <Link className="text-link" href="/settings">
            Settings
          </Link>
        </div>
      </nav>
      <AIWorkspace initialRepositoryId={initialRepositoryId} repositories={repositories} />
    </main>
  );
}
