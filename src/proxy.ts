import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Route protection, Next.js 16 style.
 *
 * Next 16 renamed `middleware` to `proxy` and runs it on the Node.js runtime.
 * This is an *optimistic* check only — it looks for the presence of a session
 * cookie so an unauthenticated visitor gets a clean redirect instead of a flash
 * of empty board.
 *
 * It is deliberately NOT the security boundary. A forged cookie would pass this
 * check, so the real enforcement lives in `requireUser()` on the page and
 * `requireUserForAction()` inside every Server Action.
 */
export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    const signIn = new URL("/sign-in", request.url);
    // Preserve where they were heading so sign-in can return them there.
    const { pathname, search } = request.nextUrl;
    if (pathname !== "/") signIn.searchParams.set("next", pathname + search);
    return NextResponse.redirect(signIn);
  }

  return NextResponse.next();
}

export const config = {
  // Only the board. `/sign-in` and `/api/auth/*` must stay reachable, and
  // `/demo` is already development-only.
  matcher: ["/"],
};
