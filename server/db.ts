import { and, asc, desc, eq, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  InsertWardrobeItem,
  InsertItemTag,
  InsertPriceHistory,
  InsertOutfit,
  InsertOutfitItem,
  InsertDesignerShop,
  InsertTrip,
  InsertTripDay,
  InsertPackingItem,
  itemTags,
  outfitItems,
  outfits,
  priceHistory,
  users,
  wardrobeItems,
  cartItems,
  designersShops,
  trips,
  tripDays,
  packingItems,
  collaborators,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ─────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;

  for (const field of textFields) {
    const value = user[field];
    if (value !== undefined) {
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    }
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}
// ─── Wardrobe Items ────────────────────────────────────────────────────────────

export async function getItems(
  userId: number,
  opts: {
    search?: string;
    category?: string;
    color?: string;
    brand?: string;
    sortBy?: string;
  } = {}
) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(wardrobeItems.userId, userId)];

  if (opts.search) {
    const term = `%${opts.search}%`;
    conditions.push(
      or(
        like(wardrobeItems.title, term),
        like(wardrobeItems.brand, term),
        like(wardrobeItems.personalNote, term)
      )!
    );
  }
  if (opts.category) {
    conditions.push(eq(wardrobeItems.category, opts.category as any));
  }
  if (opts.color) {
    conditions.push(like(wardrobeItems.color, `%${opts.color}%`));
  }
  if (opts.brand) {
    conditions.push(like(wardrobeItems.brand, `%${opts.brand}%`));
  }

  let orderBy;
  switch (opts.sortBy) {
    case "price_high":
      orderBy = desc(wardrobeItems.currentPrice);
      break;
    case "price_low":
      orderBy = wardrobeItems.currentPrice;
      break;
    case "brand_az":
      orderBy = wardrobeItems.brand;
      break;
    case "loved":
      orderBy = desc(wardrobeItems.isLoved);
      break;
    default:
      orderBy = desc(wardrobeItems.createdAt);
  }

  return db
    .select()
    .from(wardrobeItems)
    .where(and(...conditions))
    .orderBy(orderBy);
}

export async function getItemById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(wardrobeItems)
    .where(and(eq(wardrobeItems.id, id), eq(wardrobeItems.userId, userId)))
    .limit(1);
  return result[0];
}

export async function createItem(data: InsertWardrobeItem) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(wardrobeItems).values(data);
  return result[0];
}

export async function updateItem(
  id: number,
  userId: number,
  data: Partial<InsertWardrobeItem>
) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db
    .update(wardrobeItems)
    .set(data)
    .where(and(eq(wardrobeItems.id, id), eq(wardrobeItems.userId, userId)));
}

export async function deleteItem(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  // cascade delete tags, price history, outfit items
  await db.delete(itemTags).where(and(eq(itemTags.itemId, id), eq(itemTags.userId, userId)));
  await db
    .delete(priceHistory)
    .where(and(eq(priceHistory.itemId, id), eq(priceHistory.userId, userId)));
  await db.delete(outfitItems).where(eq(outfitItems.itemId, id));
  await db
    .delete(wardrobeItems)
    .where(and(eq(wardrobeItems.id, id), eq(wardrobeItems.userId, userId)));
}

export async function markItemWorn(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db
    .update(wardrobeItems)
    .set({
      wearCount: sql`${wardrobeItems.wearCount} + 1`,
      lastWornAt: new Date(),
    })
    .where(and(eq(wardrobeItems.id, id), eq(wardrobeItems.userId, userId)));
}

// ─── Item Tags ─────────────────────────────────────────────────────────────────

export async function getTagsForItem(itemId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(itemTags).where(eq(itemTags.itemId, itemId));
}

export async function setTagsForItem(itemId: number, userId: number, labels: string[]) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(itemTags).where(and(eq(itemTags.itemId, itemId), eq(itemTags.userId, userId)));
  if (labels.length > 0) {
    await db.insert(itemTags).values(
      labels.map((label) => ({ itemId, userId, label }))
    );
  }
}


// ─── All User Tags ─────────────────────────────────────────────────────────────
export async function getAllUserTags(userId: number): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .selectDistinct({ label: itemTags.label })
    .from(itemTags)
    .where(eq(itemTags.userId, userId))
    .orderBy(itemTags.label);
  return rows.map((r) => r.label);
}
// ─── Price History ─────────────────────────────────────────────────────────────

export async function getPriceHistory(itemId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(priceHistory)
    .where(and(eq(priceHistory.itemId, itemId), eq(priceHistory.userId, userId)))
    .orderBy(priceHistory.recordedAt);
}

export async function addPricePoint(data: InsertPriceHistory) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(priceHistory).values(data);
  // update currentPrice on the item
  await db
    .update(wardrobeItems)
    .set({ currentPrice: data.price })
    .where(and(eq(wardrobeItems.id, data.itemId), eq(wardrobeItems.userId, data.userId)));
}

// ─── Outfits ───────────────────────────────────────────────────────────────────

export async function getOutfits(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(outfits)
    .where(eq(outfits.userId, userId))
    .orderBy(desc(outfits.createdAt));
}

export async function getOutfitById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(outfits)
    .where(and(eq(outfits.id, id), eq(outfits.userId, userId)))
    .limit(1);
  return result[0];
}

export async function getOutfitItems(outfitId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: outfitItems.id,
      outfitId: outfitItems.outfitId,
      itemId: outfitItems.itemId,
      slot: outfitItems.slot,
      item: wardrobeItems,
    })
    .from(outfitItems)
    .leftJoin(wardrobeItems, eq(outfitItems.itemId, wardrobeItems.id))
    .where(eq(outfitItems.outfitId, outfitId));
}

export async function createOutfit(
  data: InsertOutfit,
  slots: { slot: string; itemId: number }[]
) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(outfits).values(data);
  const insertId = (result[0] as any).insertId as number;
  if (slots.length > 0) {
    await db.insert(outfitItems).values(
      slots.map((s) => ({
        outfitId: insertId,
        itemId: s.itemId,
        slot: s.slot as any,
      }))
    );
  }
  return insertId;
}

export async function updateOutfit(
  id: number,
  userId: number,
  name: string,
  slots: { slot: string; itemId: number }[],
  totalPrice?: number,
  season?: string,
  occasion?: string,
  notes?: string
) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  // Verify ownership
  const existing = await db.select().from(outfits).where(and(eq(outfits.id, id), eq(outfits.userId, userId))).limit(1);
  if (!existing.length) throw new Error("Outfit not found");
  // Update name/price/season/occasion/notes
  await db.update(outfits).set({ name, totalPrice: totalPrice ?? null, season: season ?? null, occasion: occasion ?? null, notes: notes ?? null }).where(eq(outfits.id, id));
  // Replace all outfit items
  await db.delete(outfitItems).where(eq(outfitItems.outfitId, id));
  if (slots.length > 0) {
    await db.insert(outfitItems).values(
      slots.map((s) => ({
        outfitId: id,
        itemId: s.itemId,
        slot: s.slot as any,
      }))
    );
  }
}
export async function deleteOutfit(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(outfitItems).where(eq(outfitItems.outfitId, id));
  await db
    .delete(outfits)
    .where(and(eq(outfits.id, id), eq(outfits.userId, userId)));
}

/// ─── Outfit Sharing ──────────────────────────────────────────────────────────
export async function generateOutfitShareToken(outfitId: number, userId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const token = crypto.randomUUID().replace(/-/g, "");
  await db
    .update(outfits)
    .set({ shareToken: token })
    .where(and(eq(outfits.id, outfitId), eq(outfits.userId, userId)));
  return token;
}
export async function getSharedOutfit(token: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(outfits)
    .where(eq(outfits.shareToken, token))
    .limit(1);
  if (!rows.length) return null;
  const outfit = rows[0];
  const items = await db
    .select({
      id: outfitItems.id,
      slot: outfitItems.slot,
      item: wardrobeItems,
    })
    .from(outfitItems)
    .leftJoin(wardrobeItems, eq(outfitItems.itemId, wardrobeItems.id))
    .where(eq(outfitItems.outfitId, outfit.id));
  return { ...outfit, items };
}
// ─── Cart ─────────────────────────────────────────────────────────────────────
export async function getCartItems(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: cartItems.id,
      userId: cartItems.userId,
      itemId: cartItems.itemId,
      addedAt: cartItems.addedAt,
      item: wardrobeItems,
    })
    .from(cartItems)
    .leftJoin(wardrobeItems, eq(cartItems.itemId, wardrobeItems.id))
    .where(eq(cartItems.userId, userId))
    .orderBy(desc(cartItems.addedAt));
}

export async function addToCart(userId: number, itemId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  // avoid duplicates
  const existing = await db
    .select()
    .from(cartItems)
    .where(and(eq(cartItems.userId, userId), eq(cartItems.itemId, itemId)))
    .limit(1);
  if (existing.length > 0) return;
  await db.insert(cartItems).values({ userId, itemId });
}

export async function removeFromCart(userId: number, itemId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db
    .delete(cartItems)
    .where(and(eq(cartItems.userId, userId), eq(cartItems.itemId, itemId)));
}

export async function isInCart(userId: number, itemId: number) {
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .select()
    .from(cartItems)
    .where(and(eq(cartItems.userId, userId), eq(cartItems.itemId, itemId)))
    .limit(1);
  return result.length > 0;
}

// ─── Sort Order ───────────────────────────────────────────────────────────────

export async function updateItemSortOrder(userId: number, orderedIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  // Update each item's sortOrder in a loop
  await Promise.all(
    orderedIds.map((id, index) =>
      db
        .update(wardrobeItems)
        .set({ sortOrder: index })
        .where(and(eq(wardrobeItems.id, id), eq(wardrobeItems.userId, userId)))
    )
  );
}

// ─── Designers & Shops ─────────────────────────────────────────────────────────

export async function getDesignersShops(
  userId: number,
  opts: { search?: string; type?: string; favoritesOnly?: boolean } = {}
) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(designersShops.userId, userId)];
  if (opts.search) {
    conditions.push(like(designersShops.name, `%${opts.search}%`));
  }
  if (opts.type) {
    conditions.push(eq(designersShops.type, opts.type as any));
  }
  if (opts.favoritesOnly) {
    conditions.push(eq(designersShops.isFavorite, true));
  }
  return db
    .select()
    .from(designersShops)
    .where(and(...conditions))
    .orderBy(desc(designersShops.isFavorite), asc(designersShops.name));
}

export async function createDesignerShop(data: InsertDesignerShop) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(designersShops).values(data);
  return (result[0] as any).insertId as number;
}

export async function updateDesignerShop(
  id: number,
  userId: number,
  data: Partial<InsertDesignerShop>
) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db
    .update(designersShops)
    .set(data)
    .where(and(eq(designersShops.id, id), eq(designersShops.userId, userId)));
}

export async function deleteDesignerShop(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db
    .delete(designersShops)
    .where(and(eq(designersShops.id, id), eq(designersShops.userId, userId)));
}

// ─── Statistics ────────────────────────────────────────────────────────────────

export async function getStats(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const items = await db
    .select()
    .from(wardrobeItems)
    .where(eq(wardrobeItems.userId, userId));

  const totalItems = items.length;
  const totalValue = items.reduce((sum, i) => sum + (i.currentPrice ?? i.purchasePrice ?? 0), 0);
  const totalPurchaseValue = items.reduce((sum, i) => sum + (i.purchasePrice ?? 0), 0);

  // Cost per wear: sum(purchasePrice / max(wearCount,1))
  const costPerWear = items.reduce((sum, i) => {
    const price = i.purchasePrice ?? 0;
    const wears = i.wearCount > 0 ? i.wearCount : 1;
    return sum + price / wears;
  }, 0) / Math.max(totalItems, 1);

  // Category breakdown
  const categoryMap: Record<string, { count: number; value: number }> = {};
  for (const item of items) {
    const cat = item.category;
    if (!categoryMap[cat]) categoryMap[cat] = { count: 0, value: 0 };
    categoryMap[cat].count++;
    categoryMap[cat].value += item.currentPrice ?? item.purchasePrice ?? 0;
  }
  const categoryBreakdown = Object.entries(categoryMap).map(([name, data]) => ({
    name,
    count: data.count,
    value: Math.round(data.value * 100) / 100,
  }));

  // Most worn
  const mostWorn = [...items]
    .filter((i) => i.wearCount > 0)
    .sort((a, b) => b.wearCount - a.wearCount)
    .slice(0, 5)
    .map((i) => ({ id: i.id, title: i.title, brand: i.brand, wearCount: i.wearCount, imageUrl: i.imageUrl }));

  // Newest
  const newest = [...items]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 5)
    .map((i) => ({ id: i.id, title: i.title, brand: i.brand, imageUrl: i.imageUrl, createdAt: i.createdAt }));

  return {
    totalItems,
    totalValue: Math.round(totalValue * 100) / 100,
    totalPurchaseValue: Math.round(totalPurchaseValue * 100) / 100,
    costPerWear: Math.round(costPerWear * 100) / 100,
    categoryBreakdown,
    mostWorn,
    newest,
  };
}

// ─── Admin Helpers ─────────────────────────────────────────────────────────────
export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function getUserStats(userId: number) {
  const db = await getDb();
  if (!db) return { itemCount: 0, outfitCount: 0, wishlistCount: 0, totalValue: 0 };
  const items = await db.select().from(wardrobeItems).where(eq(wardrobeItems.userId, userId));
  const outfitRows = await db.select().from(outfits).where(eq(outfits.userId, userId));
  const cartRows = await db.select().from(cartItems).where(eq(cartItems.userId, userId));
  const totalValue = items.reduce((sum, i) => sum + (i.currentPrice ?? i.purchasePrice ?? 0), 0);
  return {
    itemCount: items.length,
    outfitCount: outfitRows.length,
    wishlistCount: cartRows.length,
    totalValue: Math.round(totalValue * 100) / 100,
  };
}

export async function getPlatformStats() {
  const db = await getDb();
  if (!db) return { totalUsers: 0, totalItems: 0, totalOutfits: 0, totalWishlist: 0 };
  const [userRows, itemRows, outfitRows, cartRows] = await Promise.all([
    db.select({ id: users.id }).from(users),
    db.select({ id: wardrobeItems.id }).from(wardrobeItems),
    db.select({ id: outfits.id }).from(outfits),
    db.select({ id: cartItems.id }).from(cartItems),
  ]);
  return {
    totalUsers: userRows.length,
    totalItems: itemRows.length,
    totalOutfits: outfitRows.length,
    totalWishlist: cartRows.length,
  };
}

export async function setUserRole(userId: number, role: "user" | "admin") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

// ─── Trips ────────────────────────────────────────────────────────────────────
export async function getTrips(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(trips).where(eq(trips.userId, userId)).orderBy(desc(trips.startDate));
}
export async function getTripsWithStats(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const allTrips = await db.select().from(trips).where(eq(trips.userId, userId)).orderBy(desc(trips.startDate));
  const allDays = await db.select().from(tripDays).where(eq(tripDays.userId, userId));
  return allTrips.map(t => {
    const tDays = allDays.filter(d => d.tripId === t.id);
    const totalDays = Math.round((t.endDate.getTime() - t.startDate.getTime()) / 86400000) + 1;
    const outfitCount = tDays.filter(d => d.outfitId !== null).length;
    return { ...t, totalDays, outfitCount };
  });
}

export async function getTripByShareToken(shareToken: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(trips).where(eq(trips.shareToken, shareToken)).limit(1);
  return rows[0] ?? null;
}
export async function generateShareToken(tripId: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  await db.update(trips).set({ shareToken: token }).where(and(eq(trips.id, tripId), eq(trips.userId, userId)));
  return token;
}
export async function createTrip(data: InsertTrip) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(trips).values(data);
  return result.insertId as number;
}
export async function updateTrip(tripId: number, userId: number, data: Partial<InsertTrip>) {
  const db = await getDb();
  if (!db) return;
  await db.update(trips).set(data).where(and(eq(trips.id, tripId), eq(trips.userId, userId)));
}
export async function deleteTrip(tripId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(packingItems).where(and(eq(packingItems.tripId, tripId), eq(packingItems.userId, userId)));
  await db.delete(tripDays).where(and(eq(tripDays.tripId, tripId), eq(tripDays.userId, userId)));
  await db.delete(trips).where(and(eq(trips.id, tripId), eq(trips.userId, userId)));
}
export async function getTripById(tripId: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(trips).where(and(eq(trips.id, tripId), eq(trips.userId, userId))).limit(1);
  return rows[0] ?? null;
}
// ─── Trip Days ────────────────────────────────────────────────────────────────
export async function getTripDays(tripId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tripDays).where(and(eq(tripDays.tripId, tripId), eq(tripDays.userId, userId))).orderBy(asc(tripDays.date));
}
export async function upsertTripDay(data: InsertTripDay) {
  const db = await getDb();
  if (!db) return;
  // Check if a day record already exists
  const existingRows = await db
    .select()
    .from(tripDays)
    .where(and(eq(tripDays.tripId, data.tripId), eq(tripDays.userId, data.userId), eq(tripDays.date, data.date)))
    .limit(1);
  if (existingRows.length > 0) {
    const existing = existingRows[0];
    // Merge logic:
    // - undefined means "leave unchanged" (preserve existing value)
    // - null means "explicitly clear" (set to null)
    // - a number means "set to this outfit"
    const merged: Partial<InsertTripDay> = {
      outfitId: data.outfitId !== undefined ? data.outfitId : existing.outfitId,
      outfitId2: data.outfitId2 !== undefined ? data.outfitId2 : existing.outfitId2,
      outfitLabel1: data.outfitLabel1 !== undefined ? data.outfitLabel1 : existing.outfitLabel1,
      outfitLabel2: data.outfitLabel2 !== undefined ? data.outfitLabel2 : existing.outfitLabel2,
      notes: data.notes !== null ? data.notes : existing.notes,
      weatherTemp: data.weatherTemp !== null ? data.weatherTemp : existing.weatherTemp,
      weatherDesc: data.weatherDesc !== null ? data.weatherDesc : existing.weatherDesc,
      weatherIcon: data.weatherIcon !== null ? data.weatherIcon : existing.weatherIcon,
    };
    await db.update(tripDays).set(merged).where(eq(tripDays.id, existing.id));
    return existing.id;
  } else {
    const [result] = await db.insert(tripDays).values(data);
    return result.insertId as number;
  }
}
export async function updateTripDay(dayId: number, userId: number, data: Partial<InsertTripDay>) {
  const db = await getDb();
  if (!db) return;
  await db.update(tripDays).set(data).where(and(eq(tripDays.id, dayId), eq(tripDays.userId, userId)));
}
// ─── Packing Items ────────────────────────────────────────────────────────────
export async function getPackingItems(tripId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(packingItems).where(and(eq(packingItems.tripId, tripId), eq(packingItems.userId, userId))).orderBy(asc(packingItems.sortOrder), asc(packingItems.createdAt));
}
export async function addPackingItem(data: InsertPackingItem) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(packingItems).values(data);
  return result.insertId as number;
}
export async function togglePackingItem(itemId: number, userId: number, checked: boolean) {
  const db = await getDb();
  if (!db) return;
  await db.update(packingItems).set({ checked }).where(and(eq(packingItems.id, itemId), eq(packingItems.userId, userId)));
}
export async function deletePackingItem(itemId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(packingItems).where(and(eq(packingItems.id, itemId), eq(packingItems.userId, userId)));
}

// ─── Auto-upsert brand into designers_shops ────────────────────────────────────
export async function upsertBrandAsDesigner(userId: number, brandName: string) {
  const db = await getDb();
  if (!db || !brandName.trim()) return;
  const name = brandName.trim();
  // Check if a designer/shop/brand with this name already exists for the user
  const existing = await db
    .select({ id: designersShops.id })
    .from(designersShops)
    .where(and(eq(designersShops.userId, userId), like(designersShops.name, name)))
    .limit(1);
  if (existing.length === 0) {
    await db.insert(designersShops).values({
      userId,
      name,
      type: "brand",
    });
  }
}

// ─── Collaborators ─────────────────────────────────────────────────────────────

import { randomBytes } from "crypto";

export async function inviteCollaborator(
  ownerId: number,
  email: string,
  permission: "view" | "edit"
) {
  const db = await getDb();
  if (!db) return "";
  const token = randomBytes(32).toString("hex");
  await db.insert(collaborators).values({
    ownerId,
    inviteEmail: email,
    inviteToken: token,
    permission,
    status: "pending",
  });
  return token;
}

export async function listCollaborators(ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(collaborators)
    .where(eq(collaborators.ownerId, ownerId));
}

export async function revokeCollaborator(id: number, ownerId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(collaborators)
    .set({ status: "revoked" })
    .where(and(eq(collaborators.id, id), eq(collaborators.ownerId, ownerId)));
}

export async function acceptCollaboratorInvite(token: string, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(collaborators)
    .where(
      and(
        eq(collaborators.inviteToken, token),
        eq(collaborators.status, "pending")
      )
    );
  if (!rows.length) return null;
  const invite = rows[0];
  await db
    .update(collaborators)
    .set({ status: "accepted", collaboratorId: userId, acceptedAt: new Date() })
    .where(eq(collaborators.id, invite.id));
  return invite;
}

export async function getCollaborationsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(collaborators)
    .where(
      and(
        eq(collaborators.collaboratorId, userId),
        eq(collaborators.status, "accepted")
      )
    );
}

export async function getOwnerWishlistItems(ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(wardrobeItems)
    .where(
      and(
        eq(wardrobeItems.userId, ownerId),
        eq(wardrobeItems.isOwned, false)
      )
    );
}

// ─── Trip Days with Outfit Details (for shared trip view) ─────────────────────
export async function fetchOutfitDetails(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, outfitId: number | null) {
  if (!outfitId) return { outfitName: null, outfitImages: [] };
  const [outfitRow] = await db
    .select({ id: outfits.id, name: outfits.name })
    .from(outfits)
    .where(eq(outfits.id, outfitId))
    .limit(1);
  const items = outfitRow
    ? await db
        .select({ imageUrl: wardrobeItems.imageUrl, slot: outfitItems.slot })
        .from(outfitItems)
        .leftJoin(wardrobeItems, eq(outfitItems.itemId, wardrobeItems.id))
        .where(eq(outfitItems.outfitId, outfitRow.id))
    : [];
  const outfitImages = items.map((i) => i.imageUrl).filter((url): url is string => !!url);
  return { outfitName: outfitRow?.name ?? null, outfitImages };
}
export async function getTripDaysWithOutfits(tripId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];
  const days = await db
    .select()
    .from(tripDays)
    .where(and(eq(tripDays.tripId, tripId), eq(tripDays.userId, userId)))
    .orderBy(asc(tripDays.date));
  const enriched = await Promise.all(
    days.map(async (day) => {
      const [outfit1, outfit2] = await Promise.all([
        fetchOutfitDetails(db, day.outfitId ?? null),
        fetchOutfitDetails(db, day.outfitId2 ?? null),
      ]);
      return {
        ...day,
        outfitName: outfit1.outfitName,
        outfitImages: outfit1.outfitImages,
        outfitName2: outfit2.outfitName,
        outfitImages2: outfit2.outfitImages,
      };
    })
  );
  return enriched;
}
