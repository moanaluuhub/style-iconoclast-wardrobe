# The Wardrobe — Project TODO

## Phase 1: Schema & Design System
- [x] Database schema: wardrobe_items table
- [x] Database schema: price_history table
- [x] Database schema: outfits table
- [x] Database schema: outfit_items table
- [x] Database schema: item_tags table
- [x] Run db:push migration
- [x] Design system: Cormorant Garamond + DM Sans fonts
- [x] Design system: cream/ivory palette CSS variables
- [x] Design system: grain texture overlay
- [x] Design system: refined micro-animations

## Phase 2: Server / tRPC Routers
- [x] items.list — list all items for logged-in user (with filters)
- [x] items.get — get single item by id
- [x] items.create — create new wardrobe item
- [x] items.update — update item metadata
- [x] items.delete — delete item
- [x] items.markWorn — increment wear count + log date
- [x] items.uploadImage — upload item image to S3
- [x] priceHistory.list — get price history for an item
- [x] priceHistory.add — log a new price point
- [x] outfits.list — list all saved outfits
- [x] outfits.get — get outfit with items
- [x] outfits.create — save a new outfit
- [x] outfits.delete — delete an outfit
- [x] stats.summary — total value, cost-per-wear, category breakdown

## Phase 3: Wardrobe View & Add/Edit Modal
- [x] Masonry grid layout (2 col mobile, 3 tablet, 4 desktop)
- [x] Item card (image, brand, title, price, love icon, trend badge)
- [x] Search bar (title, brand, note)
- [x] Filter panel (category, brand, color, tags — multi-select chips)
- [x] Sort options (recent, price high/low, brand A-Z)
- [x] Add/Edit modal — Step 1: URL paste + metadata pull
- [x] Add/Edit modal — Step 2: full form with all fields
- [x] Image upload in step 2
- [x] Tag chip multi-select in form
- [x] Love/favorite toggle

## Phase 4: Item Detail Modal
- [x] Large product image (4:5 aspect)
- [x] Brand, title, price, trend indicator
- [x] Price history sparkline (SVG, color-coded)
- [x] Personal note (italic serif)
- [x] Tag pills display
- [x] Action buttons: Edit, Delete, Mark as Worn, Log Price
- [x] Price logging modal/inline form
- [x] Wear count display

## Phase 5: Outfit Canvas & Saved Outfits
- [x] Outfit canvas: 5 slots (head, top, bottom, shoes, accessory)
- [x] Slot picker modal (shows items by category)
- [x] Drag-and-drop slot filling
- [x] Swap and clear per slot
- [x] Outfit name input + save button + total price
- [x] Saved outfits list view
- [x] Outfit card (5-across thumbnails, name, piece count, total)
- [x] Delete outfit
- [x] Tap item in outfit → item detail modal

## Phase 6: Statistics Dashboard
- [x] Total wardrobe value
- [x] Cost-per-wear tracker (purchase price / wear count)
- [x] Category breakdown chart (recharts pie/bar)
- [x] Items count by category
- [x] Most worn items list
- [x] Newest additions list

## Phase 7: Design System & Navigation
- [x] App shell with top navigation (Wardrobe, Canvas, Outfits, Stats)
- [x] Manus OAuth login/logout flow
- [x] Protected routes (redirect to login if not authenticated)
- [x] Grain texture overlay on background
- [x] Responsive layout
- [x] Loading skeletons
- [x] Empty states with editorial copy
- [x] Toast notifications (sonner)

## Phase 8: Tests & Delivery
- [x] Vitest: items CRUD procedures
- [x] Vitest: outfits procedures
- [x] Vitest: stats summary
- [x] Final checkpoint

## Enhancement Round 2
- [x] LLM URL metadata extraction: scrape title, brand, price, image, color, description from pasted URL
- [x] Like icon on item cards (toggle loved state)
- [x] Share icon on item cards (copy link / Web Share API)
- [x] Add-to-cart button on item cards and detail modal
- [x] Cart DB table (cart_items: userId, itemId, addedAt)
- [x] cart.list, cart.add, cart.remove tRPC procedures
- [x] Cart panel / drawer UI with item list and total pricing
- [x] Cart icon in nav with item count badge
- [x] Remove from cart in panel
- [x] Robust OG/meta tag extraction as primary parser, LLM as enrichment fallback
- [x] Like toggle interaction on item cards (optimistic update)

## Enhancement Round 3
- [x] Wardrobe: drag-to-reorder grid (dnd-kit sortable, persist sortOrder to DB)
- [x] Canvas: add/remove optional slots (bag, jewelry, other) dynamically
- [x] Canvas: expanded slot categories beyond original 5
- [x] Outfits: share look button (Web Share API / copy link)
- [x] Outfits: click outfit card to open detail view modal
- [x] Outfit detail modal: full-size item thumbnails, names, prices
- [x] Designers & Shops page: new nav item after Outfits
- [x] Designers & Shops: DB table (designers_shops: userId, name, type, url, notes, isFavorite)
- [x] Designers & Shops: tRPC router (list, add, update, delete, toggleFavorite)
- [x] Designers & Shops: filter by type (designer/shop), favorites toggle
- [x] Designers & Shops: search by name

## Enhancement Round 4
- [x] Wardrobe: edit button on item cards (pencil icon in hover overlay, opens AddEditItemModal pre-filled)
- [x] Canvas: replace colored slot icons with neutral stone/muted icons
- [x] Outfits: edit mode on saved outfits (swap/clear individual slots, rename, save)

## Enhancement Round 5 — Net-a-Porter Redesign
- [x] Global CSS: pure black/white/grey palette, Inter font, remove grain texture, remove cream/ivory
- [x] AppShell: black top bar, white caps nav links, clean search icon, black wishlist/cart badge
- [x] WardrobePage: NAP-style product cards (white bg, black text, minimal border, brand in caps above title)
- [x] Add/Edit modal: clean black/white form, black CTA buttons
- [x] Item Detail modal: NAP product page style (large image left, details right)
- [x] Canvas page: black/white slot UI, clean typography
- [x] Outfits page: clean black/white list, editorial spacing
- [x] Stats page: clean charts, black/white/grey data viz
- [x] Designers page: clean index style
- [x] LoginPage: NAP-style centered login

## Enhancement Round 6
- [x] Wardrobe: tag filter chips row below search bar (all tags from user's items, one-click filter)
- [x] Outfits: "Wore this today" button — increments wornCount on every item in the outfit
- [x] Rename Statistics → My Archive (nav label, page heading, AppShell)
