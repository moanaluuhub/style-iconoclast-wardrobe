import { useState, useEffect, useMemo, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Search, Heart, TrendingUp, TrendingDown, Minus,
  SlidersHorizontal, X, Share2, ShoppingBag, ShoppingCart, GripVertical, Pencil,
} from "lucide-react";
import AddEditItemModal from "@/components/AddEditItemModal";
import ItemDetailModal from "@/components/ItemDetailModal";
import CartPanel from "@/components/CartPanel";
import { CATEGORIES, COLORS } from "@/lib/types";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function TrendBadge({ item }: { item: any }) {
  const history = item.priceHistory ?? [];
  if (history.length < 2) return null;
  const first = history[0].price;
  const last = history[history.length - 1].price;
  const pct = ((last - first) / first) * 100;
  if (Math.abs(pct) < 0.5) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-sm bg-stone-100 text-stone-500">
        <Minus size={9} /> 0%
      </span>
    );
  }
  if (pct > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-sm bg-red-50 text-red-600">
        <TrendingUp size={9} /> +{pct.toFixed(0)}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-sm bg-emerald-50 text-emerald-700">
      <TrendingDown size={9} /> {pct.toFixed(0)}%
    </span>
  );
}

function SortableItemCard({
  item,
  onClick,
  onCartToggle,
  inCart,
  onLoveToggle,
  onEdit,
  dragMode,
}: {
  item: any;
  onClick: () => void;
  onCartToggle: (e: React.MouseEvent) => void;
  inCart: boolean;
  onLoveToggle: (e: React.MouseEvent) => void;
  onEdit: (e: React.MouseEvent) => void;
  dragMode: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style} className="relative">
      {dragMode && (
        <div
          {...attributes}
          {...listeners}
          className="absolute top-2 left-2 z-20 bg-background/80 backdrop-blur-sm rounded-full p-1.5 cursor-grab active:cursor-grabbing shadow-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={13} className="text-muted-foreground" />
        </div>
      )}
      <ItemCard
        item={item}
        onClick={dragMode ? () => {} : onClick}
        onCartToggle={onCartToggle}
        inCart={inCart}
        onLoveToggle={onLoveToggle}
        onEdit={onEdit}
      />
    </div>
  );
}

function ItemCard({
  item,
  onClick,
  onCartToggle,
  inCart,
  onLoveToggle,
  onEdit,
}: {
  item: any;
  onClick: () => void;
  onCartToggle: (e: React.MouseEvent) => void;
  inCart: boolean;
  onLoveToggle: (e: React.MouseEvent) => void;
  onEdit: (e: React.MouseEvent) => void;
}) {
  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `${item.brand ? item.brand + " — " : ""}${item.title}${item.currentPrice ? " · " + (item.currency ?? "USD") + " " + item.currentPrice.toLocaleString() : ""}`;
    if (item.buyUrl) {
      if (navigator.share) {
        navigator.share({ title: item.title, text, url: item.buyUrl }).catch(() => {});
      } else {
        navigator.clipboard.writeText(item.buyUrl);
        toast.success("Link copied to clipboard");
      }
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Details copied to clipboard");
    }
  };

  return (
    <div className="masonry-item group cursor-pointer rounded-sm overflow-hidden border border-border/40 bg-card hover:border-border hover:shadow-sm transition-all duration-200">
      {/* Image */}
      <div className="relative bg-muted overflow-hidden" onClick={onClick}>
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.title}
            className="w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            style={{ aspectRatio: "4/5" }}
            loading="lazy"
          />
        ) : (
          <div
            className="w-full bg-gradient-to-br from-muted to-accent/30 flex items-center justify-center"
            style={{ aspectRatio: "4/5" }}
          >
            <span className="font-serif text-4xl text-muted-foreground/30">
              {item.title?.[0] ?? "?"}
            </span>
          </div>
        )}

          {/* Hover action bar */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-2.5 py-2 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {/* Like toggle */}
          <button
            onClick={onLoveToggle}
            className={`backdrop-blur-sm hover:bg-white/40 transition-colors rounded-full p-1.5 ${item.isLoved ? "bg-white/40" : "bg-white/20"}`}
            title={item.isLoved ? "Remove from loved" : "Love this piece"}
          >
            <Heart
              size={13}
              fill={item.isLoved ? "currentColor" : "none"}
              className={item.isLoved ? "text-rose-400" : "text-white"}
            />
          </button>
          {/* Share + Cart */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={onEdit}
              className="bg-white/20 backdrop-blur-sm hover:bg-white/40 transition-colors rounded-full p-1.5"
              title="Edit piece"
            >
              <Pencil size={11} className="text-white" />
            </button>
            <button
              onClick={handleShare}
              className="bg-white/20 backdrop-blur-sm hover:bg-white/40 transition-colors rounded-full p-1.5"
              title="Share"
            >
              <Share2 size={11} className="text-white" />
            </button>
            <button
              onClick={onCartToggle}
              className={`backdrop-blur-sm hover:bg-white/40 transition-colors rounded-full p-1.5 ${
                inCart ? "bg-white/60" : "bg-white/20"
              }`}
              title={inCart ? "Remove from wishlist" : "Add to wishlist"}
            >
              <ShoppingBag
                size={11}
                className={inCart ? "text-foreground" : "text-white"}
                fill={inCart ? "currentColor" : "none"}
              />
            </button>
          </div>
        </div>

          {/* Loved indicator (always visible when not hovering) */}
          {item.isLoved && (
            <div className="absolute top-2 right-2 group-hover:opacity-0 transition-opacity pointer-events-none">
              <Heart size={14} fill="currentColor" className="text-rose-400" />
            </div>
          )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-1" onClick={onClick}>
        {item.brand && (
          <p className="text-[10px] tracking-widest uppercase text-muted-foreground font-medium">
            {item.brand}
          </p>
        )}
        <p className="font-serif text-sm leading-snug text-foreground line-clamp-2">
          {item.title}
        </p>
        <div className="flex items-center justify-between pt-0.5">
          {item.currentPrice != null ? (
            <span className="text-xs text-muted-foreground">
              {item.currency ?? "USD"} {item.currentPrice.toLocaleString()}
            </span>
          ) : (
            <span />
          )}
          <TrendBadge item={item} />
        </div>
        {item.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {item.tags.slice(0, 3).map((tag: string) => (
              <span
                key={tag}
                className="text-[9px] tracking-wider uppercase px-1.5 py-0.5 bg-muted rounded-sm text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function WardrobePage() {
  const { isAuthenticated, loading } = useAuth();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [color, setColor] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [showFilters, setShowFilters] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [dragMode, setDragMode] = useState(false);
  const [localOrder, setLocalOrder] = useState<any[]>([]);

  const utils = trpc.useUtils();

  const listInput = useMemo(
    () => ({
      search: search || undefined,
      category: category !== "all" ? category : undefined,
      color: color !== "all" ? color : undefined,
      sortBy,
    }),
    [search, category, color, sortBy]
  );
  const { data: items = [], isLoading, refetch } = trpc.items.list.useQuery(listInput, {
    enabled: isAuthenticated,
  });

  const { data: cartEntries = [] } = trpc.cart.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const addToCart = trpc.cart.add.useMutation({
    onSuccess: () => {
      utils.cart.list.invalidate();
      toast.success("Added to wishlist");
    },
    onError: () => toast.error("Failed to add"),
  });

  const removeFromCart = trpc.cart.remove.useMutation({
    onSuccess: () => {
      utils.cart.list.invalidate();
      toast.success("Removed from wishlist");
    },
    onError: () => toast.error("Failed to remove"),
  });

  const cartItemIds = new Set((cartEntries as any[]).map((c) => c.itemId));
  const cartCount = cartEntries.length;

  const handleCartToggle = (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    if (cartItemIds.has(item.id)) {
      removeFromCart.mutate({ itemId: item.id });
    } else {
      addToCart.mutate({ itemId: item.id });
    }
  };

  const toggleLove = trpc.items.update.useMutation({
    onMutate: async ({ id, isLoved }) => {
      await utils.items.list.cancel();
      const prev = utils.items.list.getData(listInput);
      utils.items.list.setData(
        listInput,
        (old) => (old ?? []).map((i: any) => (i.id === id ? { ...i, isLoved } : i))
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        utils.items.list.setData(listInput, ctx.prev);
      }
    },
    onSettled: () => utils.items.list.invalidate(),
  });

  const handleLoveToggle = (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    toggleLove.mutate({ id: item.id, isLoved: !item.isLoved });
  };

  // Sync local order only when item ids change (not on every render)
  const itemIdsKey = items.map((i: any) => i.id).join(",");
  useEffect(() => {
    setLocalOrder(items as any[]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemIdsKey]);

  const reorder = trpc.items.reorder.useMutation({
    onError: () => toast.error("Failed to save order"),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = localOrder.findIndex((i) => i.id === active.id);
    const newIndex = localOrder.findIndex((i) => i.id === over.id);
    const newOrder = arrayMove(localOrder, oldIndex, newIndex);
    setLocalOrder(newOrder);
    reorder.mutate({ orderedIds: newOrder.map((i) => i.id) });
  };

  if (loading) {
    return (
      <div className="container py-16 text-center">
        <p className="text-muted-foreground text-sm animate-pulse">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container py-24 text-center max-w-sm mx-auto">
        <h1 className="font-serif text-5xl mb-3">The Wardrobe</h1>
        <p className="text-muted-foreground text-sm italic font-serif mb-8">
          Your private fashion archive
        </p>
        <div className="w-12 h-px bg-border mx-auto mb-8" />
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          Catalogue what you own, track value over time, and compose outfits with intention.
        </p>
        <Button
          onClick={() => (window.location.href = getLoginUrl())}
          className="w-full tracking-widest text-xs uppercase"
        >
          Enter
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-serif text-4xl text-foreground">Wardrobe</h1>
          <p className="text-xs text-muted-foreground mt-1 tracking-wide">
            {items.length} {items.length === 1 ? "piece" : "pieces"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Cart / Wishlist button */}
          <button
            onClick={() => setCartOpen(true)}
            className="relative flex items-center gap-1.5 text-xs tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-sm border border-border/40 hover:border-border"
          >
            <ShoppingCart size={13} />
            <span>Wishlist</span>
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-medium">
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            )}
          </button>
          <Button
            onClick={() => setAddOpen(true)}
            size="sm"
            className="gap-1.5 text-xs tracking-widest uppercase"
          >
            <Plus size={13} />
            Add piece
          </Button>
        </div>
      </div>

      {/* Search & Sort bar */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by title, brand, or note..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-sm"
          />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-40 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent" className="text-sm">Recent</SelectItem>
            <SelectItem value="price_high" className="text-sm">Price: High</SelectItem>
            <SelectItem value="price_low" className="text-sm">Price: Low</SelectItem>
            <SelectItem value="brand_az" className="text-sm">Brand A–Z</SelectItem>
            <SelectItem value="loved" className="text-sm">Loved first</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className={`gap-1.5 text-xs ${showFilters ? "bg-primary text-primary-foreground" : ""}`}
        >
          <SlidersHorizontal size={13} />
          Filter
        </Button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 mb-6 p-4 bg-muted/40 rounded-sm border border-border/40">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground tracking-wider uppercase">Category</span>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-36 text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value} className="text-xs">
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground tracking-wider uppercase">Color</span>
            <Select value={color} onValueChange={setColor}>
              <SelectTrigger className="w-32 text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All colors</SelectItem>
                {COLORS.map((c) => (
                  <SelectItem key={c} value={c} className="text-xs capitalize">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(category !== "all" || color !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setCategory("all"); setColor("all"); }}
              className="h-8 text-xs gap-1 text-muted-foreground"
            >
              <X size={11} /> Clear filters
            </Button>
          )}
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="masonry-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="masonry-item rounded-sm bg-muted animate-pulse"
              style={{ height: `${200 + (i % 3) * 60}px` }}
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-24">
          <p className="font-serif text-3xl text-muted-foreground/60 mb-3">Empty wardrobe</p>
          <p className="text-sm text-muted-foreground mb-6 italic font-serif">
            Begin by adding your first piece
          </p>
          <Button
            onClick={() => setAddOpen(true)}
            variant="outline"
            className="text-xs tracking-widest uppercase gap-1.5"
          >
            <Plus size={13} />
            Add first piece
          </Button>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={localOrder.map((i) => i.id)} strategy={rectSortingStrategy}>
            <div className="masonry-grid">
              {localOrder.map((item: any) => (
                <SortableItemCard
                  key={item.id}
                  item={item}
                  onClick={() => setSelectedItemId(item.id)}
                  onCartToggle={(e) => handleCartToggle(e, item)}
                  inCart={cartItemIds.has(item.id)}
                  onLoveToggle={(e) => handleLoveToggle(e, item)}
                  onEdit={(e) => { e.stopPropagation(); setEditItem(item); }}
                  dragMode={dragMode}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Drag mode toggle */}
      {isAuthenticated && !isLoading && items.length > 0 && (
        <div className="mt-4 flex justify-end">
          <Button
            variant={dragMode ? "default" : "outline"}
            size="sm"
            onClick={() => setDragMode((d) => !d)}
            className="text-xs gap-1.5 tracking-wide"
          >
            <GripVertical size={13} />
            {dragMode ? "Done organising" : "Organise"}
          </Button>
        </div>
      )}

      {/* Modals */}
      <AddEditItemModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => refetch()}
      />
      {editItem && (
        <AddEditItemModal
          open={!!editItem}
          onClose={() => setEditItem(null)}
          onSuccess={() => { refetch(); setEditItem(null); }}
          editItem={editItem}
        />
      )}
      {selectedItemId != null && (
        <ItemDetailModal
          itemId={selectedItemId}
          open={selectedItemId != null}
          onClose={() => setSelectedItemId(null)}
          onUpdate={() => refetch()}
        />
      )}

      {/* Cart / Wishlist panel */}
      <CartPanel open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
