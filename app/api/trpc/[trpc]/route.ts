// Next.js Route Handler that hosts the entire tRPC router via the fetch
// adapter. Catch-all segment [trpc] handles every /api/trpc/<procedure>.
//
// runtime = "nodejs" because Postgres opens TCP connections (Edge can't).

import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createContext } from "@/server/_core/context";
import { appRouter } from "@/server/routers";

export const runtime = "nodejs";
export const maxDuration = 30;

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: async ({ req: fetchReq }) =>
      createContext({ headers: fetchReq.headers }),
    onError({ error, path }) {
      console.error(`[tRPC] ${path ?? "<no-path>"} → ${error.code}: ${error.message}`);
    },
  });

export { handler as GET, handler as POST };
