"use client";

import { LogOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { signOut } from "@/lib/auth-client";
import type { SessionUser } from "@/lib/session";

export function UserMenu({ user }: { user: SessionUser }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
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

  const initials =
    user.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?";

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Signed in as ${user.name}. Open account menu.`}
        className="grid size-9 place-items-center overflow-hidden rounded-full border border-border bg-secondary text-[11px] font-semibold text-secondary-foreground transition-colors duration-100 ease-out hover:border-primary/50 active:translate-y-px pointer-coarse:size-11"
      >
        {user.image ? (
          // GitHub avatar. A plain <img> avoids next/image domain config for a
          // single 36px asset, and falls back to initials on error.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt=""
            width={36}
            height={36}
            className="size-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span aria-hidden="true">{initials}</span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account"
          className="animate-rise absolute right-0 top-11 z-30 w-56 overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-lg"
        >
          <div className="px-2 py-2">
            <p className="truncate text-xs font-medium text-popover-foreground">{user.name}</p>
            <p className="truncate text-[11px] text-muted-foreground">{user.email}</p>
          </div>

          <div className="border-t border-border pt-1">
            <button
              type="button"
              role="menuitem"
              disabled={pending}
              onClick={async () => {
                setPending(true);
                await signOut();
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs text-popover-foreground transition-colors duration-100 ease-out hover:bg-accent hover:text-accent-foreground disabled:opacity-60"
            >
              <LogOut className="size-3.5" aria-hidden="true" />
              {pending ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
