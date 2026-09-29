"use client";

import { TriangleAlert } from "lucide-react";
import { useEffect } from "react";

/**
 * Route-level error boundary. Catches the nuclear case so a single failure
 * doesn't take the whole page down, and gives the user a way out.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Board crashed:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-5">
      <div className="flex items-center gap-2 text-destructive">
        <TriangleAlert className="size-4" aria-hidden="true" />
        <p className="text-sm font-medium">Something broke rendering the board</p>
      </div>
      <p className="max-w-prose text-xs leading-relaxed text-muted-foreground">
        Your tasks are safe in the database — this is a rendering failure, not data loss. Try
        again, and if it keeps happening check the server logs.
      </p>
      {error.digest && (
        <p className="font-mono text-[11px] text-muted-foreground">digest: {error.digest}</p>
      )}
      <button
        type="button"
        onClick={reset}
        className="inline-flex min-h-9 items-center rounded-lg border border-border bg-background px-3 text-xs font-medium transition-colors duration-100 ease-out hover:bg-accent active:translate-y-px"
      >
        Try again
      </button>
    </div>
  );
}
