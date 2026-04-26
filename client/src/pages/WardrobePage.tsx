import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Search, Heart, TrendingUp, TrendingDown, Minus,
  SlidersHorizontal, X, Share2, ShoppingBag, GripVertical, Pencil,
} from "lucide-react";
import AddEditItemModal from "@/components/AddEditItemModal";
import ItemDetailModal from "@/components/ItemDetailModal";
import CartPanel from "@/components/CartPanel";
import { CATEGORIES, COLORS } from "@/lib/types";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, rectSortingStrategy,
  useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ─── Trend Badge ───────────────────────────────────────────────────────────────
function TrendBadge({ item }: { item: any }) {
  const history = item.priceHistory ?? [];
  if (history.length < 2) return null;
  const first = history[0].price;
  const last = history[history.length - 1].price;
  const pct = ((last - first) / first) * 100;
  if (Math.abs(pct) < 0.5) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 bg-[#F5F5F5] text-[#5A5A5A] tracking-wider">
        <Minus size={8} /> 0%
      </span>
    );
  }
  if (pct > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 bg-[#F5F5F5] text-black tracking-wider">
        <TrendingUp size={8} /> +{pct.toFixed(0)}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 bg-[#F5F5F5] text-[#5A5A5A] tracking-wider">
      <TrendingDown size={8} /> {pct.toFixed(0)}%
    </span>
  );
}

// ─── Item Card ─────────────────────────────────────────────────────────────────
function ItemCard({
  item, onClick, onCartToggle, inCart, onLoveToggle, onEdit,
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
        toast.success("Link copied");
      }
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Details copied");
    }
  };

  return (
    <div className="masonry-item group cursor-pointer bg-white border border-[#EDEDED] hover:border-[#ACABAB] transition-colors duration-200">
      {/* Image */}
      <div className="relative bg-[#F5F5F5] overflow-hidden" onClick={onClick}>
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.title}
            className="w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            style={{ aspectRatio: "4/5" }}
            loading="lazy"
          />
        ) : (
          <div
            className="w-full bg-[#F5F5F5] flex items-center justify-center"
            style={{ aspectRatio: "4/5" }}
          >
            <span className="text-4xl font-light text-[#ACABAB]">
              {item.title?.[0] ?? "?"}
            </span>
          </div>
        )}

        {/* Hover overlay — action icons */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-2.5 py-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={onLoveToggle}
            className="bg-white/90 hover:bg-white transition-colors p-1.5"
            title={item.isLoved ? "Remove from loved" : "Love this piece"}
          >
            <Heart
              size={13}
              fill={item.isLoved ? "#000" : "none"}
              className="text-black"
            />
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={onEdit}
              className="bg-white/90 hover:bg-white transition-colors p-1.5"
              title="Edit piece"
            >
              <Pencil size={11} className="text-black" />
            </button>
            <button
              onClick={handleShare}
              className="bg-white/90 hover:bg-white transition-colors p-1.5"
              title="Share"
            >
              <Share2 size={11} className="text-black" />
            </button>
            <button
              onClick={onCartToggle}
              className={`transition-colors p-1.5 ${inCart ? "bg-black" : "bg-white/90 hover:bg-white"}`}
              title={inCart ? "Remove from wishlist" : "Add to wishlist"}
            >
              <ShoppingBag size={11} className={inCart ? "text-white" : "text-black"} />
            </button>
          </div>
        </div>

        {/* Loved indicator */}
        {item.isLoved && (
          <div className="absolute top-2 right-2 group-hover:opacity-0 transition-opacity pointer-events-none">
            <Heart size={13} fill="#000" className="text-black" />
          </div>
        )}
      </div>

      {/* Info — NAP style */}
      <div className="px-3 pt-2.5 pb-3" onClick={onClick}>
        {item.brand && (
          <p className="text-[10px] tracking-[0.14em] uppercase text-black font-medium mb-0.5">
            {item.brand}
          </p>
        )}
        <p className="text-[13px] text-[#323232] leading-snug line-clamp-2 font-light">
          {item.title}
        </p>
        <div className="flex items-center justify-between mt-1.5">
          {item.currentPrice != null ? (
            <span className="text-[12px] text-black font-medium">
              {item.currency ?? "USD"} {item.currentPrice.toLocaleString()}
            </span>
          ) : item.purchasePrice != null ? (
            <span className="text-[12px] text-[#5A5A5A]">
              {item.currency ?? "USD"} {item.purchasePrice.toLocaleString()}
            </span>
          ) : (
            <span />
          )}
          <TrendBadge item={item} />
        </div>
        {item.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {item.tags.slice(0, 2).map((tag: string) => (
              <span
                key={tag}
                className="text-[9px] tracking-[0.12em] uppercase px-1.5 py-0.5 border border-[#DEDEDE] text-[#5A5A5A]"
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

// ─── Sortable wrapper ──────────────────────────────────────────────────────────
function SortableItemCard({
  item, onClick, onCartToggle, inCart, onLoveToggle, onEdit, dragMode,
}: {
  item: any;
  onClick: () => void;
  onCartToggle: (e: React.MouseEvent) => void;
  inCart: boolean;
  onLoveToggle: (e: React.MouseEvent) => void;
  onEdit: (e: React.MouseEvent) => void;
  dragMode: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 50 : undefined };
  return (
    <div ref={setNodeRef} style={style} className="relative">
      {dragMode && (
        <div
          {...attributes}
          {...listeners}
          className="absolute top-2 left-2 z-20 bg-white/90 p-1.5 cursor-grab active:cursor-grabbing shadow-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={13} className="text-[#5A5A5A]" />
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

// ─── Wardrobe Page ─────────────────────────────────────────────────────────────
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
    () => ({ search: search || undefined, category: category !== "all" ? category : undefined, color: color !== "all" ? color : undefined, sortBy }),
    [search, category, color, sortBy]
  );

  const { data: items = [], isLoading, refetch } = trpc.items.list.useQuery(listInput, { enabled: isAuthenticated });
  const { data: cartEntries = [] } = trpc.cart.list.useQuery(undefined, { enabled: isAuthenticated });

  const addToCart = trpc.cart.add.useMutation({ onSuccess: () => { utils.cart.list.invalidate(); toast.success("Added to wishlist"); }, onError: () => toast.error("Failed to add") });
  const removeFromCart = trpc.cart.remove.useMutation({ onSuccess: () => { utils.cart.list.invalidate(); toast.success("Removed from wishlist"); }, onError: () => toast.error("Failed to remove") });
  const cartItemIds = new Set((cartEntries as any[]).map((c) => c.itemId));
  const cartCount = (cartEntries as any[]).length;

  const handleCartToggle = (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    if (cartItemIds.has(item.id)) removeFromCart.mutate({ itemId: item.id });
    else addToCart.mutate({ itemId: item.id });
  };

  const toggleLove = trpc.items.update.useMutation({
    onMutate: async ({ id, isLoved }) => {
      await utils.items.list.cancel();
      const prev = utils.items.list.getData(listInput);
      utils.items.list.setData(listInput, (old) => (old ?? []).map((i: any) => (i.id === id ? { ...i, isLoved } : i)));
      return { prev };
    },
    onError: (_err, _vars, ctx) => { if (ctx?.prev) utils.items.list.setData(listInput, ctx.prev); },
    onSettled: () => utils.items.list.invalidate(),
  });

  const handleLoveToggle = (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    toggleLove.mutate({ id: item.id, isLoved: !item.isLoved });
  };

  const itemIdsKey = items.map((i: any) => i.id).join(",");
  useEffect(() => { setLocalOrder(items as any[]); }, [itemIdsKey]);

  const reorder = trpc.items.reorder.useMutation({ onError: () => toast.error("Failed to save order") });
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

  if (loading) return <div className="container py-16 text-center"><p className="text-[#ACABAB] text-xs tracking-widest uppercase animate-pulse">Loading</p></div>;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6">
        <div className="text-center max-w-xs">
          <h1 className="text-[22px] font-light tracking-[0.28em] uppercase text-black mb-2">
            Style Iconoclast
          </h1>
          <div className="w-8 h-px bg-black mx-auto my-6" />
          <p className="text-[12px] tracking-[0.06em] text-[#5A5A5A] mb-8 leading-relaxed">
            Your private fashion archive. Catalogue what you own, track value over time, and compose outfits with intention.
          </p>
          <button
            onClick={() => (window.location.href = getLoginUrl())}
            className="w-full bg-black text-white text-[11px] tracking-[0.18em] uppercase font-medium py-3.5 hover:bg-[#323232] transition-colors"
          >
            Enter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8 pb-5 border-b border-[#DEDEDE]">
        <div>
          <h1 className="text-[13px] tracking-[0.18em] uppercase font-medium text-black">Wardrobe</h1>
          <p className="text-[11px] text-[#ACABAB] mt-1 tracking-wider">
            {items.length} {items.length === 1 ? "piece" : "pieces"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCartOpen(true)}
            className="relative flex items-center gap-2 text-[10px] tracking-[0.14em] uppercase text-[#5A5A5A] hover:text-black transition-colors border border-[#DEDEDE] hover:border-black px-3 py-2"
          >
            <ShoppingBag size={13} />
            Wishlist
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-black text-white text-[9px] w-4 h-4 flex items-center justify-center font-medium">
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 bg-black text-white text-[10px] tracking-[0.14em] uppercase font-medium px-4 py-2 hover:bg-[#323232] transition-colors"
          >
            <Plus size={12} />
            Add piece
          </button>
        </div>
      </div>

      {/* Search & Sort */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#ACABAB]" />
          <Input
            placeholder="Search by title, brand, or note..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-[12px] border-[#DEDEDE] rounded-none h-9 focus-visible:ring-0 focus-visible:border-black"
          />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-36 text-[11px] tracking-wider border-[#DEDEDE] rounded-none h-9 focus:ring-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-none border-[#DEDEDE]">
            <SelectItem value="recent" className="text-[11px] tracking-wider">Recent</SelectItem>
            <SelectItem value="price_high" className="text-[11px] tracking-wider">Price: High</SelectItem>
            <SelectItem value="price_low" className="text-[11px] tracking-wider">Price: Low</SelectItem>
            <SelectItem value="brand_az" className="text-[11px] tracking-wider">Brand A–Z</SelectItem>
            <SelectItem value="loved" className="text-[11px] tracking-wider">Loved first</SelectItem>
          </SelectContent>
        </Select>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 text-[10px] tracking-[0.14em] uppercase px-3 py-2 border transition-colors ${
            showFilters ? "bg-black text-white border-black" : "border-[#DEDEDE] text-[#5A5A5A] hover:border-black hover:text-black"
          }`}
        >
          <SlidersHorizontal size={12} />
          Filter
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="flex flex-wrap gap-4 mb-6 p-4 bg-[#F5F5F5] border border-[#DEDEDE]">
          <div className="flex items-center gap-2">
            <span className="text-[10px] tracking-[0.14em] uppercase text-[#5A5A5A]">Category</span>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-36 text-[11px] border-[#DEDEDE] rounded-none h-8 focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-none border-[#DEDEDE]">
                <SelectItem value="all" className="text-[11px]">All categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value} className="text-[11px]">{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] tracking-[0.14em] uppercase text-[#5A5A5A]">Color</span>
            <Select value={color} onValueChange={setColor}>
              <SelectTrigger className="w-32 text-[11px] border-[#DEDEDE] rounded-none h-8 focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-none border-[#DEDEDE]">
                <SelectItem value="all" className="text-[11px]">All colors</SelectItem>
                {COLORS.map((c) => (
                  <SelectItem key={c} value={c} className="text-[11px] capitalize">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(category !== "all" || color !== "all") && (
            <button
              onClick={() => { setCategory("all"); setColor("all"); }}
              className="flex items-center gap-1 text-[10px] tracking-wider uppercase text-[#5A5A5A] hover:text-black transition-colors"
            >
              <X size={11} /> Clear
            </button>
          )}
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="masonry-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="masonry-item bg-[#F5F5F5] animate-pulse" style={{ height: `${220 + (i % 3) * 60}px` }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-[13px] tracking-[0.18em] uppercase text-[#ACABAB] mb-3">Empty wardrobe</p>
          <p className="text-[11px] text-[#ACABAB] mb-8 tracking-wider">Begin by adding your first piece</p>
          <button
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-2 border border-black text-[10px] tracking-[0.14em] uppercase px-5 py-2.5 hover:bg-black hover:text-white transition-colors"
          >
            <Plus size={12} /> Add first piece
          </button>
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
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => setDragMode((d) => !d)}
            className={`flex items-center gap-1.5 text-[10px] tracking-[0.14em] uppercase px-3 py-2 border transition-colors ${
              dragMode ? "bg-black text-white border-black" : "border-[#DEDEDE] text-[#5A5A5A] hover:border-black hover:text-black"
            }`}
          >
            <GripVertical size={12} />
            {dragMode ? "Done" : "Organise"}
          </button>
        </div>
      )}

      {/* Modals */}
      <AddEditItemModal open={addOpen} onClose={() => setAddOpen(false)} onSuccess={() => refetch()} />
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
      <CartPanel open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
