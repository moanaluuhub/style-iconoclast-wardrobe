export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// `getLoginUrl()` is preserved as the legacy entry point used across the app
// (LoginPage, AppShell, page-level redirects, etc.). It now points to the
// in-app /login route, which renders LoginPage.tsx and triggers the Supabase
// OAuth flow on click.
export const getLoginUrl = () => "/login";
