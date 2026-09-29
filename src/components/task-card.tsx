"use client";

import { GripVertical, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { StatusMenu } from "@/components/status-menu";
import type { Status, Task } from "@/lib/tasks";

function formatRelative(now: number, iso: string): string {
  const seconds = Math.round((now - new Date(iso).getTime()) / 1000);
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * Deterministic on first render so server and client markup match — formatting
 * a date with the ambient locale during SSR would mismatch the browser's
 * timezone. The clock is read in a timer callback (not synchronously in the
 * effect body) and the label is derived during render.
 */
export function RelativeTime({ iso }: { iso: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const immediate = setTimeout(tick, 0);
    const interval = setInterval(tick, 60_000);
    return () => {
      clearTimeout(immediate);
      clearInterval(interval);
    };
  }, []);

  return (
    <time
      dateTime={iso}
      title={new Date(iso).toUTCString()}
      className="font-mono text-[11px] tabular-nums text-muted-foreground"
    >
      {now === null ? iso.slice(0, 10) : formatRelative(now, iso)}
    </time>
  );
}

export function TaskCard({
  task,
  currentUserId,
  onMove,
  onDelete,
  onDragStartTask,
  onDragEndTask,
  isDragging,
  disabled,
}: {
  task: Task;
  currentUserId?: string;
  onMove: (id: string, status: Status) => void;
  onDelete: (id: string) => void;
  onDragStartTask: (id: string) => void;
  onDragEndTask: () => void;
  isDragging: boolean;
  disabled?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-cancel the delete confirmation so a stray click can't leave the card
  // stuck in a destructive state.
  useEffect(() => {
    if (!confirming) return;
    timer.current = setTimeout(() => setConfirming(false), 5000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [confirming]);

  return (
    <li
      draggable={!disabled}
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", task.id);
        event.dataTransfer.effectAllowed = "move";
        onDragStartTask(task.id);
      }}
      onDragEnd={onDragEndTask}
      onKeyDown={(event) => {
        if (event.key === "Escape" && confirming) setConfirming(false);
      }}
      className={`group list-none ${isDragging ? "opacity-40" : ""}`}
    >
      <article className="relative rounded-lg border border-border bg-card p-3 shadow-sm transition-[border-color,box-shadow] duration-100 ease-out hover:border-primary/40 hover:shadow-md focus-within:border-primary/50 active:cursor-grabbing">
        <div className="flex items-start gap-2">
          <GripVertical
            className="mt-0.5 size-3.5 shrink-0 cursor-grab text-muted-foreground/50 transition-colors duration-100 ease-out group-hover:text-muted-foreground"
            aria-hidden="true"
          />
          <p className="min-w-0 flex-1 text-sm leading-snug break-words text-card-foreground">
            {task.title}
          </p>
        </div>

        <div className="mt-2.5 flex items-center gap-2 pl-5.5">
          <RelativeTime iso={task.createdAt} />

          {/* Who added it — the point of a shared board. Rows created before
              auth existed have no author, so the separator is conditional. */}
          {task.createdBy && (
            <>
              <span aria-hidden="true" className="text-muted-foreground/40">
                ·
              </span>
              <span className="min-w-0 truncate text-[11px] text-muted-foreground">
                {task.createdBy === currentUserId ? "You" : (task.authorName ?? "Someone")}
              </span>
            </>
          )}

          <div className="ml-auto flex items-center gap-0.5">
            {confirming ? (
              <>
                <button
                  type="button"
                  onClick={() => onDelete(task.id)}
                  className="min-h-8 rounded-md bg-destructive px-2 text-[11px] font-medium text-destructive-foreground transition-colors duration-100 ease-out hover:opacity-90 active:translate-y-px pointer-coarse:min-h-10"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="min-h-8 rounded-md px-2 text-[11px] font-medium text-muted-foreground transition-colors duration-100 ease-out hover:bg-accent hover:text-accent-foreground active:translate-y-px pointer-coarse:min-h-10"
                >
                  Keep
                </button>
              </>
            ) : (
              <>
                <StatusMenu
                  status={task.status}
                  title={task.title}
                  disabled={disabled}
                  onSelect={(next) => onMove(task.id, next)}
                />
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => setConfirming(true)}
                  // Always in the DOM after the first tap on touch; hidden on
                  // hover-less devices so the row is not permanently cluttered.
                  className="grid size-8 pointer-coarse:size-10 place-items-center rounded-md text-muted-foreground transition-colors duration-100 ease-out hover:bg-destructive/10 hover:text-destructive active:translate-y-px disabled:opacity-50"
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                  <span className="sr-only">Delete “{task.title}”</span>
                </button>
              </>
            )}
          </div>
        </div>
      </article>
    </li>
  );
}
