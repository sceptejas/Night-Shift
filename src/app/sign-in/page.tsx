import Link from "next/link";
import { redirect } from "next/navigation";
import { TriangleAlert } from "lucide-react";

import { SignInForm } from "@/components/sign-in-form";
import { authConfigGaps, getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata = { title: "Sign in — Nightshift" };

/** Only allow same-site relative redirects, never an absolute URL. */
function safeNext(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export default async function SignInPage(props: PageProps<"/sign-in">) {
  const params = await props.searchParams;
  const next = safeNext(params.next);

  // Already signed in? Straight through.
  const user = await getSessionUser();
  if (user) redirect(next);

  const gaps = authConfigGaps();

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="space-y-2 text-center">
            <span
              aria-hidden="true"
              className="mx-auto grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground"
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none">
                <path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9Z" fill="currentColor" />
              </svg>
            </span>
            <h1 className="text-xl font-semibold tracking-tight">Sign in to Nightshift</h1>
            <p className="text-xs text-muted-foreground">
              The board is shared by your team. Sign in to see and edit it.
            </p>
          </div>

          {gaps.length > 0 ? <SetupNotice gaps={gaps} /> : <SignInForm next={next} />}

          <p className="border-t border-border pt-2 text-center text-[11px] text-muted-foreground">
            <Link
              href="/"
              className="inline-flex min-h-9 items-center rounded-md px-2 text-primary underline underline-offset-2 transition-colors duration-100 ease-out hover:text-foreground pointer-coarse:min-h-11"
            >
              Back to the board
            </Link>
          </p>
        </div>

        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Access is granted to any GitHub account that completes sign-in.
        </p>
      </div>
    </div>
  );
}

const GAP_HELP: Record<string, string> = {
  DATABASE_URL:
    "No Postgres connected. In Vercel: Storage → Create Database → Postgres (Neon), then redeploy.",
  "BETTER_AUTH_SECRET (at least 32 characters)":
    "Required in production: sessions are signed with it. Generate one with `openssl rand -base64 32` and set it on the project. Without it anyone could forge a session.",
  "GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET":
    "Create an OAuth app at github.com/settings/developers with callback URL <your-domain>/api/auth/callback/github.",
  "BETTER_AUTH_URL (so OAuth callbacks return to the right host)":
    "Set it to this deployment's URL, e.g. https://your-app.vercel.app.",
};

function SetupNotice({ gaps }: { gaps: string[] }) {
  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 p-3.5">
      <div className="flex items-center gap-2 text-destructive">
        <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />
        <p className="text-xs font-medium">
          {gaps.length === 1 ? "Auth isn't configured yet" : "Auth isn't fully configured yet"}
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        {gaps.map((gap) => (
          <li key={gap} className="flex flex-col gap-0.5">
            <code className="font-mono text-[10px] text-foreground">{gap}</code>
            <span className="text-[11px] leading-relaxed text-muted-foreground">
              {GAP_HELP[gap] ?? "Set this environment variable and redeploy."}
            </span>
          </li>
        ))}
      </ul>

      <p className="text-[11px] text-muted-foreground">
        Full steps in{" "}
        <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">README.md</code>.
      </p>
    </div>
  );
}
