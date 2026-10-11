import type { Metadata } from "next";
import LoginForm from "./LoginForm";

export const instant = false;

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

type SearchParams = Promise<{ denied?: string }>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const { denied } = await searchParams;
  return (
    <main className="admin-login">
      <div className="admin-card admin-login__card">
        <span className="admin-kicker">Adams UniverseCity</span>
        <h1 className="admin-title">Sign in to manage the site</h1>
        {denied && <p className="admin-status is-error">That account is not allowed to manage this site. Sign in with the owner&apos;s email.</p>}
        <LoginForm />
      </div>
    </main>
  );
}
