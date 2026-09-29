"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

type Mode = "light" | "dark" | "system";

const STORAGE_KEY = "nightshift-theme";
const ORDER: Mode[] = ["system", "light", "dark"];

const LABEL: Record<Mode, string> = { light: "Light", dark: "Dark", system: "System" };

function apply(mode: Mode) {
  const resolved =
    mode === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : mode;
  document.documentElement.setAttribute("data-theme", resolved);
}

/* ---------------------------------------------------------------------------
   Tiny external store over localStorage.

   `useSyncExternalStore` is the right tool here: it reads browser-only state
   without a `setState`-in-effect cascade, and its server snapshot keeps the
   server and first client render identical — the inline script in layout.tsx
   has already painted the correct theme by then, so nothing flashes.
   ------------------------------------------------------------------------- */

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function getSnapshot(): Mode {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : "system";
}

/** The server can't know the stored preference, so assume the default. */
function getServerSnapshot(): Mode {
  return "system";
}

function subscribe(callback: () => void) {
  listeners.add(callback);

  // While the user is on "system", follow the OS if it changes mid-session.
  const query = window.matchMedia("(prefers-color-scheme: dark)");
  const onSystemChange = () => {
    apply(getSnapshot());
    emit();
  };
  query.addEventListener("change", onSystemChange);

  return () => {
    listeners.delete(callback);
    query.removeEventListener("change", onSystemChange);
  };
}

function setMode(next: Mode) {
  if (next === "system") window.localStorage.removeItem(STORAGE_KEY);
  else window.localStorage.setItem(STORAGE_KEY, next);
  apply(next);
  emit();
}

export function ThemeToggle() {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const next = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length];
  const Icon = mode === "light" ? Sun : mode === "dark" ? Moon : Monitor;

  return (
    <button
      type="button"
      onClick={() => setMode(next)}
      aria-label={`Theme: ${LABEL[mode]}. Switch to ${LABEL[next]}.`}
      title={`Theme: ${LABEL[mode]}`}
      className="grid size-9 place-items-center rounded-md text-muted-foreground transition-colors duration-100 ease-out hover:bg-accent hover:text-accent-foreground active:translate-y-px pointer-coarse:size-11"
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  );
}
