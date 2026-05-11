import {
  boolean,
  doublePrecision,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

// ─── Enums ─────────────────────────────────────────────────────────────────────

export const roleEnum = pgEnum("role", ["user", "admin"]);
export const categoryEnum = pgEnum("category", [
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
]);
export const slotEnum = pgEnum("slot", [
  "head",
  "top",
  "outerwear",
  "bottom",
  "shoes",
  "accessory",
  "bag",
  "jewelry",
  "other",
]);
export const designerTypeEnum = pgEnum("designer_type", [
  "designer",
  "shop",
  "brand",
]);
export const collaboratorPermissionEnum = pgEnum("collaborator_permission", [
  "view",
  "edit",
]);
export const collaboratorStatusEnum = pgEnum("collaborator_status", [
  "pending",
  "accepted",
  "revoked",
]);

const tsCol = (name: string) =>
  timestamp(name, { mode: "date", withTimezone: true });

// ─── Users ─────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: tsCol("createdAt").defaultNow().notNull(),
  updatedAt: tsCol("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignedIn: tsCol("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Wardrobe Items ────────────────────────────────────────────────────────────

export const wardrobeItems = pgTable("wardrobe_items", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  brand: varchar("brand", { length: 255 }),
  category: categoryEnum("category").default("other").notNull(),
  color: varchar("color", { length: 100 }),
  size: varchar("size", { length: 50 }),
  purchasePrice: doublePrecision("purchasePrice"),
  currentPrice: doublePrecision("currentPrice"),
  currency: varchar("currency", { length: 10 }).default("USD"),
  purchaseDate: tsCol("purchaseDate"),
  imageUrl: text("imageUrl"),
  imageKey: text("imageKey"),
  buyUrl: text("buyUrl"),
  personalNote: text("personalNote"),
  isOwned: boolean("isOwned").default(true).notNull(),
  isLoved: boolean("isLoved").default(false).notNull(),
  wearCount: integer("wearCount").default(0).notNull(),
  lastWornAt: tsCol("lastWornAt"),
  sortOrder: integer("sortOrder").default(0).notNull(),
  createdAt: tsCol("createdAt").defaultNow().notNull(),
  updatedAt: tsCol("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type WardrobeItem = typeof wardrobeItems.$inferSelect;
export type InsertWardrobeItem = typeof wardrobeItems.$inferInsert;

// ─── Item Tags ─────────────────────────────────────────────────────────────────

export const itemTags = pgTable("item_tags", {
  id: serial("id").primaryKey(),
  itemId: integer("itemId").notNull(),
  userId: integer("userId").notNull(),
  label: varchar("label", { length: 100 }).notNull(),
  createdAt: tsCol("createdAt").defaultNow().notNull(),
});

export type ItemTag = typeof itemTags.$inferSelect;
export type InsertItemTag = typeof itemTags.$inferInsert;

// ─── Price History ─────────────────────────────────────────────────────────────

export const priceHistory = pgTable("price_history", {
  id: serial("id").primaryKey(),
  itemId: integer("itemId").notNull(),
  userId: integer("userId").notNull(),
  price: doublePrecision("price").notNull(),
  currency: varchar("currency", { length: 10 }).default("USD"),
  note: varchar("note", { length: 255 }),
  recordedAt: tsCol("recordedAt").defaultNow().notNull(),
});

export type PriceHistory = typeof priceHistory.$inferSelect;
export type InsertPriceHistory = typeof priceHistory.$inferInsert;

// ─── Outfits ───────────────────────────────────────────────────────────────────

export const outfits = pgTable("outfits", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  totalPrice: doublePrecision("totalPrice"),
  season: varchar("season", { length: 50 }),
  occasion: varchar("occasion", { length: 255 }),
  notes: text("notes"),
  shareToken: varchar("shareToken", { length: 64 }),
  createdAt: tsCol("createdAt").defaultNow().notNull(),
  updatedAt: tsCol("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});
export type Outfit = typeof outfits.$inferSelect;
export type InsertOutfit = typeof outfits.$inferInsert;

// ─── Outfit Items ──────────────────────────────────────────────────────────────

export const outfitItems = pgTable("outfit_items", {
  id: serial("id").primaryKey(),
  outfitId: integer("outfitId").notNull(),
  itemId: integer("itemId").notNull(),
  slot: slotEnum("slot").notNull(),
});

export type OutfitItem = typeof outfitItems.$inferSelect;
export type InsertOutfitItem = typeof outfitItems.$inferInsert;

// ─── Cart Items ────────────────────────────────────────────────────────────────

export const cartItems = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  itemId: integer("itemId").notNull(),
  addedAt: tsCol("addedAt").defaultNow().notNull(),
});

export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = typeof cartItems.$inferInsert;

// ─── Designers & Shops ─────────────────────────────────────────────────────────

export const designersShops = pgTable("designers_shops", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: designerTypeEnum("type").default("designer").notNull(),
  url: text("url"),
  location: varchar("location", { length: 255 }),
  notes: text("notes"),
  isFavorite: boolean("isFavorite").default(false).notNull(),
  logoUrl: text("logoUrl"),
  createdAt: tsCol("createdAt").defaultNow().notNull(),
  updatedAt: tsCol("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type DesignerShop = typeof designersShops.$inferSelect;
export type InsertDesignerShop = typeof designersShops.$inferInsert;

// ─── Trips ────────────────────────────────────────────────────────────────────
export const trips = pgTable("trips", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  destination: varchar("destination", { length: 255 }).notNull(),
  startDate: tsCol("startDate").notNull(),
  endDate: tsCol("endDate").notNull(),
  notes: text("notes"),
  coverImageUrl: text("coverImageUrl"),
  shareToken: varchar("shareToken", { length: 64 }),
  createdAt: tsCol("createdAt").defaultNow().notNull(),
  updatedAt: tsCol("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});
export type Trip = typeof trips.$inferSelect;
export type InsertTrip = typeof trips.$inferInsert;

// ─── Trip Days ────────────────────────────────────────────────────────────────
export const tripDays = pgTable("trip_days", {
  id: serial("id").primaryKey(),
  tripId: integer("tripId").notNull(),
  userId: integer("userId").notNull(),
  date: tsCol("date").notNull(),
  outfitId: integer("outfitId"),
  outfitId2: integer("outfitId2"),
  outfitLabel1: varchar("outfitLabel1", { length: 100 }),
  outfitLabel2: varchar("outfitLabel2", { length: 100 }),
  weatherTemp: varchar("weatherTemp", { length: 50 }),
  weatherDesc: varchar("weatherDesc", { length: 100 }),
  weatherIcon: varchar("weatherIcon", { length: 50 }),
  notes: text("notes"),
});
export type TripDay = typeof tripDays.$inferSelect;
export type InsertTripDay = typeof tripDays.$inferInsert;

// ─── Packing Items ────────────────────────────────────────────────────────────
export const packingItems = pgTable("packing_items", {
  id: serial("id").primaryKey(),
  tripId: integer("tripId").notNull(),
  userId: integer("userId").notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  checked: boolean("checked").default(false).notNull(),
  sortOrder: integer("sortOrder").default(0).notNull(),
  createdAt: tsCol("createdAt").defaultNow().notNull(),
});
export type PackingItem = typeof packingItems.$inferSelect;
export type InsertPackingItem = typeof packingItems.$inferInsert;

// ─── Collaborators ────────────────────────────────────────────────────────────
export const collaborators = pgTable("collaborators", {
  id: serial("id").primaryKey(),
  ownerId: integer("ownerId").notNull(),
  collaboratorId: integer("collaboratorId"),
  inviteEmail: varchar("inviteEmail", { length: 320 }).notNull(),
  inviteToken: varchar("inviteToken", { length: 64 }).notNull().unique(),
  permission: collaboratorPermissionEnum("permission").default("view").notNull(),
  status: collaboratorStatusEnum("status").default("pending").notNull(),
  createdAt: tsCol("createdAt").defaultNow().notNull(),
  acceptedAt: tsCol("acceptedAt"),
});
export type Collaborator = typeof collaborators.$inferSelect;
export type InsertCollaborator = typeof collaborators.$inferInsert;
