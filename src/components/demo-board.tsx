"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";

import { Board } from "@/components/board";
import { TaskComposer } from "@/components/task-composer";
import { makeDemoTask } from "@/lib/demo-fixtures";
import type { Status, Task } from "@/lib/tasks";

/**
 * Fixture-backed board used by the /demo route to preview the UI with no
 * database. Mutations are applied to local state only — nothing is persisted
 * and no Server Action is called.
 *
 * `initialTasks` comes from the server so the fixture timestamps are identical
 * during SSR and hydration.
 */
export function DemoBoard({ initialTasks }: { initialTasks: Task[] }) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const nextId = useRef(0);

  const add = useCallback((title: string, status: Status) => {
    setTasks((current) => [makeDemoTask(title, status, nextId.current++), ...current]);
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
        <p className="text-xs font-medium text-foreground">Preview mode</p>
        <p className="mt-0.5 max-w-prose text-xs text-muted-foreground">
          Sample data, no database. Everything works — drag cards, change status, delete, clear
          done — but nothing is saved. The real board lives at{" "}
          <Link href="/" className="text-primary underline underline-offset-2">
            /
          </Link>
          .
        </p>
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Board</h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          One list, four columns. Drag a card between them, or use the status button on each
          card.
        </p>
      </div>

      <TaskComposer onDemoAdd={add} />
      <Board tasks={tasks} currentUserId="demo-user-You" onLocalChange={setTasks} />
    </div>
  );
}
