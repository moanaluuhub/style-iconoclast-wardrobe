import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext; clearedCookies: any[] } {
  const clearedCookies: any[] = [];
  const user: AuthenticatedUser = {
    id: 999999,
    openId: "test-wardrobe-user",
    email: "test@wardrobe.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };
  return { ctx, clearedCookies };
}

// ─── Auth Tests ────────────────────────────────────────────────────────────────

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({
      maxAge: -1,
      httpOnly: true,
      path: "/",
    });
  });

  it("returns current user from auth.me when authenticated", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const user = await caller.auth.me();
    expect(user).toBeDefined();
    expect(user?.openId).toBe("test-wardrobe-user");
  });
});

// ─── Items Router Tests ────────────────────────────────────────────────────────

describe("items router", () => {
  it("items.list returns an array", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const items = await caller.items.list({});
    expect(Array.isArray(items)).toBe(true);
  });

  it("items.list accepts search filter", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const items = await caller.items.list({ search: "test-nonexistent-xyz" });
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBe(0);
  });

  it("items.list accepts category filter", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const items = await caller.items.list({ category: "shoes" });
    expect(Array.isArray(items)).toBe(true);
  });

  it("items.list accepts sortBy options", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    for (const sortBy of ["recent", "price_high", "price_low", "brand_az", "loved"]) {
      const items = await caller.items.list({ sortBy });
      expect(Array.isArray(items)).toBe(true);
    }
  });

  it("items.get throws NOT_FOUND for non-existent item", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.items.get({ id: 99999999 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

// ─── Outfits Router Tests ──────────────────────────────────────────────────────

describe("outfits router", () => {
  it("outfits.list returns an array", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const outfits = await caller.outfits.list();
    expect(Array.isArray(outfits)).toBe(true);
  });

  it("outfits.get throws NOT_FOUND for non-existent outfit", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.outfits.get({ id: 99999999 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

// ─── Stats Router Tests ────────────────────────────────────────────────────────

describe("stats router", () => {
  it("stats.summary returns expected shape", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const stats = await caller.stats.summary();
    if (stats !== null) {
      expect(typeof stats.totalItems).toBe("number");
      expect(typeof stats.totalValue).toBe("number");
      expect(typeof stats.totalPurchaseValue).toBe("number");
      expect(typeof stats.costPerWear).toBe("number");
      expect(Array.isArray(stats.categoryBreakdown)).toBe(true);
      expect(Array.isArray(stats.mostWorn)).toBe(true);
      expect(Array.isArray(stats.newest)).toBe(true);
    }
  });
});

// ─── Price History Tests ───────────────────────────────────────────────────────

describe("priceHistory router", () => {
  it("priceHistory.list returns an array for any itemId", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const history = await caller.priceHistory.list({ itemId: 99999999 });
    expect(Array.isArray(history)).toBe(true);
  });
});
