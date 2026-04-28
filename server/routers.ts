import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import {
  getItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  markItemWorn,
  getTagsForItem,
  setTagsForItem,
  getPriceHistory,
  addPricePoint,
  getOutfits,
  getOutfitById,
  getOutfitItems,
  createOutfit,
  updateOutfit,
  deleteOutfit,
  getStats,
  getCartItems,
  addToCart,
  removeFromCart,
  isInCart,
  updateItemSortOrder,
  getAllUserTags,
  getDesignersShops,
  createDesignerShop,
  updateDesignerShop,
  deleteDesignerShop,
} from "./db";
import { storagePut } from "./storage";

// ─── Items Router ──────────────────────────────────────────────────────────────

const itemsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        category: z.string().optional(),
        color: z.string().optional(),
        brand: z.string().optional(),
        sortBy: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const items = await getItems(ctx.user.id, input);
      const withTags = await Promise.all(
        items.map(async (item) => {
          const tags = await getTagsForItem(item.id);
          return { ...item, tags: tags.map((t) => t.label) };
        })
      );
      return withTags;
    }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const item = await getItemById(input.id, ctx.user.id);
      if (!item) throw new TRPCError({ code: "NOT_FOUND" });
      const tags = await getTagsForItem(item.id);
      const history = await getPriceHistory(item.id, ctx.user.id);
      const inCart = await isInCart(ctx.user.id, item.id);
      return { ...item, tags: tags.map((t) => t.label), priceHistory: history, inCart };
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        brand: z.string().optional(),
        category: z.enum([
          "tops", "bottoms", "outerwear", "shoes", "accessories",
          "bags", "dresses", "suits", "activewear", "other",
        ]),
        color: z.string().optional(),
        size: z.string().optional(),
        purchasePrice: z.number().optional(),
        currency: z.string().optional(),
        purchaseDate: z.string().optional(),
        imageUrl: z.string().optional(),
        imageKey: z.string().optional(),
        buyUrl: z.string().optional(),
        personalNote: z.string().optional(),
        isLoved: z.boolean().optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { tags, purchaseDate, ...rest } = input;
      const data = {
        ...rest,
        userId: ctx.user.id,
        currentPrice: rest.purchasePrice,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
      };
      const result = await createItem(data);
      const insertId = (result as any).insertId as number;
      if (tags && tags.length > 0) {
        await setTagsForItem(insertId, ctx.user.id, tags);
      }
      if (rest.purchasePrice) {
        await addPricePoint({
          itemId: insertId,
          userId: ctx.user.id,
          price: rest.purchasePrice,
          currency: rest.currency ?? "USD",
          note: "Purchase price",
        });
      }
      return { id: insertId };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1).optional(),
        brand: z.string().optional(),
        category: z.enum([
          "tops", "bottoms", "outerwear", "shoes", "accessories",
          "bags", "dresses", "suits", "activewear", "other",
        ]).optional(),
        color: z.string().optional(),
        size: z.string().optional(),
        purchasePrice: z.number().optional(),
        currency: z.string().optional(),
        purchaseDate: z.string().optional(),
        imageUrl: z.string().optional(),
        imageKey: z.string().optional(),
        buyUrl: z.string().optional(),
        personalNote: z.string().optional(),
        isLoved: z.boolean().optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, tags, purchaseDate, ...rest } = input;
      const data: Record<string, unknown> = { ...rest };
      if (purchaseDate) data.purchaseDate = new Date(purchaseDate);
      await updateItem(id, ctx.user.id, data);
      if (tags !== undefined) {
        await setTagsForItem(id, ctx.user.id, tags);
      }
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteItem(input.id, ctx.user.id);
      return { success: true };
    }),

  markWorn: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await markItemWorn(input.id, ctx.user.id);
      return { success: true };
    }),

  uploadImage: protectedProcedure
    .input(
      z.object({
        fileName: z.string(),
        contentType: z.string(),
        base64Data: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const buffer = Buffer.from(input.base64Data, "base64");
      const key = `wardrobe/${ctx.user.id}/${Date.now()}-${input.fileName}`;
      const { url } = await storagePut(key, buffer, input.contentType);
      return { url, key };
    }),


  // ── LLM-powered URL metadata extraction ──────────────────────────────────────
  // Strategy: many luxury sites block server-side fetching (Cloudflare, bot protection).
  // Primary approach: LLM infers product details from the URL path itself — brand names,
  // product names, and categories are almost always encoded in the URL slug.
  // Fallback: attempt a lightweight HTML fetch to get OG tags when possible.
  extractFromUrl: protectedProcedure
    .input(z.object({ url: z.string().url() }))
    .mutation(async ({ input }) => {
      try {
        // ── Step 1: Try to fetch HTML (best-effort, many luxury sites block this) ─
        let html = "";
        const fetchHeaders: Record<string, string>[] = [
          // Googlebot UA — often whitelisted by fashion sites for SEO
          {
            "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
            Accept: "text/html",
          },
          // Standard browser UA
          {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
          },
        ];
        for (const headers of fetchHeaders) {
          if (html.length > 1000) break;
          try {
            const res = await fetch(input.url, {
              headers,
              signal: AbortSignal.timeout(8000),
              redirect: "follow",
            });
            const text = await res.text();
            // Discard Cloudflare challenge pages and bot-detection walls
            const isChallengePage =
              text.includes("_cf_chl_opt") ||
              text.includes("cf-browser-verification") ||
              text.includes("Enable JavaScript and cookies") ||
              text.includes("window.isBotPage") ||
              text.length < 800;
            if (!isChallengePage) {
              html = text;
            }
          } catch {
            // continue to next attempt
          }
        }

        // ── Step 2: Extract OG / meta tags from HTML (if we got real content) ────
        const getMeta = (name: string): string | null => {
          const patterns = [
            new RegExp(`<meta[^>]+property=["']og:${name}["'][^>]+content=["']([^"']+)["']`, "i"),
            new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${name}["']`, "i"),
            new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"),
            new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, "i"),
          ];
          for (const re of patterns) {
            const m = html.match(re);
            if (m?.[1]) return m[1].trim();
          }
          return null;
        };
        const ogTitle = getMeta("title");
        const ogImage = getMeta("image");
        const ogDescription = getMeta("description");
        const ogSiteName = getMeta("site_name");
        const priceMatch =
          html.match(/"price"\s*:\s*"([\d.,]+)"/i) ||
          html.match(/property=["']product:price:amount["'][^>]+content=["']([\d.,]+)["']/i) ||
          html.match(/itemprop=["']price["'][^>]+content=["']([\d.,]+)["']/i);
        const currencyMatch =
          html.match(/property=["']product:price:currency["'][^>]+content=["']([A-Z]{3})["']/i) ||
          html.match(/itemprop=["']priceCurrency["'][^>]+content=["']([A-Z]{3})["']/i);
        const ogPrice = priceMatch?.[1] ? parseFloat(priceMatch[1].replace(",", "")) : null;
        const ogCurrency = currencyMatch?.[1] ?? null;

        // ── Step 3: Parse URL path for product clues ─────────────────────────────
        let urlPath = "";
        let hostname = "";
        try {
          const parsed = new URL(input.url);
          urlPath = parsed.pathname;
          hostname = parsed.hostname.replace("www.", "");
        } catch {
          urlPath = input.url;
        }
        // Convert URL path to readable words (brand/product names are usually in the slug)
        const urlWords = urlPath
          .replace(/[/_-]+/g, " ")
          .replace(/\.(html|aspx|php|htm)$/i, "")
          .replace(/\d{8,}/g, "") // strip long numeric IDs
          .replace(/\s{2,}/g, " ")
          .trim();

        // Build visible text excerpt from HTML if available
        const visibleText =
          html.length > 800
            ? html
                .replace(/<script[\s\S]*?<\/script>/gi, "")
                .replace(/<style[\s\S]*?<\/style>/gi, "")
                .replace(/<[^>]+>/g, " ")
                .replace(/\s{2,}/g, " ")
                .slice(0, 2000)
            : "";

        // ── Step 4: LLM extraction — URL path is the primary signal ──────────────
        const contextLines = [
          `URL: ${input.url}`,
          `Site: ${hostname}`,
          `URL path words: ${urlWords}`,
          ogTitle ? `Page title: ${ogTitle}` : "",
          ogDescription ? `Description: ${ogDescription}` : "",
          visibleText ? `Page text excerpt: ${visibleText}` : "",
        ]
          .filter(Boolean)
          .join("\n");

        const llmResponse = await invokeLLM({
          messages: [
            {
              role: "system",
              content:
                "You are a luxury fashion product data extractor. " +
                "Given a product URL and any available context, extract structured product information. " +
                "The URL path almost always contains the brand name, product name, and category — use these as primary signals. " +
                "Return ONLY valid JSON, no markdown, no explanation.",
            },
            {
              role: "user",
              content:
                `Extract product details from this fashion product URL.\n\n${contextLines}\n\n` +
                `Return JSON with these exact keys (use null for missing values):\n` +
                `{\n` +
                `  "title": "clean product name without brand prefix",\n` +
                `  "brand": "brand name only — infer from URL slug or site name",\n` +
                `  "price": null,\n` +
                `  "currency": "USD",\n` +
                `  "color": "main color name if identifiable from URL or text, else null",\n` +
                `  "category": "one of: tops|bottoms|outerwear|shoes|accessories|bags|dresses|suits|activewear|other",\n` +
                `  "imageUrl": null,\n` +
                `  "description": "brief product description max 80 chars",\n` +
                `  "size": null\n` +
                `}`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "product_metadata",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  title: { type: ["string", "null"] },
                  brand: { type: ["string", "null"] },
                  price: { type: ["number", "null"] },
                  currency: { type: ["string", "null"] },
                  color: { type: ["string", "null"] },
                  category: { type: ["string", "null"] },
                  imageUrl: { type: ["string", "null"] },
                  description: { type: ["string", "null"] },
                  size: { type: ["string", "null"] },
                },
                required: [
                  "title", "brand", "price", "currency", "color",
                  "category", "imageUrl", "description", "size",
                ],
                additionalProperties: false,
              },
            },
          },
        });

        const llmContent = llmResponse.choices?.[0]?.message?.content;
        let llmParsed: Record<string, any> = {};
        if (llmContent) {
          llmParsed =
            typeof llmContent === "string" ? JSON.parse(llmContent) : llmContent;
        }

        // Merge: prefer OG values (from real page HTML) over LLM inference
        const result = {
          title: ogTitle ?? llmParsed.title ?? null,
          brand: llmParsed.brand ?? ogSiteName ?? null,
          price: ogPrice ?? (typeof llmParsed.price === "number" ? llmParsed.price : null),
          currency: ogCurrency ?? llmParsed.currency ?? "USD",
          color: llmParsed.color ?? null,
          category: llmParsed.category ?? null,
          imageUrl: ogImage ?? llmParsed.imageUrl ?? null,
          description: ogDescription ?? llmParsed.description ?? null,
          size: llmParsed.size ?? null,
        };

        return { success: true, data: result };
      } catch (err) {
        console.error("[extractFromUrl] Error:", err);
        return { success: false, data: null };
      }
    }),

  reorder: protectedProcedure
    .input(z.object({ orderedIds: z.array(z.number()) }))
    .mutation(async ({ ctx, input }) => {
      await updateItemSortOrder(ctx.user.id, input.orderedIds);
      return { success: true };
    }),
  tags: protectedProcedure.query(async ({ ctx }) => {
    return getAllUserTags(ctx.user.id);
  }),
});

// ─── Price History Router ──────────────────────────────────────────────────────

const priceHistoryRouter = router({
  list: protectedProcedure
    .input(z.object({ itemId: z.number() }))
    .query(async ({ ctx, input }) => {
      return getPriceHistory(input.itemId, ctx.user.id);
    }),

  add: protectedProcedure
    .input(
      z.object({
        itemId: z.number(),
        price: z.number(),
        currency: z.string().optional(),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await addPricePoint({
        itemId: input.itemId,
        userId: ctx.user.id,
        price: input.price,
        currency: input.currency ?? "USD",
        note: input.note,
      });
      return { success: true };
    }),
});

// ─── Outfits Router ────────────────────────────────────────────────────────────

const outfitsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const outfitList = await getOutfits(ctx.user.id);
    const withItems = await Promise.all(
      outfitList.map(async (outfit) => {
        const items = await getOutfitItems(outfit.id);
        return { ...outfit, items };
      })
    );
    return withItems;
  }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const outfit = await getOutfitById(input.id, ctx.user.id);
      if (!outfit) throw new TRPCError({ code: "NOT_FOUND" });
      const items = await getOutfitItems(outfit.id);
      return { ...outfit, items };
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        slots: z.array(
          z.object({
            slot: z.enum(["head", "top", "outerwear", "bottom", "shoes", "accessory", "bag", "jewelry", "other"]),
            itemId: z.number(),
          })
        ),
        totalPrice: z.number().optional(),
        season: z.string().optional(),
        occasion: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const id = await createOutfit(
        { userId: ctx.user.id, name: input.name, totalPrice: input.totalPrice, season: input.season, occasion: input.occasion },
        input.slots
      );
      return { id };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteOutfit(input.id, ctx.user.id);
      return { success: true };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1),
        slots: z.array(
          z.object({
            slot: z.enum(["head", "top", "outerwear", "bottom", "shoes", "accessory", "bag", "jewelry", "other"]),
            itemId: z.number(),
          })
        ),
        totalPrice: z.number().optional(),
        season: z.string().optional(),
        occasion: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await updateOutfit(input.id, ctx.user.id, input.name, input.slots, input.totalPrice, input.season, input.occasion);
      return { success: true };
    }),
  wearToday: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const outfit = await getOutfitById(input.id, ctx.user.id);
      if (!outfit) throw new TRPCError({ code: "NOT_FOUND" });
      const items = await getOutfitItems(input.id);
      await Promise.all(
        items
          .filter((oi) => oi.itemId != null)
          .map((oi) => markItemWorn(oi.itemId!, ctx.user.id))
      );
      return { count: items.length };
    }),
});

// ─── Cart Router ───────────────────────────────────────────────────────────────

const cartRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getCartItems(ctx.user.id);
  }),

  add: protectedProcedure
    .input(z.object({ itemId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await addToCart(ctx.user.id, input.itemId);
      return { success: true };
    }),

  remove: protectedProcedure
    .input(z.object({ itemId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await removeFromCart(ctx.user.id, input.itemId);
      return { success: true };
    }),

  check: protectedProcedure
    .input(z.object({ itemId: z.number() }))
    .query(async ({ ctx, input }) => {
      const inCart = await isInCart(ctx.user.id, input.itemId);
      return { inCart };
    }),
});

// ─── Designers & Shops Router ───────────────────────────────────────────────────────────────

const designersRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        type: z.string().optional(),
        favoritesOnly: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return getDesignersShops(ctx.user.id, input);
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        type: z.enum(["designer", "shop", "brand"]).default("designer"),
        url: z.string().url().optional().or(z.literal("")),
        location: z.string().optional(),
        notes: z.string().optional(),
        logoUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const id = await createDesignerShop({
        userId: ctx.user.id,
        name: input.name,
        type: input.type,
        url: input.url || null,
        location: input.location || null,
        notes: input.notes || null,
        logoUrl: input.logoUrl || null,
        isFavorite: false,
      });
      return { id };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        type: z.enum(["designer", "shop", "brand"]).optional(),
        url: z.string().optional(),
        location: z.string().optional(),
        notes: z.string().optional(),
        isFavorite: z.boolean().optional(),
        logoUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await updateDesignerShop(id, ctx.user.id, data as any);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteDesignerShop(input.id, ctx.user.id);
      return { success: true };
    }),
});

// ─── Stats Router ────────────────────────────────────────────────────────────────

const statsRouter = router({
  summary: protectedProcedure.query(async ({ ctx }) => {
    return getStats(ctx.user.id);
  }),
});

// ─── App Router ────────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  items: itemsRouter,
  priceHistory: priceHistoryRouter,
  outfits: outfitsRouter,
  cart: cartRouter,
  stats: statsRouter,
  designers: designersRouter,
});

export type AppRouter = typeof appRouter;
