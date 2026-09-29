import type { Status, Task } from "@/lib/tasks";

/**
 * Fixture data for the /demo preview route.
 *
 * The clock is read here rather than in a component: `react-hooks/purity`
 * forbids impure calls during render, and more importantly the page must build
 * these once on the server and pass them down. If the browser rebuilt them,
 * the timestamps would differ from the server-rendered ones and the <time>
 * attributes would trigger a hydration mismatch.
 */

const MINUTE = 60_000;

/** [title, status, age in minutes, author] */
const SPEC: ReadonlyArray<readonly [string, Status, number, string | null]> = [
  ["Wire up the Neon integration on the Vercel project", "open", 6, "Priya Raman"],
  ["Audit colour contrast across light and dark themes", "open", 140, "You"],
  [
    "A deliberately long task title, to check how wrapping behaves inside a narrow column at this width",
    "open",
    1500,
    "Sam Okoye",
  ],
  ["Ship the drag-and-drop board", "in_progress", 300, "You"],
  ["Add optimistic status updates", "in_progress", 420, "Priya Raman"],
  ["Review the empty-state copy before launch", "in_review", 600, "Sam Okoye"],
  ["Set up the Postgres schema bootstrap", "done", 2000, "You"],
  ["Pick the brand palette", "done", 2600, null],
];

export function buildDemoFixtures(generatedAt: number = Date.now()): Task[] {
  return SPEC.map(([title, status, minutes, author], index) => {
    const iso = new Date(generatedAt - minutes * MINUTE).toISOString();
    return {
      id: `demo-${index}`,
      title,
      status,
      createdBy: author ? `demo-user-${author}` : null,
      authorName: author,
      createdAt: iso,
      updatedAt: iso,
    };
  });
}

/** A brand-new task for the preview composer. */
export function makeDemoTask(title: string, status: Status, id: number): Task {
  const iso = new Date().toISOString();
  return {
    id: `demo-new-${id}`,
    title,
    status,
    createdBy: "demo-user-You",
    authorName: "You",
    createdAt: iso,
    updatedAt: iso,
  };
}
