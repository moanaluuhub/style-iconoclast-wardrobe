import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { extractFromUrl as runExtractFromUrl } from "./extractor";
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
  generateOutfitShareToken,
  getSharedOutfit,
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
  getAllUsers,
  getUserStats,
  getPlatformStats,
  setUserRole,
  getTrips,
  getTripsWithStats,
  createTrip,
  updateTrip,
  deleteTrip,
  getTripById,
  getTripDays,
  getTripDaysWithOutfits,
  upsertTripDay,
  updateTripDay,
  getPackingItems,
  addPackingItem,
  togglePackingItem,
  deletePackingItem,
  getTripByShareToken,
  generateShareToken,
  upsertBrandAsDesigner,
  inviteCollaborator,
  listCollaborators,
  revokeCollaborator,
  acceptCollaboratorInvite,
  getCollaborationsForUser,
  getOwnerWishlistItems,
  getUserById,
} from "./db";
import { ENV } from "./_core/env";
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
        isOwned: z.boolean().optional(),
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
      const insertId = result.id;
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
      // Auto-add brand to Designers index if not already present
      if (rest.brand) {
        await upsertBrandAsDesigner(ctx.user.id, rest.brand);
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
        isOwned: z.boolean().optional(),
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
      // Auto-add brand to Designers index if brand was updated
      if (rest.brand) {
        await upsertBrandAsDesigner(ctx.user.id, rest.brand);
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


  // ── URL metadata extraction ─────────────────────────────────────────────────
  // Pipeline: per-site URL parser → fetch → JSON-LD → OG → Twitter → preload.
  // The LLM is now an opt-in fallback (set EXTRACT_USE_LLM=true to enable).
  // Implementation lives in server/extractor.ts and is testable standalone via
  // scripts/test-extract.ts.
  extractFromUrl: protectedProcedure
    .input(z.object({ url: z.string().url() }))
    .mutation(async ({ input }) => {
      try {
        const { product } = await runExtractFromUrl(input.url);
        return { success: true, data: product };
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
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const id = await createOutfit(
        { userId: ctx.user.id, name: input.name, totalPrice: input.totalPrice, season: input.season, occasion: input.occasion, notes: input.notes },
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
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await updateOutfit(input.id, ctx.user.id, input.name, input.slots, input.totalPrice, input.season, input.occasion, input.notes);
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
  share: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const token = await generateOutfitShareToken(input.id, ctx.user.id);
      if (!token) throw new TRPCError({ code: "NOT_FOUND" });
      return { token };
    }),
  getShared: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const outfit = await getSharedOutfit(input.token);
      if (!outfit) throw new TRPCError({ code: "NOT_FOUND" });
      return outfit;
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

// ─── Admin Router ────────────────────────────────────────────────────────────────
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.openId !== ENV.ownerOpenId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

const adminRouter = router({
  platformStats: adminProcedure.query(async () => {
    return getPlatformStats();
  }),
  users: adminProcedure.query(async () => {
    const allUsers = await getAllUsers();
    const withStats = await Promise.all(
      allUsers.map(async (u) => {
        const stats = await getUserStats(u.id);
        return { ...u, ...stats };
      })
    );
    return withStats;
  }),
  setRole: adminProcedure
    .input(z.object({ userId: z.number(), role: z.enum(["user", "admin"]) }))
    .mutation(async ({ input }) => {
      await setUserRole(input.userId, input.role);
      return { success: true };
    }),
});

// ─── App Router ────────────────────────────────────────────────────────────────

// ─── Travel Router ───────────────────────────────────────────────────────────────────
const travelRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getTripsWithStats(ctx.user.id);
  }),
  getById: protectedProcedure
    .input(z.object({ tripId: z.number() }))
    .query(async ({ ctx, input }) => {
      return getTripById(input.tripId, ctx.user.id);
    }),
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      destination: z.string().min(1),
      startDate: z.number(),
      endDate: z.number(),
      notes: z.string().optional(),
      coverImageUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await createTrip({
        userId: ctx.user.id,
        name: input.name,
        destination: input.destination,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        notes: input.notes ?? null,
        coverImageUrl: input.coverImageUrl ?? null,
      });
      return { id };
    }),
  update: protectedProcedure
    .input(z.object({
      tripId: z.number(),
      name: z.string().min(1).optional(),
      destination: z.string().optional(),
      startDate: z.number().optional(),
      endDate: z.number().optional(),
      notes: z.string().optional(),
      coverImageUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { tripId, ...rest } = input;
      await updateTrip(tripId, ctx.user.id, {
        ...(rest.name && { name: rest.name }),
        ...(rest.destination && { destination: rest.destination }),
        ...(rest.startDate && { startDate: new Date(rest.startDate) }),
        ...(rest.endDate && { endDate: new Date(rest.endDate) }),
        ...(rest.notes !== undefined && { notes: rest.notes }),
        ...(rest.coverImageUrl !== undefined && { coverImageUrl: rest.coverImageUrl }),
      });
      return { success: true };
    }),
  delete: protectedProcedure
    .input(z.object({ tripId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteTrip(input.tripId, ctx.user.id);
      return { success: true };
    }),
  getDays: protectedProcedure
    .input(z.object({ tripId: z.number() }))
    .query(async ({ ctx, input }) => {
      return getTripDays(input.tripId, ctx.user.id);
    }),
  setDayOutfit: protectedProcedure
    .input(z.object({
      tripId: z.number(),
      date: z.number(),
      outfitId: z.number().nullable().optional(),
      outfitId2: z.number().nullable().optional(),
      outfitLabel1: z.string().max(100).optional(),
      outfitLabel2: z.string().max(100).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await upsertTripDay({
        tripId: input.tripId,
        userId: ctx.user.id,
        date: new Date(input.date),
        // undefined = leave unchanged; null = explicitly clear; number = assign
        outfitId: input.outfitId,
        outfitId2: input.outfitId2,
        outfitLabel1: input.outfitLabel1,
        outfitLabel2: input.outfitLabel2,
        notes: input.notes ?? null,
        weatherTemp: null,
        weatherDesc: null,
        weatherIcon: null,
      });
      return { id };
    }),
  updateDayWeather: protectedProcedure
    .input(z.object({
      dayId: z.number(),
      weatherTemp: z.string().optional(),
      weatherDesc: z.string().optional(),
      weatherIcon: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { dayId, ...rest } = input;
      await updateTripDay(dayId, ctx.user.id, rest);
      return { success: true };
    }),
  fetchWeatherBulk: protectedProcedure
    .input(z.object({ tripId: z.number(), destination: z.string(), startDate: z.number(), endDate: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const geoRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(input.destination)}&count=1&language=en&format=json`
        );
        const geoData = await geoRes.json() as { results?: Array<{ latitude: number; longitude: number }> };
        if (!geoData.results?.length) return { success: false };
        const { latitude, longitude } = geoData.results[0];
        const startStr = new Date(input.startDate).toISOString().split("T")[0];
        const endStr = new Date(input.endDate).toISOString().split("T")[0];
        const weatherRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto&start_date=${startStr}&end_date=${endStr}`
        );
        const weatherData = await weatherRes.json() as {
          daily?: { time: string[]; temperature_2m_max: number[]; temperature_2m_min: number[]; weathercode: number[] };
        };
        if (!weatherData.daily) return { success: false };
        const iconMap: Record<number, string> = {
          0: "sunny", 1: "mostly-sunny", 2: "partly-cloudy", 3: "cloudy",
          45: "foggy", 48: "foggy", 51: "drizzle", 53: "drizzle", 55: "drizzle",
          61: "rainy", 63: "rainy", 65: "heavy-rain", 71: "snowy", 73: "snowy",
          75: "heavy-snow", 80: "rainy", 81: "rainy", 82: "heavy-rain",
          95: "stormy", 96: "stormy", 99: "stormy",
        };
        const descMap: Record<number, string> = {
          0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
          45: "Foggy", 48: "Icy fog", 51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
          61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
          71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow",
          80: "Rain showers", 81: "Moderate showers", 82: "Violent showers",
          95: "Thunderstorm", 96: "Thunderstorm w/ hail", 99: "Heavy thunderstorm",
        };
        // Save weather for each day — preserve existing outfitId
        for (let i = 0; i < weatherData.daily.time.length; i++) {
          const dateTs = new Date(weatherData.daily.time[i] + "T00:00:00Z").getTime();
          const max = Math.round(weatherData.daily.temperature_2m_max[i]);
          const min = Math.round(weatherData.daily.temperature_2m_min[i]);
          const code = weatherData.daily.weathercode[i];
          const weatherFields = {
            weatherTemp: `${min}/${max}\u00b0C`,
            weatherDesc: descMap[code] ?? "Unknown",
            weatherIcon: iconMap[code] ?? "cloudy",
          };
          // upsertTripDay returns the id whether existing or new
          const dayId = await upsertTripDay({
            tripId: input.tripId,
            userId: ctx.user.id,
            date: new Date(dateTs),
            outfitId: null, // will be preserved by updateTripDay below for existing rows
            notes: null,
            ...weatherFields,
          });
          // Always update only weather fields to avoid overwriting outfitId
          if (typeof dayId === "number") {
            await updateTripDay(dayId, ctx.user.id, weatherFields);
          }
        }
        return { success: true, days: weatherData.daily.time.length };
      } catch {
        return { success: false };
      }
    }),
  fetchWeather: protectedProcedure
    .input(z.object({ destination: z.string(), date: z.number() }))
    .query(async ({ input }) => {
      try {
        // Use Open-Meteo geocoding + weather (free, no API key)
        const geoRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(input.destination)}&count=1&language=en&format=json`
        );
        const geoData = await geoRes.json() as { results?: Array<{ latitude: number; longitude: number; name: string; country: string }> };
        if (!geoData.results?.length) return null;
        const { latitude, longitude } = geoData.results[0];
        const dateStr = new Date(input.date).toISOString().split("T")[0];
        const weatherRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto&start_date=${dateStr}&end_date=${dateStr}`
        );
        const weatherData = await weatherRes.json() as {
          daily?: {
            temperature_2m_max: number[];
            temperature_2m_min: number[];
            weathercode: number[];
          };
        };
        if (!weatherData.daily) return null;
        const max = Math.round(weatherData.daily.temperature_2m_max[0]);
        const min = Math.round(weatherData.daily.temperature_2m_min[0]);
        const code = weatherData.daily.weathercode[0];
        const iconMap: Record<number, string> = {
          0: "sunny", 1: "mostly-sunny", 2: "partly-cloudy", 3: "cloudy",
          45: "foggy", 48: "foggy", 51: "drizzle", 53: "drizzle", 55: "drizzle",
          61: "rainy", 63: "rainy", 65: "heavy-rain", 71: "snowy", 73: "snowy",
          75: "heavy-snow", 80: "rainy", 81: "rainy", 82: "heavy-rain",
          95: "stormy", 96: "stormy", 99: "stormy",
        };
        const descMap: Record<number, string> = {
          0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
          45: "Foggy", 48: "Icy fog", 51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
          61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
          71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow",
          80: "Rain showers", 81: "Moderate showers", 82: "Violent showers",
          95: "Thunderstorm", 96: "Thunderstorm w/ hail", 99: "Heavy thunderstorm",
        };
        return {
          temp: `${min}/${max}°C`,
          desc: descMap[code] ?? "Unknown",
          icon: iconMap[code] ?? "cloudy",
        };
      } catch {
        return null;
      }
    }),
  getPackingItems: protectedProcedure
    .input(z.object({ tripId: z.number() }))
    .query(async ({ ctx, input }) => {
      return getPackingItems(input.tripId, ctx.user.id);
    }),
  addPackingItem: protectedProcedure
    .input(z.object({ tripId: z.number(), label: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const id = await addPackingItem({
        tripId: input.tripId,
        userId: ctx.user.id,
        label: input.label,
        checked: false,
        sortOrder: 0,
      });
      return { id };
    }),
  togglePackingItem: protectedProcedure
    .input(z.object({ itemId: z.number(), checked: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await togglePackingItem(input.itemId, ctx.user.id, input.checked);
      return { success: true };
    }),
  deletePackingItem: protectedProcedure
    .input(z.object({ itemId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deletePackingItem(input.itemId, ctx.user.id);
      return { success: true };
    }),
  generateShareLink: protectedProcedure
    .input(z.object({ tripId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const token = await generateShareToken(input.tripId, ctx.user.id);
      if (!token) throw new TRPCError({ code: "NOT_FOUND" });
      return { token };
    }),
  getShared: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const trip = await getTripByShareToken(input.token);
      if (!trip) throw new TRPCError({ code: "NOT_FOUND" });
      return trip;
    }),
  getSharedDays: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const trip = await getTripByShareToken(input.token);
      if (!trip) throw new TRPCError({ code: "NOT_FOUND" });
      return getTripDaysWithOutfits(trip.id, trip.userId);
    }),
});
// ─── Collaborators Router ────────────────────────────────────────────────────
const collaboratorsRouter = router({
  invite: protectedProcedure
    .input(z.object({ email: z.string().email(), permission: z.enum(["view", "edit"]), origin: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const token = await inviteCollaborator(ctx.user.id, input.email, input.permission);
      const base = input.origin ?? "";
      return { token, inviteUrl: `${base}/collab/accept?token=${token}` };
    }),
  list: protectedProcedure.query(async ({ ctx }) => {
    return listCollaborators(ctx.user.id);
  }),
  revoke: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await revokeCollaborator(input.id, ctx.user.id);
      return { success: true };
    }),
  accept: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invite = await acceptCollaboratorInvite(input.token, ctx.user.id);
      if (!invite) throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found or already used" });
      return { ownerId: invite.ownerId, permission: invite.permission };
    }),
  myAccess: protectedProcedure.query(async ({ ctx }) => {
    return getCollaborationsForUser(ctx.user.id);
  }),
  addWishlistItem: protectedProcedure
    .input(z.object({
      ownerId: z.number(),
      title: z.string().min(1),
      brand: z.string().optional(),
      category: z.enum(["tops", "bottoms", "outerwear", "shoes", "accessories", "bags", "dresses", "suits", "activewear", "other"]),
      color: z.string().optional(),
      size: z.string().optional(),
      purchasePrice: z.number().optional(),
      currency: z.string().optional(),
      imageUrl: z.string().optional(),
      buyUrl: z.string().optional(),
      personalNote: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify the requesting user has edit access
      const accesses = await getCollaborationsForUser(ctx.user.id);
      const access = accesses.find((a) => a.ownerId === input.ownerId);
      if (!access) throw new TRPCError({ code: "FORBIDDEN", message: "No access to this wardrobe" });
      if (access.permission !== "edit") throw new TRPCError({ code: "FORBIDDEN", message: "You have view-only access" });
      const { ownerId, ...rest } = input;
      const data = {
        ...rest,
        userId: ownerId,
        isOwned: false, // always wishlist
        currentPrice: rest.purchasePrice,
      };
      const result = await createItem(data);
      const insertId = result.id;
      if (rest.brand) {
        await upsertBrandAsDesigner(ownerId, rest.brand);
      }
      return { id: insertId };
    }),
  ownerWishlist: protectedProcedure
    .input(z.object({ ownerId: z.number() }))
    .query(async ({ ctx, input }) => {
      // Verify the requesting user has access
      const accesses = await getCollaborationsForUser(ctx.user.id);
      const hasAccess = accesses.some((a) => a.ownerId === input.ownerId);
      if (!hasAccess) throw new TRPCError({ code: "FORBIDDEN" });
      const items = await getOwnerWishlistItems(input.ownerId);
      const owner = await getUserById(input.ownerId);
      return { ownerName: owner?.name ?? "Someone", items };
    }),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    // No-op: Supabase auth state lives in the browser (localStorage); the
    // client calls supabase.auth.signOut() in useAuth.ts. This endpoint is
    // kept so existing client code (`trpc.auth.logout.useMutation`) doesn't
    // need to change.
    logout: publicProcedure.mutation(() => {
      return { success: true } as const;
    }),
  }),
  items: itemsRouter,
  priceHistory: priceHistoryRouter,
  outfits: outfitsRouter,
  cart: cartRouter,
  stats: statsRouter,
  designers: designersRouter,
  admin: adminRouter,
  travel: travelRouter,
  collaborators: collaboratorsRouter,
});

export type AppRouter = typeof appRouter;
