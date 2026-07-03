import Link from "next/link";
import { ProfileAnalysis } from "@/components/ProfileAnalysis";

export default function ProfilePage() {
  return (
    <main className="page-shell">
      <nav className="top-nav fade-in-card" aria-label="Primary">
        <Link className="brand-lockup" href="/">
          <span className="brand-mark">G</span>
          <span className="gimit-word">Gimit</span>
        </Link>
        <div className="nav-links">
          <Link className="text-link" href="/settings">Settings</Link>
          <Link className="text-link" href="/">Home</Link>
        </div>
      </nav>
      <ProfileAnalysis />
    </main>
  );
}
