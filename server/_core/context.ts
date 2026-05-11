import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { parse as parseCookieHeader } from "cookie";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { getSupabaseAdmin } from "./supabaseServer";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  try {
    const token = extractAccessToken(opts.req);
    if (token) {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data.user) {
        user = await syncUser(data.user);
      }
    }
  } catch (error) {
    console.warn("[Auth] Context error:", error);
  }
  return { req: opts.req, res: opts.res, user };
}

function extractAccessToken(req: CreateExpressContextOptions["req"]): string | null {
  const authHeader = req.headers["authorization"];
  if (typeof authHeader === "string" && authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim() || null;
  }

  const cookieHeader = req.headers["cookie"];
  if (typeof cookieHeader === "string") {
    const cookies = parseCookieHeader(cookieHeader);
    for (const [name, value] of Object.entries(cookies)) {
      if (!/^sb-.*-auth-token(\.\d+)?$/.test(name) || typeof value !== "string") continue;
      const token = parseSupabaseCookieValue(value);
      if (token) return token;
    }
  }

  return null;
}

function parseSupabaseCookieValue(raw: string): string | null {
  try {
    const stripped = raw.startsWith("base64-")
      ? Buffer.from(raw.slice(7), "base64").toString("utf-8")
      : raw;
    const parsed = JSON.parse(stripped);
    if (parsed && typeof parsed.access_token === "string") {
      return parsed.access_token;
    }
  } catch {
    /* not a session cookie */
  }
  return null;
}

type SupabaseAuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
};

async function syncUser(supabaseUser: SupabaseAuthUser): Promise<User | null> {
  const openId = supabaseUser.id;
  const meta = supabaseUser.user_metadata ?? {};
  const appMeta = supabaseUser.app_metadata ?? {};
  const name =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    null;
  const loginMethod = typeof appMeta.provider === "string" ? appMeta.provider : null;

  const existing = await db.getUserByOpenId(openId);
  if (existing) {
    await db.upsertUser({ openId, lastSignedIn: new Date() });
    return existing;
  }

  await db.upsertUser({
    openId,
    name,
    email: supabaseUser.email ?? null,
    loginMethod,
    lastSignedIn: new Date(),
  });
  return (await db.getUserByOpenId(openId)) ?? null;
}
