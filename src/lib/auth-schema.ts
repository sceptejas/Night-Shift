import { getMigrations } from "better-auth/db/migration";

import { auth } from "@/lib/auth";

/**
 * Creates Better Auth's tables (user, session, account, verification) on first
 * use, the same way the tasks table is created — so deploying to an empty Neon
 * project still needs no manual SQL step.
 *
 * `getMigrations` is the officially supported programmatic path for
 * "environments where the CLI isn't available (e.g. Cloudflare Workers,
 * serverless functions)". `npx auth migrate` does exactly this, but needs a
 * live database, which we don't have at build time and don't want to require of
 * the operator.
 *
 * Memoised per process; the memo is cleared on failure so the next request
 * retries rather than caching a broken state.
 */
let ready: Promise<void> | null = null;

export function ensureAuthSchema(): Promise<void> {
  ready ??= (async () => {
    const { runMigrations } = await getMigrations(auth.options);
    await runMigrations();
  })().catch((error: unknown) => {
    ready = null;
    throw error;
  });
  return ready;
}
