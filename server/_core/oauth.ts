import type { Express } from "express";

// Supabase Auth handles OAuth client-side. After a successful sign-in, the
// browser receives the session via PKCE and stores it. The Express server only
// needs to validate the access token on each request (see context.ts).
//
// This stub is kept so the existing import in _core/index.ts stays valid.
// It can be removed entirely once that import is dropped.
export function registerOAuthRoutes(_app: Express) {
  /* no-op */
}
