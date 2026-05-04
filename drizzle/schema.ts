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
  isOwned: boolean("isOwned").default(true).notNull(),
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
  season: varchar("season", { length: 50 }),
  occasion: varchar("occasion", { length: 255 }),
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
  slot: mysqlEnum("slot", ["head", "top", "outerwear", "bottom", "shoes", "accessory", "bag", "jewelry", "other"]).notNull(),
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
// ─── Trips ────────────────────────────────────────────────────────────────────
export const trips = mysqlTable("trips", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  destination: varchar("destination", { length: 255 }).notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  notes: text("notes"),
  coverImageUrl: text("coverImageUrl"),
  shareToken: varchar("shareToken", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Trip = typeof trips.$inferSelect;
export type InsertTrip = typeof trips.$inferInsert;
// ─── Trip Days ────────────────────────────────────────────────────────────────
export const tripDays = mysqlTable("trip_days", {
  id: int("id").autoincrement().primaryKey(),
  tripId: int("tripId").notNull(),
  userId: int("userId").notNull(),
  date: timestamp("date").notNull(),
  outfitId: int("outfitId"),
  outfitId2: int("outfitId2"),
  weatherTemp: varchar("weatherTemp", { length: 50 }),
  weatherDesc: varchar("weatherDesc", { length: 100 }),
  weatherIcon: varchar("weatherIcon", { length: 50 }),
  notes: text("notes"),
});
export type TripDay = typeof tripDays.$inferSelect;
export type InsertTripDay = typeof tripDays.$inferInsert;
// ─── Packing Items ────────────────────────────────────────────────────────────
export const packingItems = mysqlTable("packing_items", {
  id: int("id").autoincrement().primaryKey(),
  tripId: int("tripId").notNull(),
  userId: int("userId").notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  checked: boolean("checked").default(false).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PackingItem = typeof packingItems.$inferSelect;
export type InsertPackingItem = typeof packingItems.$inferInsert;

// ─── Collaborators ────────────────────────────────────────────────────────────
export const collaborators = mysqlTable("collaborators", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),        // the wardrobe owner
  collaboratorId: int("collaboratorId"),    // null until accepted
  inviteEmail: varchar("inviteEmail", { length: 320 }).notNull(),
  inviteToken: varchar("inviteToken", { length: 64 }).notNull().unique(),
  permission: mysqlEnum("permission", ["view", "edit"]).default("view").notNull(),
  status: mysqlEnum("status", ["pending", "accepted", "revoked"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  acceptedAt: timestamp("acceptedAt"),
});
export type Collaborator = typeof collaborators.$inferSelect;
export type InsertCollaborator = typeof collaborators.$inferInsert;
