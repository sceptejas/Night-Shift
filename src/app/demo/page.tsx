import { notFound } from "next/navigation";

import { DemoBoard } from "@/components/demo-board";
import { buildDemoFixtures } from "@/lib/demo-fixtures";

/**
 * Design preview with no database. Development only — in a production build
 * this route 404s, so it can never be reached on Vercel.
 *
 * To remove it entirely: delete this folder, src/components/demo-board.tsx and
 * src/lib/demo-fixtures.ts.
 */
export const dynamic = "force-dynamic";

export default function DemoPage() {
  if (process.env.NODE_ENV === "production") notFound();

  // Built once here and passed down, so the server-rendered markup and the
  // client hydration use identical timestamps.
  return <DemoBoard initialTasks={buildDemoFixtures()} />;
}
