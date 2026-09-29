import { Suspense } from "react";

import { Board, BoardError } from "@/components/board";
import { BoardSkeleton } from "@/components/board-skeleton";
import { TaskComposer } from "@/components/task-composer";
import { DatabaseUnavailableError, listTasks } from "@/lib/db";
import { requireUser } from "@/lib/session";
import type { SessionUser } from "@/lib/session";
import type { Task } from "@/lib/tasks";

/**
 * The board must reflect the database on every request and must not be
 * prerendered at build time, where DATABASE_URL is unavailable.
 *
 * `dynamic` still exists in Next.js 16 — it is removed only when Cache
 * Components is enabled, which this app does not opt into.
 */
export const dynamic = "force-dynamic";

async function BoardData({ user }: { user: SessionUser }) {
  let tasks: Task[];
  try {
    tasks = await listTasks();
  } catch (error) {
    if (error instanceof DatabaseUnavailableError) {
      return <BoardError detail={error.detail} isSetup={error.kind === "missing-url"} />;
    }
    throw error;
  }

  return (
    <>
      <TaskComposer />
      <Board tasks={tasks} currentUserId={user.id} />
    </>
  );
}

export default async function Page() {
  // Unauthenticated visitors are redirected to /sign-in by `requireUser`, which
  // is the authoritative check — the `proxy` redirect is only an optimisation.
  const user = await requireUser();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Board</h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          One list, four columns, shared by the team. Drag a card between them, or use the
          status button on each card.
        </p>
      </div>

      <Suspense fallback={<BoardSkeleton />}>
        <BoardData user={user} />
      </Suspense>
    </div>
  );
}
