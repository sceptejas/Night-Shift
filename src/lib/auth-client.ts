"use client";

import { createAuthClient } from "better-auth/react";

/**
 * Typed auth client. The methods available here mirror the server config, so
 * enabling a provider on the server surfaces it here as a typed call.
 */
export const authClient = createAuthClient();

export const { signIn, signOut, useSession } = authClient;
