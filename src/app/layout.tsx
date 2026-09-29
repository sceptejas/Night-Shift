import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { ThemeToggle } from "@/components/theme-toggle";
import { ToastProvider } from "@/components/toast";
import { UserMenu } from "@/components/user-menu";
import { getSessionUser } from "@/lib/session";

import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Nightshift — task board",
  description: "A small, fast board for moving work from open to done.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#080a10" },
  ],
};

/**
 * Runs synchronously in <head> before first paint, so the saved theme applies
 * with no flash. `suppressHydrationWarning` on <html> tells React the DOM wins
 * over the server-rendered attribute.
 */
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("nightshift-theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Reading the session in the layout is what makes the account menu correct on
  // every route, including /sign-in (where it must not appear). This opts the
  // tree into dynamic rendering, which the board already required.
  const user = await getSessionUser();

  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <ToastProvider>
          <div className="relative flex min-h-dvh flex-col">
            {/* Ambient brand wash — decorative only, so it is aria-hidden and
                never sits beneath text that needs to hold contrast. */}
            <div
              aria-hidden="true"
              className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-80"
              style={{
                background:
                  "radial-gradient(60rem 20rem at 50% -8rem, color-mix(in oklab, var(--primary) 18%, transparent), transparent 70%)",
              }}
            />

            <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-md">
              <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-3 px-4 md:px-6 lg:px-8">
                <span
                  aria-hidden="true"
                  className="grid size-7 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground"
                >
                  <svg viewBox="0 0 24 24" className="size-4" fill="none">
                    <path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9Z" fill="currentColor" />
                  </svg>
                </span>
                <span className="text-sm font-semibold tracking-tight">Nightshift</span>
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  Move work from open to done.
                </span>

                <div className="ml-auto flex items-center gap-1">
                  <ThemeToggle />
                  {user && <UserMenu user={user} />}
                </div>
              </div>
            </header>

            <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-16 pt-6 md:px-6 lg:px-8">
              {children}
            </main>

            <footer className="mx-auto w-full max-w-7xl px-4 pb-8 md:px-6 lg:px-8">
              <p className="text-xs text-muted-foreground">
                Stored in Postgres. Press{" "}
                <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">
                  N
                </kbd>{" "}
                to add a task.
              </p>
            </footer>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
