/**
 * Task domain model.
 *
 * Kept deliberately tiny: a task is a title and a status. Everything else
 * (ordering, grouping, filtering) is derived, not stored.
 */

export const STATUSES = ["open", "in_progress", "in_review", "done"] as const;

export type Status = (typeof STATUSES)[number];

export type Task = {
  id: string;
  title: string;
  status: Status;
  /** `user.id` of whoever added it. Null for rows created before auth existed. */
  createdBy: string | null;
  /** Display name resolved at read time. Null when the author is unknown. */
  authorName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Column = {
  status: Status;
  label: string;
  /** Short helper text shown in the empty state so it never just says "no data". */
  hint: string;
};

export const COLUMNS: readonly Column[] = [
  { status: "open", label: "Open", hint: "Nothing queued. Add the next thing." },
  {
    status: "in_progress",
    label: "In progress",
    hint: "Nothing in flight. Drag a task here to start it.",
  },
  {
    status: "in_review",
    label: "In review",
    hint: "No reviews waiting. Clean slate.",
  },
  {
    status: "done",
    label: "Done",
    hint: "Nothing shipped yet. It'll show up here.",
  },
] as const;

const STATUS_LABELS = Object.fromEntries(
  COLUMNS.map((c) => [c.status, c.label]),
) as Record<Status, string>;

export function statusLabel(status: Status): string {
  return STATUS_LABELS[status];
}

/** Narrow an arbitrary string (FormData, drag payload) to a Status. */
export function isStatus(value: unknown): value is Status {
  return typeof value === "string" && (STATUSES as readonly string[]).includes(value);
}
