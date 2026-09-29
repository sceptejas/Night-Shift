"use server";

import { revalidatePath } from "next/cache";

import {
  clearDone,
  createTask,
  deleteTask,
  setTaskStatus,
  DatabaseUnavailableError,
} from "@/lib/db";
import { requireUserForAction, type SessionUser } from "@/lib/session";
import { isStatus, type Status } from "@/lib/tasks";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

const MAX_TITLE = 280;

/**
 * SECURITY BOUNDARY.
 *
 * Server Functions are reachable by direct POST with an arbitrary body — they
 * are public HTTP endpoints, not private functions. The `proxy` redirect and
 * the fact that the UI hides these controls are conveniences, not enforcement.
 *
 * So every action below starts here, and a failure to authenticate is a hard
 * stop. The board is shared across the team, so "authenticated" is the whole
 * requirement: no per-row ownership check is needed or wanted.
 */
async function authenticate(): Promise<
  { ok: true; user: SessionUser } | { ok: false; error: string }
> {
  try {
    return { ok: true, user: await requireUserForAction() };
  } catch {
    return { ok: false, error: "Your session has expired. Sign in again to continue." };
  }
}

/** Same constraint the database enforces, surfaced as a readable message. */
function validateTitle(raw: unknown): { title: string } | { error: string } {
  const title = typeof raw === "string" ? raw.trim().replace(/\s+/g, " ") : "";
  if (!title) return { error: "Give the task a title." };
  if (title.length > MAX_TITLE) {
    return { error: `Keep the title under ${MAX_TITLE} characters (currently ${title.length}).` };
  }
  return { title };
}

function explain(error: unknown): string {
  if (error instanceof DatabaseUnavailableError) {
    return error.kind === "missing-url"
      ? "No database connected yet. Add Postgres in Vercel, then pull the env vars."
      : "Couldn't reach the database. This is usually a network hiccup — try again.";
  }
  return "Something went wrong saving that. Try again.";
}

export async function createTaskAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await authenticate();
  if (!auth.ok) return auth;

  const parsed = validateTitle(formData.get("title"));
  if ("error" in parsed) return { ok: false, error: parsed.error };

  const rawStatus = formData.get("status");
  const status: Status = isStatus(rawStatus) ? rawStatus : "open";

  try {
    await createTask(parsed.title, status, auth.user.id);
  } catch (error) {
    return { ok: false, error: explain(error) };
  }
  revalidatePath("/");
  return { ok: true };
}

export async function moveTaskAction(id: string, status: Status): Promise<ActionResult> {
  const auth = await authenticate();
  if (!auth.ok) return auth;

  if (typeof id !== "string" || !id) return { ok: false, error: "That task no longer exists." };
  if (!isStatus(status)) return { ok: false, error: "Unknown status." };

  try {
    await setTaskStatus(id, status);
  } catch (error) {
    return { ok: false, error: explain(error) };
  }
  revalidatePath("/");
  return { ok: true };
}

export async function deleteTaskAction(id: string): Promise<ActionResult> {
  const auth = await authenticate();
  if (!auth.ok) return auth;

  if (typeof id !== "string" || !id) return { ok: false, error: "That task no longer exists." };

  try {
    await deleteTask(id);
  } catch (error) {
    return { ok: false, error: explain(error) };
  }
  revalidatePath("/");
  return { ok: true };
}

export async function clearDoneAction(): Promise<ActionResult> {
  const auth = await authenticate();
  if (!auth.ok) return auth;

  try {
    const removed = await clearDone();
    revalidatePath("/");
    return {
      ok: true,
      message: removed === 1 ? "Removed 1 task." : `Removed ${removed} tasks.`,
    };
  } catch (error) {
    return { ok: false, error: explain(error) };
  }
}
