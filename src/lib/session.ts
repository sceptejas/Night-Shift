import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { ensureAuthSchema } from "@/lib/auth-schema";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};

/** True when a database is configured at all; without one nobody can sign in. */
export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

const MIN_SECRET_LENGTH = 32;

/**
 * Better Auth falls back to a *default* secret when BETTER_AUTH_SECRET is unset,
 * and only warns. In production that is a real vulnerability — session tokens
 * are signed with a value that is public knowledge, so anyone could mint one.
 *
 * Rather than trust a warning nobody reads, treat a missing/short secret in
 * production as "auth not configured": no session is trusted, and the sign-in
 * screen explains what to set. Development is left permissive so `pnpm dev`
 * works without ceremony.
 */
export function hasAuthSecret(): boolean {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (process.env.NODE_ENV !== "production") return true;
  return Boolean(secret && secret.length >= MIN_SECRET_LENGTH);
}

export function hasGithubProvider(): boolean {
  return Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
}

/** Human-readable list of what still needs configuring. Drives the setup UI. */
export function authConfigGaps(): string[] {
  const gaps: string[] = [];
  if (!hasDatabase()) gaps.push("DATABASE_URL");
  if (!hasAuthSecret()) gaps.push("BETTER_AUTH_SECRET (at least 32 characters)");
  if (!hasGithubProvider()) gaps.push("GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET");
  if (process.env.NODE_ENV === "production" && !process.env.BETTER_AUTH_URL) {
    gaps.push("BETTER_AUTH_URL (so OAuth callbacks return to the right host)");
  }
  return gaps;
}

/**
 * Current user, or null. Never throws for the "not configured yet" case — the
 * UI needs to be able to render its setup screen.
 *
 * NOTE: this is the only place a session is read, and it reads it on the
 * server. Every Server Action calls `requireUserForAction` before touching
 * data, because Server Functions are reachable by direct POST and cannot trust
 * that the UI gated them.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  if (!hasDatabase() || !hasAuthSecret()) return null;

  try {
    await ensureAuthSchema();
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return null;
    const { id, name, email, image } = session.user;
    return { id, name, email, image };
  } catch (error) {
    // A database that is configured but unreachable should not take the page
    // down here; the caller's own query will surface a proper error state.
    console.error("Failed to read session:", error);
    return null;
  }
}

/** For pages: redirect to sign-in instead of returning null. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  return user;
}

/** For Server Actions: throw rather than redirect, so the action fails closed. */
export async function requireUserForAction(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("Not authenticated.");
  }
  return user;
}
