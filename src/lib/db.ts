import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

import { ensureAuthSchema } from "./auth-schema";
import { isStatus, type Status, type Task } from "./tasks";

/**
 * Neon serverless driver over HTTP.
 *
 * Note on provenance: "Vercel Postgres" no longer exists as a product — Vercel
 * migrated every store to Neon's native integration, and `@vercel/postgres` is
 * no longer maintained. New projects are directed to `@neondatabase/serverless`.
 * The integration still injects `DATABASE_URL`, so the connection contract is
 * unchanged.
 */

/** Thrown when the database is unreachable or unconfigured, so the UI can
 *  render an actionable setup screen instead of a stack trace. */
export class DatabaseUnavailableError extends Error {
  readonly kind: "missing-url" | "unreachable";
  readonly detail: string;

  constructor(kind: "missing-url" | "unreachable", detail: string) {
    super(detail);
    this.name = "DatabaseUnavailableError";
    this.kind = kind;
    this.detail = detail;
  }
}

/**
 * `ReturnType<typeof neon>` would instantiate the generic from its constraint
 * and widen the row type to a union; pinning the two flags keeps tagged
 * templates typed as `Record<string, any>[]`.
 */
type Sql = NeonQueryFunction<false, false>;

let client: Sql | null = null;

function getSql(): Sql {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new DatabaseUnavailableError(
      "missing-url",
      "DATABASE_URL is not set. Add a Postgres database in the Vercel dashboard, then run `vercel env pull`.",
    );
  }
  client ??= neon(url);
  return client;
}

/* ----------------------------------------------------------------------------
   Schema
   ------------------------------------------------------------------------- */

/**
 * Idempotent bootstrap, run lazily on first query and memoised per process.
 *
 * `CREATE TABLE IF NOT EXISTS` makes the very first request against a fresh
 * database self-healing, so deploying to an empty Neon project needs no manual
 * SQL step. If it fails the memo is cleared so the next request retries.
 */
let schemaReady: Promise<void> | null = null;

function ensureSchema(): Promise<void> {
  schemaReady ??= (async () => {
    // Auth tables first: `tasks.created_by` holds a `user.id`, and the board
    // read joins against it.
    await ensureAuthSchema();

    const sql = getSql();
    // DDL: no interpolated values, so a plain tagged template is safe here.
    await sql`CREATE TABLE IF NOT EXISTS tasks (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      title       text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 280),
      status      text NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open','in_progress','in_review','done')),
      created_by  text,
      created_at  timestamptz NOT NULL DEFAULT now(),
      updated_at  timestamptz NOT NULL DEFAULT now()
    )`;
    // Upgrade path for boards created before auth existed.
    await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by text`;
    await sql`CREATE INDEX IF NOT EXISTS tasks_status_created_idx
                ON tasks (status, created_at DESC)`;
  })().catch((error: unknown) => {
    schemaReady = null;
    throw error;
  });
  return schemaReady;
}

/** Wrap driver failures in a typed error the UI knows how to explain. */
async function run<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof DatabaseUnavailableError) throw error;
    throw new DatabaseUnavailableError(
      "unreachable",
      error instanceof Error ? error.message : "Unknown database error.",
    );
  }
}

/* ----------------------------------------------------------------------------
   Queries
   ------------------------------------------------------------------------- */

type TaskRow = {
  id: string;
  title: string;
  status: string;
  created_by: string | null;
  author_name: string | null;
  created_at: string | Date;
  updated_at: string | Date;
};

function toIsoTimestamp(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value;
}

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    status: isStatus(row.status) ? row.status : "open",
    createdBy: row.created_by,
    authorName: row.author_name,
    createdAt: toIsoTimestamp(row.created_at),
    updatedAt: toIsoTimestamp(row.updated_at),
  };
}

/** Postgres casts `id::uuid`, so reject malformed input before it reaches it. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function listTasks(): Promise<Task[]> {
  await ensureSchema();
  return run(async () => {
    // `user` is a reserved word, so the auth table has to be quoted.
    const rows = await getSql()`
      SELECT t.id, t.title, t.status, t.created_by, t.created_at, t.updated_at,
             u.name AS author_name
        FROM tasks t
        LEFT JOIN "user" u ON u.id = t.created_by
       ORDER BY
         CASE t.status
           WHEN 'open' THEN 0 WHEN 'in_progress' THEN 1
           WHEN 'in_review' THEN 2 ELSE 3
         END,
         t.created_at DESC
    `;
    return (rows as TaskRow[]).map(toTask);
  });
}

export async function createTask(
  title: string,
  status: Status,
  createdBy: string,
): Promise<void> {
  await ensureSchema();
  await run(
    () =>
      getSql()`INSERT INTO tasks (title, status, created_by)
               VALUES (${title}, ${status}, ${createdBy})`,
  );
}

export async function setTaskStatus(id: string, status: Status): Promise<void> {
  if (!UUID_RE.test(id)) return;
  await ensureSchema();
  await run(
    () => getSql()`UPDATE tasks SET status = ${status}, updated_at = now() WHERE id = ${id}`,
  );
}

export async function deleteTask(id: string): Promise<void> {
  if (!UUID_RE.test(id)) return;
  await ensureSchema();
  await run(() => getSql()`DELETE FROM tasks WHERE id = ${id}`);
}

export async function clearDone(): Promise<number> {
  await ensureSchema();
  return run(async () => {
    const rows = await getSql()`DELETE FROM tasks WHERE status = 'done' RETURNING id`;
    return rows.length;
  });
}
