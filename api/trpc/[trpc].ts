// Vercel serverless function that hosts the tRPC router.
// Mapped at /api/trpc/* by Vercel's filesystem routing (catch-all segment).
//
// Runtime is Node.js because we open a TCP connection to Postgres via
// postgres-js. Edge runtime can't do TCP.

import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createContext } from "../../server/_core/context";
import { appRouter } from "../../server/routers";

export const config = {
  runtime: "nodejs",
  maxDuration: 30,
};

export default async function handler(req: Request): Promise<Response> {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: async ({ req: fetchReq }) =>
      createContext({ headers: fetchReq.headers }),
    onError({ error, path }) {
      console.error(`[tRPC] ${path ?? "<no-path>"} → ${error.code}: ${error.message}`);
    },
  });
}
