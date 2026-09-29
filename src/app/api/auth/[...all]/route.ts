import { toNextJsHandler } from "better-auth/next-js";
import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { ensureAuthSchema } from "@/lib/auth-schema";

const { GET: authGET, POST: authPOST } = toNextJsHandler(auth);

/**
 * The OAuth callback reaches Better Auth directly, so the auth tables must
 * exist before the first sign-in attempt — not merely before the first page
 * render. Without this, a user clicking "Continue with GitHub" on a brand-new
 * deployment would hit missing tables.
 *
 * A misconfigured deployment answers with a clear 503 rather than a bare 500,
 * so a failing OAuth round-trip is diagnosable from the network tab alone.
 */
function unavailable(error: unknown) {
  console.error("Auth is not usable:", error);
  return NextResponse.json(
    {
      error: "auth_unavailable",
      message:
        "Auth is not configured. Check DATABASE_URL, BETTER_AUTH_SECRET, GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.",
    },
    { status: 503 },
  );
}

export async function GET(request: NextRequest) {
  try {
    await ensureAuthSchema();
  } catch (error) {
    return unavailable(error);
  }
  return authGET(request);
}

export async function POST(request: NextRequest) {
  try {
    await ensureAuthSchema();
  } catch (error) {
    return unavailable(error);
  }
  return authPOST(request);
}
