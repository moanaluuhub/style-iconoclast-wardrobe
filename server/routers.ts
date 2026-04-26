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
  deleteOutfit,
  getStats,
  getCartItems,
  addToCart,
  removeFromCart,
  isInCart,
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
  extractFromUrl: protectedProcedure
    .input(z.object({ url: z.string().url() }))
    .mutation(async ({ input }) => {
      try {
        let html = "";
        try {
          const response = await fetch(input.url, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              Accept: "text/html,application/xhtml+xml",
            },
            signal: AbortSignal.timeout(10000),
          });
          html = await response.text();
        } catch {
          html = "";
        }

        // ── Step 1: deterministic OG / meta tag extraction ──────────────────────
        const getMeta = (name: string): string | null => {
          // og:X
          const og = html.match(
            new RegExp(`<meta[^>]+property=["']og:${name}["'][^>]+content=["']([^"']+)["']`, "i")
          ) ||
          html.match(
            new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${name}["']`, "i")
          );
          if (og?.[1]) return og[1].trim();
          // name=
          const nm = html.match(
            new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, "i")
          ) ||
          html.match(
            new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, "i")
          );
          return nm?.[1]?.trim() ?? null;
        };

        const ogTitle = getMeta("title");
        const ogImage = getMeta("image");
        const ogDescription = getMeta("description") ?? getMeta("description");
        const ogSiteName = getMeta("site_name");
        // Try to find price in common meta patterns
        const priceMatch =
          html.match(/"price"\s*:\s*"([\d.,]+)"/i) ||
          html.match(/content=["']([\d.]+)["'][^>]+property=["']product:price:amount["']/i) ||
          html.match(/property=["']product:price:amount["'][^>]+content=["']([\d.]+)["']/i) ||
          html.match(/itemprop=["']price["'][^>]+content=["']([\d.]+)["']/i) ||
          html.match(/data-price=["']([\d.]+)["']/i);
        const currencyMatch =
          html.match(/"priceCurrency"\s*:\s*"([A-Z]{3})"/i) ||
          html.match(/property=["']product:price:currency["'][^>]+content=["']([A-Z]{3})["']/i) ||
          html.match(/itemprop=["']priceCurrency["'][^>]+content=["']([A-Z]{3})["']/i);
        const ogPrice = priceMatch?.[1] ? parseFloat(priceMatch[1].replace(",", "")) : null;
        const ogCurrency = currencyMatch?.[1] ?? null;

        // ── Step 2: LLM enrichment for brand, color, category ───────────────────
        // Build a compact text snippet for the LLM (title + description + first 2000 chars of visible text)
        const visibleText = html
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s{2,}/g, " ")
          .slice(0, 3000);

        const llmPromptContext = [
          ogTitle ? `Title: ${ogTitle}` : "",
          ogDescription ? `Description: ${ogDescription}` : "",
          ogSiteName ? `Site: ${ogSiteName}` : "",
          `URL: ${input.url}`,
          `Page text excerpt: ${visibleText}`,
        ]
          .filter(Boolean)
          .join("\n");

        let llmData: {
          title: string | null;
          brand: string | null;
          price: number | null;
          currency: string | null;
          color: string | null;
          category: string | null;
          imageUrl: string | null;
          description: string | null;
          size: string | null;
        } = {
          title: ogTitle,
          brand: ogSiteName,
          price: ogPrice,
          currency: ogCurrency,
          color: null,
          category: null,
          imageUrl: ogImage,
          description: ogDescription,
          size: null,
        };

        try {
          const llmResponse = await invokeLLM({
            messages: [
              {
                role: "system",
                content:
                  "You are a fashion product data extractor. Extract structured product information from the provided context. Return ONLY valid JSON, no markdown.",
              },
              {
                role: "user",
                content: `Extract product details from this fashion/clothing product page.\n\n${llmPromptContext}\n\nReturn JSON with these exact keys (use null for missing values):\n{\n  "title": "clean product name without brand prefix",\n  "brand": "brand name only",\n  "price": 0.00,\n  "currency": "USD",\n  "color": "main color name",\n  "category": "one of: tops|bottoms|outerwear|shoes|accessories|bags|dresses|suits|activewear|other",\n  "imageUrl": "best product image URL if identifiable",\n  "description": "brief product description max 100 chars",\n  "size": null\n}`,
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
                  required: ["title", "brand", "price", "currency", "color", "category", "imageUrl", "description", "size"],
                  additionalProperties: false,
                },
              },
            },
          });
          const content = llmResponse.choices?.[0]?.message?.content;
          if (content) {
            const parsed = typeof content === "string" ? JSON.parse(content) : content;
            // Merge: prefer OG values for title/image/price, use LLM for brand/color/category
            llmData = {
              title: ogTitle ?? parsed.title ?? null,
              brand: parsed.brand ?? ogSiteName ?? null,
              price: ogPrice ?? (typeof parsed.price === "number" ? parsed.price : null),
              currency: ogCurrency ?? parsed.currency ?? "USD",
              color: parsed.color ?? null,
              category: parsed.category ?? null,
              imageUrl: ogImage ?? parsed.imageUrl ?? null,
              description: ogDescription ?? parsed.description ?? null,
              size: parsed.size ?? null,
            };
          }
        } catch (llmErr) {
          console.warn("[extractFromUrl] LLM enrichment failed, using OG data only:", llmErr);
          // llmData already has OG values, continue
        }

        return { success: true, data: llmData };
      } catch (err) {
        console.error("[extractFromUrl] Error:", err);
        return { success: false, data: null };
      }
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
            slot: z.enum(["head", "top", "bottom", "shoes", "accessory"]),
            itemId: z.number(),
          })
        ),
        totalPrice: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const id = await createOutfit(
        { userId: ctx.user.id, name: input.name, totalPrice: input.totalPrice },
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

// ─── Stats Router ──────────────────────────────────────────────────────────────

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
});

export type AppRouter = typeof appRouter;
