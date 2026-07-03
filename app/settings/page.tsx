import Link from "next/link";
import { SettingsPanel } from "@/components/SettingsPanel";

export default function SettingsPage() {
  return (
    <main className="page-shell">
      <nav className="top-nav fade-in-card" aria-label="Primary">
        <Link className="brand-lockup" href="/">
          <span className="brand-mark">G</span>
          <span className="gimit-word">Gimit</span>
        </Link>
        <div className="nav-links">
          <Link className="text-link" href="/repositories">Repositories</Link>
          <Link className="text-link" href="/ai-workspace">AI Workspace</Link>
        </div>
      </nav>
      <section className="workspace-hero settings-hero fade-in-card">
        <div>
          <span className="eyebrow">Settings</span>
          <h1>One place for preferences and AI.</h1>
        </div>
        <p className="hero-copy">Repository matching and profile analysis remain deterministic. AI runs only when you choose a focused tool.</p>
      </section>
      <SettingsPanel />
    </main>
  );
}
