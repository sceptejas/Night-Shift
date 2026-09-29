"use client";

import { CornerDownLeft, LoaderCircle, Plus } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";

import { createTaskAction, type ActionResult } from "@/app/actions";
import { useToast } from "@/components/toast";
import { STATUS_ICON, STATUS_TEXT } from "@/components/status-menu";
import { COLUMNS, STATUSES, type Status } from "@/lib/tasks";

/**
 * Add-task composer.
 *
 * Uses `useActionState` so the form still submits if JavaScript hasn't loaded
 * yet (progressive enhancement), while giving instant pending feedback once it
 * has.
 */
export function TaskComposer({
  defaultStatus = "open",
  onDemoAdd,
}: {
  defaultStatus?: Status;
  /**
   * Preview mode. When provided, submit is handled locally instead of calling
   * the server action, so the composer is fully usable with no database.
   */
  onDemoAdd?: (title: string, status: Status) => void;
}) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    createTaskAction,
    null,
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const lastHandled = useRef<ActionResult | null>(null);
  const [status, setStatus] = useState<Status>(defaultStatus);
  const [demoError, setDemoError] = useState<string | null>(null);
  const { push } = useToast();

  // React to each new result exactly once.
  useEffect(() => {
    if (!state || state === lastHandled.current) return;
    lastHandled.current = state;

    if (state.ok) {
      // Clear only the title. A full form.reset() would desync the controlled
      // status select from React state.
      if (inputRef.current) inputRef.current.value = "";
      inputRef.current?.focus();
      push("Task added.");
    } else {
      push(state.error, "error");
    }
  }, [state, push]);

  // "N" focuses the composer, unless the user is already typing somewhere.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "n" && event.key !== "N") return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return;
      }
      event.preventDefault();
      inputRef.current?.focus();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  /** Preview mode: same validation as the server action, applied locally. */
  function handleDemoSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (!onDemoAdd) return; // let the real Server Action run
    event.preventDefault();

    const title = (inputRef.current?.value ?? "").trim().replace(/\s+/g, " ");
    if (!title) {
      setDemoError("Give the task a title.");
      return;
    }
    if (title.length > 280) {
      setDemoError(`Keep the title under 280 characters (currently ${title.length}).`);
      return;
    }

    setDemoError(null);
    onDemoAdd(title, status);
    if (inputRef.current) inputRef.current.value = "";
    inputRef.current?.focus();
    push("Added — preview only, nothing was saved.");
  }

  const error = demoError ?? (state && !state.ok ? state.error : null);

  return (
    <form
      action={onDemoAdd ? undefined : formAction}
      onSubmit={handleDemoSubmit}
      className="rounded-xl border border-border bg-card p-2 shadow-sm"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label htmlFor="task-title" className="sr-only">
          Task title
        </label>
        <input
          ref={inputRef}
          id="task-title"
          name="title"
          type="text"
          required
          maxLength={280}
          autoComplete="off"
          enterKeyHint="done"
          placeholder="What needs doing?"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "task-title-error" : undefined}
          className="min-h-11 w-full flex-1 rounded-lg bg-transparent px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />

        <div className="flex items-center gap-2">
          <label htmlFor="task-status" className="sr-only">
            Initial status
          </label>
          <div className="relative flex-1 sm:flex-none">
            <select
              id="task-status"
              name="status"
              value={status}
              onChange={(event) => setStatus(event.target.value as Status)}
              className="min-h-11 w-full appearance-none rounded-lg border border-border bg-secondary py-0 pr-8 pl-9 text-xs font-medium text-secondary-foreground outline-none transition-colors duration-100 ease-out hover:bg-accent sm:w-40"
            >
              {STATUSES.map((value, index) => (
                <option key={value} value={value}>
                  {COLUMNS[index].label}
                </option>
              ))}
            </select>
            {/* Mirrors the select's current value; decorative for AT because the
                native select already announces the chosen option. */}
            <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center">
              <StatusGlyph status={status} />
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-muted-foreground">
              <svg viewBox="0 0 12 12" className="size-3" aria-hidden="true" fill="none">
                <path
                  d="m3 4.5 3 3 3-3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </div>

          <button
            type="submit"
            disabled={pending}
            aria-busy={pending}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors duration-100 ease-out hover:opacity-90 active:translate-y-px disabled:opacity-60"
          >
            {pending ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Plus className="size-4" aria-hidden="true" />
            )}
            <span>{pending ? "Adding…" : "Add"}</span>
          </button>
        </div>
      </div>

      {error && (
        <p
          id="task-title-error"
          role="alert"
          className="mt-1.5 flex items-center gap-1.5 px-3 text-xs text-destructive"
        >
          {error}
        </p>
      )}

      <p className="mt-1 hidden items-center gap-1 px-3 text-[11px] text-muted-foreground sm:flex">
        <CornerDownLeft className="size-3" aria-hidden="true" />
        Enter to add
      </p>
    </form>
  );
}

function StatusGlyph({ status }: { status: Status }) {
  const Icon = STATUS_ICON[status];
  return <Icon className={`size-3.5 ${STATUS_TEXT[status]}`} aria-hidden="true" />;
}
