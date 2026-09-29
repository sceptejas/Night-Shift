"use client";

import { Circle, CircleCheck, CircleDot, Eye } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { COLUMNS, type Status } from "@/lib/tasks";

export const STATUS_ICON: Record<Status, typeof Circle> = {
  open: Circle,
  in_progress: CircleDot,
  in_review: Eye,
  done: CircleCheck,
};

export const STATUS_TEXT: Record<Status, string> = {
  open: "text-status-open",
  in_progress: "text-status-progress",
  in_review: "text-status-review",
  done: "text-status-done",
};

/** Compact on a mouse, comfortably tappable on a coarse pointer. */
const HIT = "size-8 pointer-coarse:size-10";

/**
 * Keyboard-accessible status picker.
 *
 * Drag-and-drop is the fast path, but it is unusable by keyboard and by screen
 * readers — this menu is the accessible equivalent, so every task can be moved
 * without a pointer.
 */
export function StatusMenu({
  status,
  title,
  onSelect,
  disabled,
}: {
  status: Status;
  title: string;
  onSelect: (next: Status) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  // Close on outside click, and on Escape by returning focus to the trigger.
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Move focus into the menu so arrow keys and Enter work immediately.
  useEffect(() => {
    if (!open) return;
    const first = menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]');
    first?.focus();
  }, [open]);

  const Icon = STATUS_ICON[status];

  function onMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [],
    );
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    const delta = event.key === "ArrowDown" ? 1 : -1;
    items[(index + delta + items.length) % items.length]?.focus();
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Status: ${COLUMNS.find((c) => c.status === status)?.label}. Change status.`}
        title="Change status"
        className={`grid ${HIT} place-items-center rounded-md transition-colors duration-100 ease-out hover:bg-accent active:translate-y-px disabled:opacity-50 ${STATUS_TEXT[status]}`}
      >
        <Icon className="size-4" aria-hidden="true" />
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={`Move “${title}”`}
          onKeyDown={onMenuKeyDown}
          className="animate-rise absolute right-0 top-9 z-30 w-44 overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-lg"
        >
          {COLUMNS.map((column) => {
            const ItemIcon = STATUS_ICON[column.status];
            const current = column.status === status;
            return (
              <button
                key={column.status}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  triggerRef.current?.focus();
                  if (!current) onSelect(column.status);
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-popover-foreground transition-colors duration-100 ease-out hover:bg-accent hover:text-accent-foreground"
              >
                <ItemIcon className={`size-3.5 ${STATUS_TEXT[column.status]}`} aria-hidden="true" />
                <span className="flex-1">{column.label}</span>
                {current && (
                  <span className="font-mono text-[10px] text-muted-foreground">now</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
