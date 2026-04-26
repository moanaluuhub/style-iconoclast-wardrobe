import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  InsertWardrobeItem,
  InsertItemTag,
  InsertPriceHistory,
  InsertOutfit,
  InsertOutfitItem,
  itemTags,
  outfitItems,
  outfits,
  priceHistory,
  users,
  wardrobeItems,
  cartItems,
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

export async function deleteOutfit(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(outfitItems).where(eq(outfitItems.outfitId, id));
  await db
    .delete(outfits)
    .where(and(eq(outfits.id, id), eq(outfits.userId, userId)));
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
