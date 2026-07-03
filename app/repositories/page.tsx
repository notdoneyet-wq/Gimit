import Link from "next/link";
import { RepositoryExplorer } from "@/components/RepositoryExplorer";

export default function RepositoriesPage() {
  return (
    <main className="page-shell">
      <nav className="top-nav fade-in-card" aria-label="Primary">
        <Link className="brand-lockup" href="/">
          <span className="brand-mark">G</span>
          <span className="gimit-word">Gimit</span>
        </Link>
        <div className="nav-links">
          <Link className="text-link" href="/ai-workspace">
            AI Workspace
          </Link>
          <Link className="text-link" href="/settings">
            Settings
          </Link>
        </div>
      </nav>
      <RepositoryExplorer />
    </main>
  );
}
