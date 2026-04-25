import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
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
      // attach tags to each item
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
      return { ...item, tags: tags.map((t) => t.label), priceHistory: history };
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
      // log initial price point
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
        {
          userId: ctx.user.id,
          name: input.name,
          totalPrice: input.totalPrice,
        },
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
  stats: statsRouter,
});

export type AppRouter = typeof appRouter;
