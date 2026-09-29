"use client";

import { CheckCheck, Inbox, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useOptimistic, useState, useTransition } from "react";

import { clearDoneAction, deleteTaskAction, moveTaskAction } from "@/app/actions";
import { STATUS_ICON, STATUS_TEXT } from "@/components/status-menu";
import { TaskCard } from "@/components/task-card";
import { useToast } from "@/components/toast";
import { COLUMNS, type Status, type Task } from "@/lib/tasks";

type OptimisticAction =
  | { type: "move"; id: string; status: Status }
  | { type: "delete"; id: string }
  | { type: "clear-done" };

function reduce(tasks: Task[], action: OptimisticAction): Task[] {
  switch (action.type) {
    case "move":
      return tasks.map((task) =>
        task.id === action.id ? { ...task, status: action.status } : task,
      );
    case "delete":
      return tasks.filter((task) => task.id !== action.id);
    case "clear-done":
      return tasks.filter((task) => task.status !== "done");
  }
}

export function Board({
  tasks,
  currentUserId,
  onLocalChange,
}: {
  tasks: Task[];
  /** Used to render "You" instead of the viewer's own name on their tasks. */
  currentUserId?: string;
  /**
   * Preview mode. When provided, mutations are applied to this callback instead
   * of hitting the server, so the board can be driven with fixture data and no
   * database. Only the demo route passes it.
   */
  onLocalChange?: (next: Task[]) => void;
}) {
  // Optimistic layer: the board repaints on the same frame as the click, then
  // reconciles with whatever the server returns. On failure the optimistic
  // entry is dropped when the transition ends, so the UI rolls back on its own.
  const [visible, applyOptimistic] = useOptimistic(tasks, reduce);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overStatus, setOverStatus] = useState<Status | null>(null);
  const [, startTransition] = useTransition();
  const { push } = useToast();

  const grouped = useMemo(() => {
    const map = new Map<Status, Task[]>(COLUMNS.map((column) => [column.status, []]));
    for (const task of visible) {
      const bucket = map.get(task.status) ?? map.get("open")!;
      bucket.push(task);
    }
    return map;
  }, [visible]);

  const done = grouped.get("done")?.length ?? 0;
  const total = visible.length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  /** Single sink for every mutation, so preview and live paths can't diverge. */
  function commit(action: OptimisticAction) {
    if (onLocalChange) {
      onLocalChange(reduce(tasks, action));
      return;
    }

    startTransition(async () => {
      applyOptimistic(action);
      const result =
        action.type === "move"
          ? await moveTaskAction(action.id, action.status)
          : action.type === "delete"
            ? await deleteTaskAction(action.id)
            : await clearDoneAction();

      if (action.type === "clear-done") {
        if (result.ok) push(result.message ?? "Cleared.");
        else push(result.error, "error");
      } else if (!result.ok) {
        push(result.error, "error");
      }
    });
  }

  function move(id: string, status: Status) {
    const current = visible.find((task) => task.id === id);
    if (!current || current.status === status) return;
    commit({ type: "move", id, status });
  }

  return (
    <div className="space-y-6">
      {/* Progress summary */}
      <section
        aria-label="Progress"
        className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl border border-border bg-card px-4 py-3"
      >
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-2xl leading-none font-semibold tabular-nums">
            {done}
          </span>
          <span className="text-xs text-muted-foreground">
            of {total} {total === 1 ? "task" : "tasks"} done
          </span>
        </div>

        <div
          className="order-last w-full sm:order-none sm:w-auto sm:flex-1"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${percent}% complete`}
        >
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {done > 0 && (
          <button
            type="button"
            onClick={() => commit({ type: "clear-done" })}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium text-muted-foreground transition-colors duration-100 ease-out hover:border-destructive/40 hover:text-destructive active:translate-y-px pointer-coarse:min-h-11"
          >
            <CheckCheck className="size-3.5" aria-hidden="true" />
            Clear {done} done
          </button>
        )}
      </section>

      {total === 0 ? (
        <EmptyBoard />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((column) => {
            const items = grouped.get(column.status) ?? [];
            const Icon = STATUS_ICON[column.status];
            const isOver = overStatus === column.status;

            return (
              <section
                key={column.status}
                aria-label={`${column.label}, ${items.length} ${items.length === 1 ? "task" : "tasks"}`}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  if (overStatus !== column.status) setOverStatus(column.status);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const id = event.dataTransfer.getData("text/plain");
                  setOverStatus(null);
                  setDraggingId(null);
                  if (id) move(id, column.status);
                }}
                className={`flex flex-col rounded-xl border bg-secondary/40 transition-colors duration-100 ease-out ${
                  isOver ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <header className="flex items-center gap-2 px-3 py-2.5">
                  <Icon className={`size-4 ${STATUS_TEXT[column.status]}`} aria-hidden="true" />
                  <h2 className="text-xs font-semibold tracking-wide text-foreground uppercase">
                    {column.label}
                  </h2>
                  <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">
                    {items.length}
                  </span>
                </header>

                <ul className="flex flex-1 flex-col gap-2 px-3 pb-3">
                  {items.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      currentUserId={currentUserId}
                      onMove={move}
                      onDelete={(id) => commit({ type: "delete", id })}
                      onDragStartTask={setDraggingId}
                      onDragEndTask={() => {
                        setDraggingId(null);
                        setOverStatus(null);
                      }}
                      isDragging={draggingId === task.id}
                    />
                  ))}

                  {items.length === 0 && (
                    <li className="list-none rounded-lg border border-dashed border-border px-3 py-6 text-center">
                      <p className="text-xs text-muted-foreground">{column.hint}</p>
                    </li>
                  )}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyBoard() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border px-6 py-16 text-center">
      <span className="grid size-11 place-items-center rounded-full bg-muted text-muted-foreground">
        <Inbox className="size-5" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium">No tasks yet</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          Add your first one above. Everything you create lands in{" "}
          <span className="font-medium text-status-open">Open</span> unless you pick another
          column.
        </p>
      </div>
    </div>
  );
}

export function BoardError({ detail, isSetup }: { detail: string; isSetup: boolean }) {
  const router = useRouter();
  const [retrying, startRetry] = useTransition();

  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-5">
      <div className="flex items-center gap-2 text-destructive">
        <TriangleAlert className="size-4" aria-hidden="true" />
        <p className="text-sm font-medium">
          {isSetup ? "No database connected" : "Couldn't load your tasks"}
        </p>
      </div>
      <p className="max-w-prose text-xs leading-relaxed text-muted-foreground">{detail}</p>

      {isSetup ? (
        <ol className="list-decimal space-y-1.5 pl-4 text-xs text-muted-foreground">
          <li>
            Open your project on Vercel → <span className="text-foreground">Storage</span> →{" "}
            <span className="text-foreground">Create Database</span> → Postgres (Neon).
          </li>
          <li>
            Run <code className="rounded bg-muted px-1 py-0.5 font-mono">vercel env pull</code> to
            write <code className="rounded bg-muted px-1 py-0.5 font-mono">DATABASE_URL</code>{" "}
            locally.
          </li>
          <li>Restart the dev server — the table is created automatically on first load.</li>
        </ol>
      ) : (
        <p className="text-xs text-muted-foreground">
          Usually a network hiccup. Nothing was lost — retry in a moment.
        </p>
      )}

      <button
        type="button"
        disabled={retrying}
        onClick={() => startRetry(() => router.refresh())}
        className="inline-flex min-h-9 items-center rounded-lg border border-border bg-background px-3 text-xs font-medium transition-colors duration-100 ease-out hover:bg-accent active:translate-y-px disabled:opacity-60 pointer-coarse:min-h-11"
      >
        {retrying ? "Retrying…" : "Retry"}
      </button>
    </div>
  );
}
