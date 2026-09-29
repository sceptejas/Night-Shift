import { COLUMNS } from "@/lib/tasks";

/**
 * Content-shaped skeletons: a composer block, a summary strip, then four
 * columns of card-shaped placeholders. Reserving the real layout means nothing
 * jumps when the data lands.
 */
export function BoardSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="skeleton h-[68px] rounded-xl" />
      <div className="skeleton h-[62px] rounded-xl" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((column) => (
          <div key={column.status} className="rounded-xl border border-border bg-secondary/40">
            <div className="flex items-center gap-2 px-3 py-2.5">
              <div className="skeleton size-4 rounded-full" />
              <div className="skeleton h-3 w-20 rounded" />
            </div>
            <div className="flex flex-col gap-2 px-3 pb-3">
              {Array.from({ length: column.status === "open" ? 3 : 2 }).map((_, index) => (
                <div key={index} className="rounded-lg border border-border bg-card p-3">
                  <div className="skeleton h-3.5 w-full rounded" />
                  <div className="skeleton mt-2 h-3.5 w-3/5 rounded" />
                  <div className="skeleton mt-3 h-3 w-16 rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <span className="sr-only">Loading tasks…</span>
    </div>
  );
}
