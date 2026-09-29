# Nightshift

A small, fast task board. Add a task, move it through **Open → In progress → In
review → Done**. Sign in with GitHub, and the whole team shares one board.

Built with Next.js 16 (App Router), Tailwind CSS v4, Postgres via Neon, and
Better Auth. Deploys to Vercel in about five minutes.

---

## What it does

- **Add tasks** from one input. Press <kbd>N</kbd> anywhere to jump to it.
- **Move tasks** by dragging a card between columns, or with the status button
  on each card (keyboard and screen-reader friendly).
- **Delete** with a two-step confirm — no accidental data loss, no modal.
- **Clear done** in one click when a column gets noisy.
- **Sign in with GitHub**; the board is shared by everyone who signs in, and each
  card shows who added it.
- Drag-and-drop is instant. The card moves on the same frame you drop it, then
  reconciles with the server; if the write fails it rolls back and tells you why.
- Light and dark themes, following your OS by default, with no flash on load.

---

## Deploy to Vercel

### 1. Push the repo

```bash
git init
git add -A
git commit -m "Nightshift"
git remote add origin <your-repo-url>
git push -u origin main
```

Then import the repository at [vercel.com/new](https://vercel.com/new). Vercel
detects Next.js automatically — accept the default build settings.

### 2. Add a Postgres database

Two ways, same result.

**Dashboard:** your project → **Storage** → **Create Database** → **Postgres**
(Neon) → connect it to the project.

**CLI (does the most for you):**

```bash
npm i -g vercel
vercel link
vercel install neon --plan free
```

`vercel install` installs the integration, provisions the database, connects it
to the linked project, and pulls the credentials into `.env.local` — so it's
also the fastest way to get local development working.

> **Note on naming.** "Vercel Postgres" no longer exists as its own product —
> Vercel migrated every store to [Neon's native
> integration](https://neon.com/docs/guides/vercel-postgres-transition-guide),
> and the old `@vercel/postgres` SDK is no longer maintained. This project uses
> [`@neondatabase/serverless`](https://neon.com/docs/serverless/serverless-driver),
> which is the supported path for new projects. The integration still injects
> `DATABASE_URL`, so nothing else changes.

### 3. Create a GitHub OAuth app

Go to <https://github.com/settings/developers> → **New OAuth App**.

| Field | Value |
|---|---|
| Application name | Nightshift |
| Homepage URL | `https://your-app.vercel.app` (or `http://localhost:3000` while testing) |
| Authorization callback URL | `https://your-app.vercel.app/api/auth/callback/github` |

A GitHub OAuth app accepts **multiple** callback URLs, so add the localhost one
too if you want to sign in locally with the same app:

```
http://localhost:3000/api/auth/callback/github
```

### 4. Set the environment variables

In your Vercel project → **Settings → Environment Variables**, add:

| Name | Value |
|---|---|
| `BETTER_AUTH_SECRET` | run `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | `https://your-app.vercel.app` |
| `GITHUB_CLIENT_ID` | from the OAuth app |
| `GITHUB_CLIENT_SECRET` | from the OAuth app |

`DATABASE_URL` was already injected in step 2.

> **Don't skip `BETTER_AUTH_SECRET`.** Better Auth falls back to a *default*
> secret and only logs a warning. In production that means session tokens are
> signed with a publicly known value and anyone could forge a session. This app
> treats a missing or short secret as "not configured" and refuses to trust any
> session rather than run insecurely — but set it.

### 5. Redeploy

Push any commit, or hit **Redeploy**. Visit the URL, sign in with GitHub, and
you're in. Invite your team by sharing the URL — anyone who completes GitHub
sign-in can use the board.

**There is no migration step.** Better Auth's tables and the `tasks` table are
created automatically on the first request. If you'd rather create them yourself,
run [`db/schema.sql`](db/schema.sql) in the Neon SQL editor.

---

## Run it locally

```bash
pnpm install
vercel install neon          # provisions the DB, writes .env.local
```

Then add the auth variables to `.env.local` — copy `.env.example` and fill in
`BETTER_AUTH_SECRET` (`openssl rand -base64 32`), plus the GitHub credentials if
you want to sign in locally:

```bash
pnpm dev
```

Open <http://localhost:3000>.

If something isn't configured yet, the app does not crash — the sign-in screen
lists exactly which variables are missing and what each one is for.

### Preview the UI with no database

    http://localhost:3000/demo

`/demo` renders the board against sample data, so you can see and use the whole
UI before connecting anything. Everything works — drag, status, delete, clear
done — but nothing is saved and no Server Action runs. It does not require
sign-in.

It is **development only**: the route calls `notFound()` in a production build,
so it returns 404 on Vercel. Verified, not assumed.

To delete it, remove `src/app/demo/`, `src/components/demo-board.tsx` and
`src/lib/demo-fixtures.ts`. Nothing else references them.

### Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server with Turbopack |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm typecheck` | TypeScript, after generating Next's route types |
| `pnpm lint` | ESLint (`pnpm lint --fix` to autofix) |

Run `pnpm typecheck` rather than bare `npx tsc --noEmit` on a fresh clone.
Next.js 16 generates the global `LayoutProps` / `PageProps` helpers into
`.next/types`, and `tsc` alone will report them as missing until something has
generated them once.

### Package manager

**pnpm is the source of truth** — the repo ships `pnpm-lock.yaml` and Vercel
detects the package manager from the lockfile it finds.

```bash
pnpm install        # what Vercel runs
```

`npm install` also works locally if that's what you prefer, and `.gitignore`
deliberately ignores `package-lock.json` / `yarn.lock` / `bun.lockb` so that
running it never leaves a second lockfile that would make Vercel's choice
ambiguous.

There is intentionally **no `packageManager` field** in `package.json`. Pinning
one makes Corepack — and therefore Vercel — provision that exact version, and
Vercel's supported pnpm versions are 6–10
([docs](https://vercel.com/docs/package-managers)). Leaving it out lets Vercel
pick a version it supports, derived from the lockfile.

If you'd rather standardise on npm, it's three changes: `rm pnpm-lock.yaml
pnpm-workspace.yaml`, run `npm install` to generate a `package-lock.json`, and
drop the three lockfile lines from `.gitignore`.

---

## How it's put together

```
src/
  app/
    actions.ts     Server Actions — auth check, validation, mutations
    error.tsx      Route error boundary
    globals.css    Design tokens (the only place colours live)
    layout.tsx     Fonts, theme bootstrap, shell, account menu
    page.tsx       Requires a session, reads the board from Postgres
    sign-in/       Sign-in screen (+ what's missing when unconfigured)
    api/auth/      Better Auth handler
  components/
    board.tsx          Columns, optimistic state, drag-and-drop
    board-skeleton.tsx Content-shaped loading placeholders
    task-card.tsx      One card, incl. two-step delete + author
    task-composer.tsx  Add form
    status-menu.tsx    Keyboard-accessible status picker
    theme-toggle.tsx   System → light → dark
    toast.tsx          Accessible toasts (aria-live)
    user-menu.tsx      Avatar, email, sign out
    sign-in-form.tsx   GitHub button + pending/error states
  lib/
    auth.ts        Better Auth server instance
    auth-schema.ts Programmatic migration (zero-step deploy)
    auth-client.ts Typed client (sign-in, sign-out)
    session.ts     getSessionUser / requireUser — the security boundary
    db.ts          Neon client, schema bootstrap, queries
    tasks.ts       Statuses, columns, types
    demo-fixtures.ts  Sample data for /demo (safe to delete)
  proxy.ts       Next 16 route protection (optimistic redirect)
db/schema.sql  Reference DDL
brand.md       Palette, typography, voice
```

### Data

Two tables. `tasks` is the product; Better Auth owns `user`, `session`,
`account` and `verification`.

```sql
tasks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (length(btrim(title)) between 1 and 280),
  status      text not null check (status in ('open','in_progress','in_review','done')),
  created_by  text,          -- user.id; nullable for rows predating auth
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
)
```

Status is constrained by the database, not just the UI — a direct POST to a
Server Action cannot write a status the app doesn't know about.

### Auth

**Better Auth**, with GitHub as the only provider. Users live in your own
Postgres: no third-party auth service, no per-user cost, nothing to migrate later.

> **Why not NextAuth/Auth.js?** It moved to maintenance mode in early 2026 —
> the lead maintainer left, v5 sat in beta for over two years, and the project is
> now stewarded by the Better Auth team with security patches only. It is the
> right choice for an existing codebase, and the wrong one for a new project.

### Notes for maintainers

- **The security boundary is `session.ts`, not `proxy.ts`.** Next 16 renamed
  `middleware` to `proxy`. Ours only checks that a session *cookie exists*, to
  give unauthenticated visitors a clean redirect instead of a flash of empty
  board. A forged cookie passes that check, so every page calls
  `requireUser()` and every Server Action calls `requireUserForAction()`.
  Verified: posting to all four Server Actions with a forged cookie returns
  `{"ok":false,"error":"Your session has expired…"}` and mutates nothing.
- Server Actions are public HTTP endpoints, not private functions. Anyone can
  POST to them with any body. Never add one that skips the auth check.
- `export const dynamic = "force-dynamic"` on the page is load-bearing. Without
  it Next.js would try to prerender the board at build time, where
  `DATABASE_URL` doesn't exist, and the build would fail.
  (`dynamic` still exists in Next 16 — it's removed only if you enable
  `cacheComponents`, which this project does not.)
- Theming keys off `[data-theme="dark"]`, not `.dark`. An inline script in
  `layout.tsx` sets it before first paint so there's no flash.
- Better Auth's tables are created by a **programmatic migration**
  (`getMigrations` in `auth-schema.ts`), the officially supported path for
  serverless environments where `npx auth migrate` can't run. If you change the
  auth config in a way that alters the schema, it is applied on next boot.

---

## Accessibility

Checked against the rendered page, not the source:

- Every text node meets WCAG AA against its composited background, in both
  themes, at 1280 px and 375 px.
- All interactive targets are ≥ 40×40 px on touch (`pointer-coarse:`) and
  comfortable with a mouse.
- Visible focus ring on every interactive element; `Escape` closes the status
  menu and returns focus to its trigger.
- Drag-and-drop is an enhancement — every move is also reachable by keyboard
  through the status menu.
- `prefers-reduced-motion: reduce` disables animation outright rather than
  shortening it.

---

## Known limitations

- **Any GitHub account that completes sign-in gets full access.** There is no
  allowlist, so the board is as private as its URL. If you're putting this
  anywhere discoverable, add an email/org check in `auth.ts` (`databaseHooks` or
  a `user.create` hook) before relying on it. This is the one gap to close before
  treating the board as confidential.
- **Everyone can edit everything.** It's one shared board by design; there are no
  roles, and any signed-in user can delete anyone's task.
- **No realtime.** Two people editing at once won't see each other's changes
  until they reload.
- No due dates, assignees, tags or comments — by design.
