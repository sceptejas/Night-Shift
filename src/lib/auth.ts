import { Pool } from "@neondatabase/serverless";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";

/**
 * Better Auth server instance.
 *
 * Why Better Auth: Auth.js/NextAuth moved to maintenance mode in early 2026
 * (it is now stewarded by the Better Auth team, security patches only), so it
 * is no longer the right choice for new work. Better Auth keeps the user table
 * in our own Postgres — no third-party service, no per-user cost — and is
 * fully compatible with Next.js 16 / `proxy.ts`.
 *
 * The Neon `Pool` is node-postgres compatible over WebSockets, which is what
 * Better Auth's Kysely Postgres dialect expects. Construction is lazy: no
 * connection is opened until the first query, so a missing DATABASE_URL does
 * not crash module import (the UI still renders its "connect a database"
 * screen instead of an unrelated stack trace).
 */

const connectionString = process.env.DATABASE_URL ?? "";

const pool = new Pool({ connectionString });

/**
 * A failed connection emits an `error` event on the pool's underlying socket.
 * Node treats an unhandled `error` event as fatal, so without this listener a
 * transient database problem (wrong password, suspended compute, blip) throws
 * an uncaught exception instead of surfacing as an ordinary rejected query.
 * Queries still reject normally — this only stops the process dying.
 */
pool.on("error", (error: unknown) => {
  console.error("Postgres pool error:", error);
});

export const auth = betterAuth({
  database: pool,
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,

  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
    },
  },

  session: {
    // 30 days, refreshed daily — a working tool people stay signed into.
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },

  // `nextCookies` must stay last: it lets Server Actions set the session
  // cookie, which Next.js otherwise swallows.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
