# Brand — Nightshift

A small, fast task board. Move work from open to done.

## Status

Active. This is the source of truth for colour, type and voice in this project.
`frontend-design-guidelines` reads this file before generating UI.

---

## Palette — "Nightshift"

**Vibe:** technical · minimal · premium
**Reasoning:** a dense, dark-first board that stays legible after four hours of
staring at it. A near-neutral violet-tinted ink base keeps the four status
accents — the part that actually carries meaning — as the only saturated
elements on screen. One accent (violet) for brand actions; everything else is
semantic.

Dark mode is the primary experience; light mode is derived from the same hues so
the two read as the same product at different times of day.

### Seeds

| Role | Light | Dark |
|---|---|---|
| bg-base | `oklch(0.985 0.003 275)` | `oklch(0.145 0.014 275)` |
| bg-elevated | `oklch(1 0 275)` | `oklch(0.198 0.016 275)` |
| primary | `oklch(0.52 0.21 288)` | `oklch(0.72 0.15 288)` |
| primary-soft | `oklch(0.94 0.02 286)` | `oklch(0.265 0.032 286)` |
| fg-base | `oklch(0.2 0.015 275)` | `oklch(0.965 0.004 275)` |

### Full token set

Written to `src/app/globals.css` under `:root, [data-theme="light"]` and
`[data-theme="dark"]`. Nothing else in that file is generated — edit the tokens,
not the components.

| Token | Light | Dark |
|---|---|---|
| `--background` | `oklch(0.985 0.003 275)` | `oklch(0.145 0.014 275)` |
| `--foreground` | `oklch(0.2 0.015 275)` | `oklch(0.965 0.004 275)` |
| `--card` | `oklch(1 0 275)` | `oklch(0.198 0.016 275)` |
| `--popover` | `oklch(1 0 275)` | `oklch(0.223 0.017 275)` |
| `--primary` | `oklch(0.52 0.21 288)` | `oklch(0.72 0.15 288)` |
| `--primary-foreground` | `oklch(0.99 0 288)` | `oklch(0.15 0.03 288)` |
| `--secondary` | `oklch(0.955 0.006 275)` | `oklch(0.24 0.024 275)` |
| `--muted` | `oklch(0.955 0.006 275)` | `oklch(0.22 0.016 275)` |
| `--muted-foreground` | `oklch(0.5 0.015 275)` | `oklch(0.68 0.014 275)` |
| `--accent` | `oklch(0.94 0.02 286)` | `oklch(0.265 0.032 286)` |
| `--destructive` | `oklch(0.55 0.21 25)` | `oklch(0.7 0.17 25)` |
| `--destructive-foreground` | `oklch(0.99 0 25)` | `oklch(0.16 0.03 25)` |
| `--border` | `oklch(0.84 0.006 275)` | `oklch(0.32 0.018 275)` |
| `--input` | `oklch(0.965 0.005 275)` | `oklch(0.198 0.016 275)` |
| `--ring` | `oklch(0.52 0.21 288)` | `oklch(0.72 0.15 288)` |
| `--radius` | `0.625rem` | `0.625rem` |

### Status accents

Semantic, not decorative — these four are the only hues that mean something.

| Status | Light | Dark |
|---|---|---|
| `--status-open` | `oklch(0.52 0.13 255)` | `oklch(0.78 0.09 255)` |
| `--status-progress` | `oklch(0.55 0.13 78)` | `oklch(0.82 0.14 78)` |
| `--status-review` | `oklch(0.52 0.16 320)` | `oklch(0.79 0.13 320)` |
| `--status-done` | `oklch(0.52 0.13 158)` | `oklch(0.8 0.15 158)` |

### Contrast

Verified numerically — OKLCH → linear sRGB → WCAG relative luminance — not by
eye. **28/28 token pairs pass in both modes** (body text ≥ 4.5:1, icons and
focus rings ≥ 3:1, borders ≥ 1.5:1), and every value sits inside the sRGB gamut
so the browser never silently clamps a colour.

The rendered page was re-checked in a real browser at 1280 px and 375 px, in
both themes: every text node meets AA against its *composited* background.

If you change a colour, re-run that check rather than trusting the swatch.

---

## Typography

**Geist** (UI) + **Geist Mono** (numbers, timestamps, code), wired through
`next/font/google` in `src/app/layout.tsx`.

Geist is a modern geometric grotesque — slightly warmer than Inter, distinctive
without being loud. It reads as engineering-forward, which is the register this
tool wants. The mono face is not decoration: it carries `tabular-nums` so
timestamps and counts never jitter as they tick.

Do not replace `next/font` with `<link>` tags. Next.js self-hosts and inlines
these at build time, which removes both the layout shift and the runtime fetch.

### Scale

| Role | Class | Use |
|---|---|---|
| H1 (page) | `text-2xl font-semibold tracking-tight` | "Board" |
| Section | `text-xs font-semibold uppercase tracking-wide` | Column headers |
| Body | `text-sm` | Card titles, prose |
| Small | `text-xs text-muted-foreground` | Helper copy |
| Micro | `text-[11px]` + `font-mono tabular-nums` | Timestamps, counts |

---

## Gradients

One, and it is decorative: a violet radial wash behind the header, built with
`color-mix(in oklab, var(--primary) 18%, transparent)`. It is `aria-hidden` and
`pointer-events-none`, sits at `-z-10`, and never sits under text — so it cannot
affect contrast. Do not add gradients behind body copy.

---

## Voice

**Direct and calm.** The product is a shared surface for a team that already
knows what the work is; the copy should stay out of the way. Labels are verbs
where possible — "Add", "Keep", "Clear 2 done". Sentence case, active voice, no
pleasantries.

**Errors say what to do next.** Never "Something went wrong." The database
failure path names the exact three steps to fix it. Validation says the
specific constraint — "Keep the title under 280 characters (currently 301)" —
not "Invalid input."

**Empty states are honest, not cheerful.** Each column states what would go
there and how, e.g. "Nothing in flight. Drag a task here to start it." No
illustrations, no exclamation marks, no "🎉".

**Never blame the user, never pad.** Two sentences is the ceiling for any
helper string.

---

## Usage

**Do**

- Reach for a token; if one is missing, add it to `globals.css`
- Keep status colour semantic — it means a column, nothing else
- Pair `font-mono tabular-nums` with any number that changes
- Use `pointer-coarse:` to enlarge hit targets on touch rather than sizing
  everything up for mouse users

**Don't**

- Hardcode hex values or `bg-white` / `text-black`
- Use `.dark` for theming — this project keys off `[data-theme="dark"]`
- Add a second accent colour; `--primary` is the only brand accent
- Use `transition: all` (see below) or animate past 300 ms
- Put a gradient or a muted-foreground colour behind body text

### Motion

Fixed tiers, all named properties: **100 ms** for interaction feedback (hover,
press), **180 ms** for element entry (`.animate-rise`), **300 ms** for the
progress bar. `prefers-reduced-motion: reduce` disables motion outright rather
than shortening it — including a global `transition-duration: 0.01ms` guard.
