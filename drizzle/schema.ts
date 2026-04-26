import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  float,
  boolean,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Wardrobe Items ────────────────────────────────────────────────────────────

export const wardrobeItems = mysqlTable("wardrobe_items", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  brand: varchar("brand", { length: 255 }),
  category: mysqlEnum("category", [
    "tops",
    "bottoms",
    "outerwear",
    "shoes",
    "accessories",
    "bags",
    "dresses",
    "suits",
    "activewear",
    "other",
  ])
    .default("other")
    .notNull(),
  color: varchar("color", { length: 100 }),
  size: varchar("size", { length: 50 }),
  purchasePrice: float("purchasePrice"),
  currentPrice: float("currentPrice"),
  currency: varchar("currency", { length: 10 }).default("USD"),
  purchaseDate: timestamp("purchaseDate"),
  imageUrl: text("imageUrl"),
  imageKey: text("imageKey"),
  buyUrl: text("buyUrl"),
  personalNote: text("personalNote"),
  isLoved: boolean("isLoved").default(false).notNull(),
  wearCount: int("wearCount").default(0).notNull(),
  lastWornAt: timestamp("lastWornAt"),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WardrobeItem = typeof wardrobeItems.$inferSelect;
export type InsertWardrobeItem = typeof wardrobeItems.$inferInsert;

// ─── Item Tags ─────────────────────────────────────────────────────────────────

export const itemTags = mysqlTable("item_tags", {
  id: int("id").autoincrement().primaryKey(),
  itemId: int("itemId").notNull(),
  userId: int("userId").notNull(),
  label: varchar("label", { length: 100 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ItemTag = typeof itemTags.$inferSelect;
export type InsertItemTag = typeof itemTags.$inferInsert;

// ─── Price History ─────────────────────────────────────────────────────────────

export const priceHistory = mysqlTable("price_history", {
  id: int("id").autoincrement().primaryKey(),
  itemId: int("itemId").notNull(),
  userId: int("userId").notNull(),
  price: float("price").notNull(),
  currency: varchar("currency", { length: 10 }).default("USD"),
  note: varchar("note", { length: 255 }),
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
});

export type PriceHistory = typeof priceHistory.$inferSelect;
export type InsertPriceHistory = typeof priceHistory.$inferInsert;

// ─── Outfits ───────────────────────────────────────────────────────────────────

export const outfits = mysqlTable("outfits", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  totalPrice: float("totalPrice"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Outfit = typeof outfits.$inferSelect;
export type InsertOutfit = typeof outfits.$inferInsert;

// ─── Outfit Items ──────────────────────────────────────────────────────────────

export const outfitItems = mysqlTable("outfit_items", {
  id: int("id").autoincrement().primaryKey(),
  outfitId: int("outfitId").notNull(),
  itemId: int("itemId").notNull(),
  slot: mysqlEnum("slot", ["head", "top", "bottom", "shoes", "accessory", "bag", "jewelry", "other"]).notNull(),
});

export type OutfitItem = typeof outfitItems.$inferSelect;
export type InsertOutfitItem = typeof outfitItems.$inferInsert;

// ─── Cart Items ────────────────────────────────────────────────────────────────

export const cartItems = mysqlTable("cart_items", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  itemId: int("itemId").notNull(),
  addedAt: timestamp("addedAt").defaultNow().notNull(),
});

export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = typeof cartItems.$inferInsert;

// ─── Designers & Shops ─────────────────────────────────────────────────────────

export const designersShops = mysqlTable("designers_shops", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["designer", "shop", "brand"]).default("designer").notNull(),
  url: text("url"),
  location: varchar("location", { length: 255 }),
  notes: text("notes"),
  isFavorite: boolean("isFavorite").default(false).notNull(),
  logoUrl: text("logoUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DesignerShop = typeof designersShops.$inferSelect;
export type InsertDesignerShop = typeof designersShops.$inferInsert;
