import { generateOutfitCollage } from "@/lib/outfitCollage";
import { useState, useMemo } from "react";
import TravelPage from "./TravelPage";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Trash2, Layers, Share2, Eye, X, Pencil, RefreshCw, Check, Loader2, Shirt } from "lucide-react";
import ItemDetailModal from "@/components/ItemDetailModal";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { OUTFIT_SLOTS, type OutfitSlot } from "@/lib/types";

// ─── Slot Picker (for edit mode) ───────────────────────────────────────────────
function SlotPickerModal({
  slot,
  open,
  onClose,
  onSelect,
}: {
  slot: OutfitSlot | null;
  open: boolean;
  onClose: () => void;
  onSelect: (item: any) => void;
}) {
  const slotConfig = OUTFIT_SLOTS.find((s) => s.slot === slot);
  const [search, setSearch] = useState("");
  const searchInput = useMemo(
    () => ({ search, category: slotConfig?.categories[0] }),
    [search, slotConfig?.categories[0]]
  );
  const { data: items = [] } = trpc.items.list.useQuery(searchInput, { enabled: open && !!slot });
  const filtered = items.filter(
    (item: any) =>
      slotConfig?.categories.includes(item.category) &&
      (search === "" ||
        item.title?.toLowerCase().includes(search.toLowerCase()) ||
        item.brand?.toLowerCase().includes(search.toLowerCase()))
  );
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto rounded-none border-[#DEDEDE] p-0">
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-[#DEDEDE]">
          <DialogTitle className="text-[11px] tracking-[0.18em] uppercase font-medium text-black">
            Choose {slotConfig?.label}
          </DialogTitle>
        </DialogHeader>
        <div className="px-5 pt-4 pb-2">
        <Input
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-[12px] rounded-none border-[#DEDEDE] focus-visible:ring-0 focus-visible:border-black h-9"
        /></div>
        {filtered.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[12px] text-[#ACABAB] tracking-wide">
              No items found for this slot
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-px mt-4 px-5 pb-5">
            {filtered.map((item: any) => (
              <button
                key={item.id}
                onClick={() => {
                  onSelect(item);
                  onClose();
                }}
                className="group overflow-hidden border border-[#EDEDED] hover:border-black transition-all duration-150 text-left"
              >
                <div className="aspect-square bg-[#F5F5F5] overflow-hidden">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-contain p-1"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#F5F5F5] flex items-center justify-center">
                      <span className="text-xl text-[#DEDEDE]">
                        {item.title?.[0]}
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-2">
                  {item.brand && (
                    <p className="text-[9px] tracking-[0.14em] uppercase text-black font-medium">
                      {item.brand}
                    </p>
                  )}
                  <p className="text-[11px] text-[#323232] leading-snug line-clamp-2">{item.title}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Outfit Modal ─────────────────────────────────────────────────────────
function EditOutfitModal({
  outfit,
  open,
  onClose,
  onSaved,
}: {
  outfit: any;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const utils = trpc.useUtils();

  const initialSlots = useMemo(() => {
    const map: Record<string, any> = {};
    if (outfit?.items) {
      for (const si of outfit.items) {
        map[si.slot] = si.item;
      }
    }
    return map;
  }, [outfit?.id]);

  const [name, setName] = useState(outfit?.name ?? "");
  const [season, setSeason] = useState<string>(outfit?.season ?? "");
  const [occasion, setOccasion] = useState<string>(outfit?.occasion ?? "");
  const [slots, setSlots] = useState<Record<string, any>>(initialSlots);
  const [pickerSlot, setPickerSlot] = useState<OutfitSlot | null>(null);
  const SEASONS = ["SS", "AW", "Resort", "Pre-Fall"];

  const updateOutfit = trpc.outfits.update.useMutation({
    onSuccess: () => {
      toast.success("Outfit updated");
      utils.outfits.list.invalidate();
      onSaved();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSave = () => {
    const slotEntries = Object.entries(slots)
      .filter(([, item]) => item != null)
      .map(([s, item]) => ({ slot: s as OutfitSlot, itemId: (item as any).id }));
    if (!name.trim()) {
      toast.error("Please name this outfit");
      return;
    }
    if (slotEntries.length === 0) {
      toast.error("Add at least one item");
      return;
    }
    const totalPrice = slotEntries.reduce((sum, { itemId }) => {
      const item = Object.values(slots).find((i: any) => i?.id === itemId);
      return sum + ((item as any)?.currentPrice ?? (item as any)?.purchasePrice ?? 0);
    }, 0);
    updateOutfit.mutate({
      id: outfit.id,
      name: name.trim(),
      slots: slotEntries,
      totalPrice: totalPrice || undefined,
    });
  };

  if (!outfit) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif font-normal text-2xl">Edit outfit</DialogTitle>
          </DialogHeader>

          {/* Name */}
          <div className="mt-2">
            <label className="text-[10px] tracking-widest uppercase text-muted-foreground">
              Outfit name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 font-serif text-base"
              placeholder="e.g. Monday uniform"
            />
          </div>
          {/* Season chips */}
          <div className="mt-3">
            <label className="text-[10px] tracking-widest uppercase text-muted-foreground">Season</label>
            <div className="flex gap-2 flex-wrap mt-1.5">
              {SEASONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSeason(season === s ? "" : s)}
                  className={`text-[10px] tracking-[0.14em] uppercase px-3 py-1 border transition-colors ${
                    season === s
                      ? "bg-black text-white border-black"
                      : "border-[#DEDEDE] text-[#5A5A5A] hover:border-black hover:text-black"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          {/* Occasion note */}
          <div className="mt-3">
            <label className="text-[10px] tracking-widest uppercase text-muted-foreground">Occasion / weather</label>
            <Input
              value={occasion}
              onChange={(e) => setOccasion(e.target.value)}
              placeholder="e.g. rainy day, office, weekend..."
              className="mt-1 text-[12px] rounded-none border-[#DEDEDE] focus-visible:ring-0 focus-visible:border-black h-9"
            />
          </div>

          {/* Slot grid */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            {OUTFIT_SLOTS.map((slotConfig) => {
              const item = slots[slotConfig.slot];
              const isFilled = !!item;
              return (
                <div key={slotConfig.slot} className="flex flex-col gap-1.5">
                  <span className="text-[10px] tracking-widest uppercase text-muted-foreground">
                    {slotConfig.label}
                    {slotConfig.optional && (
                      <span className="ml-1 opacity-50">(opt)</span>
                    )}
                  </span>
                  <div
                    className={`relative rounded-sm overflow-hidden border transition-all duration-150 ${
                      isFilled
                        ? "border-border/60"
                        : "border-dashed border-border/40 hover:border-primary/40 cursor-pointer"
                    }`}
                    style={{ aspectRatio: "1" }}
                    onClick={!isFilled ? () => setPickerSlot(slotConfig.slot) : undefined}
                  >
                    {isFilled ? (
                      <>
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="w-full h-full object-contain p-1"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-muted to-accent/30 flex items-center justify-center">
                            <span className="font-serif text-2xl text-muted-foreground/30">
                              {item.title?.[0]}
                            </span>
                          </div>
                        )}
                        <div className="absolute top-1.5 right-1.5 flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPickerSlot(slotConfig.slot);
                            }}
                            className="bg-background/80 backdrop-blur-sm rounded-full p-1 hover:bg-background transition-colors"
                            title="Swap item"
                          >
                            <RefreshCw size={10} className="text-muted-foreground" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSlots((s) => ({ ...s, [slotConfig.slot]: null }));
                            }}
                            className="bg-background/80 backdrop-blur-sm rounded-full p-1 hover:bg-background transition-colors"
                            title="Remove from slot"
                          >
                            <X size={10} className="text-muted-foreground" />
                          </button>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/40 to-transparent p-2">
                          <p className="text-[10px] text-white/90 font-serif leading-tight line-clamp-1">
                            {item.title}
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-1.5">
                        <div className="w-6 h-6 rounded-full border border-dashed border-muted-foreground/40 flex items-center justify-center">
                          <span className="text-muted-foreground/40 text-lg leading-none">+</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground/60 tracking-wider">Add</span>
                      </div>
                    )}
                  </div>
                  {isFilled && (
                    <p className="text-[10px] text-muted-foreground line-clamp-1 font-serif">
                      {item.brand ? `${item.brand} · ` : ""}
                      {item.title}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Save / Cancel */}
          <div className="flex gap-2 mt-6 pt-4 border-t border-border/40">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="flex-1 text-xs tracking-wide"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={updateOutfit.isPending}
              className="flex-1 gap-1.5 text-xs tracking-widest uppercase"
            >
              {updateOutfit.isPending ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Check size={13} />
              )}
              Save changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <SlotPickerModal
        slot={pickerSlot}
        open={pickerSlot != null}
        onClose={() => setPickerSlot(null)}
        onSelect={(item) => {
          if (pickerSlot) setSlots((s) => ({ ...s, [pickerSlot]: item }));
        }}
      />
    </>
  );
}

// ─── Outfit Detail Modal ───────────────────────────────────────────────────────
function OutfitDetailModal({
  outfit,
  open,
  onClose,
  onItemClick,
  onDelete,
  onEdit,
}: {
  outfit: any;
  open: boolean;
  onClose: () => void;
  onItemClick: (id: number) => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  if (!outfit) return null;
  const filledSlots = OUTFIT_SLOTS.filter((s) =>
    outfit.items?.some((i: any) => i.slot === s.slot)
  );
  const handleShare = async () => {
    const text = `${outfit.name} — ${filledSlots.length} pieces${
      outfit.totalPrice ? ` · USD ${outfit.totalPrice.toLocaleString()}` : ""
    }\n${filledSlots
      .map((s) => {
        const item = outfit.items?.find((i: any) => i.slot === s.slot)?.item;
        return item
          ? `${s.label}: ${item.brand ? item.brand + " " : ""}${item.title}`
          : null;
      })
      .filter(Boolean)
      .join("\n")}`;
    const imageUrls = (outfit.items ?? [])
      .map((i: any) => i.item?.imageUrl)
      .filter(Boolean) as string[];
    const canShare = typeof navigator.share === "function";
    const canShareFiles = canShare && typeof navigator.canShare === "function" && imageUrls.length > 0;
    if (canShareFiles) {
      try {
        const blob = await generateOutfitCollage(imageUrls, outfit.name);
        if (blob) {
          const file = new File([blob], `${outfit.name}.jpg`, { type: "image/jpeg" });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ title: outfit.name, text, files: [file] });
            toast.success("Shared!");
            return;
          }
        }
      } catch { /* fall through */ }
    }
    if (canShare) {
      try {
        await navigator.share({ title: outfit.name, text });
        toast.success("Shared!");
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
      toast.success("Outfit details copied to clipboard");
    }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between pr-8">
            <div>
              <DialogTitle className="font-serif font-normal text-2xl leading-tight">
                {outfit.name}
              </DialogTitle>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-muted-foreground">
                  {outfit.items?.length ?? 0} pieces
                </span>
                {outfit.totalPrice != null && outfit.totalPrice > 0 && (
                  <span className="text-xs text-muted-foreground">
                    USD {outfit.totalPrice.toLocaleString()}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {new Date(outfit.createdAt).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 mt-4">
          {filledSlots.map((slotConfig) => {
            const item = outfit.items?.find((i: any) => i.slot === slotConfig.slot)?.item;
            if (!item) return null;
            return (
              <button
                key={slotConfig.slot}
                onClick={() => {
                  onItemClick(item.id);
                  onClose();
                }}
                className="group overflow-hidden border border-[#EDEDED] hover:border-black transition-all duration-150 text-left"
              >
                <div className="aspect-square bg-muted overflow-hidden relative">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-contain p-1"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-muted to-accent/30 flex items-center justify-center">
                      <span className="font-serif text-3xl text-muted-foreground/30">
                        {item.title?.[0]}
                      </span>
                    </div>
                  )}
                  <div className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm rounded-sm px-1.5 py-0.5">
                    <span className="text-[9px] tracking-widest uppercase text-muted-foreground">
                      {slotConfig.label}
                    </span>
                  </div>
                </div>
                <div className="p-2.5">
                  {item.brand && (
                    <p className="text-[9px] tracking-widest uppercase text-muted-foreground mb-0.5">
                      {item.brand}
                    </p>
                  )}
                  <p className="text-sm font-serif leading-tight line-clamp-2">{item.title}</p>
                  {item.currentPrice != null && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.currency ?? "USD"} {item.currentPrice.toLocaleString()}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        <div className="flex gap-2 mt-6 pt-4 border-t border-border/40">
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="flex-1 gap-1.5 text-xs tracking-wide"
          >
            <Share2 size={13} /> Share look
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onClose();
              onEdit();
            }}
            className="flex-1 gap-1.5 text-xs tracking-wide"
          >
            <Pencil size={13} /> Edit look
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onDelete();
              onClose();
            }}
            className="gap-1.5 text-xs tracking-wide text-destructive hover:text-destructive hover:border-destructive/40"
          >
            <Trash2 size={13} /> Remove
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Outfit Card ───────────────────────────────────────────────────────────────
function OutfitCard({
  outfit,
  onDelete,
  onItemClick,
  onView,
  onEdit,
  onWear,
  isWearing = false,
}: {
  outfit: any;
  onDelete: () => void;
  onItemClick: (id: number) => void;
  onView: () => void;
  onEdit: () => void;
  onWear: () => void;
  isWearing?: boolean;
}) {
  const allSlots = OUTFIT_SLOTS;
  const displayItems = outfit.items ?? [];

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const filledSlots = allSlots.filter((s) =>
      displayItems.some((i: any) => i.slot === s.slot)
    );
    const text = `${outfit.name} — ${displayItems.length} pieces${
      outfit.totalPrice ? ` · USD ${outfit.totalPrice.toLocaleString()}` : ""
    }\n${filledSlots
      .map((s) => {
        const item = displayItems.find((i: any) => i.slot === s.slot)?.item;
        return item
          ? `${s.label}: ${item.brand ? item.brand + " " : ""}${item.title}`
          : null;
      })
      .filter(Boolean)
      .join("\n")}`;
    const imageUrls = displayItems
      .map((i: any) => i.item?.imageUrl)
      .filter(Boolean) as string[];
    const canShare = typeof navigator.share === "function";
    const canShareFiles = canShare && typeof navigator.canShare === "function" && imageUrls.length > 0;
    if (canShareFiles) {
      try {
        const blob = await generateOutfitCollage(imageUrls, outfit.name);
        if (blob) {
          const file = new File([blob], `${outfit.name}.jpg`, { type: "image/jpeg" });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ title: outfit.name, text, files: [file] });
            toast.success("Shared!");
            return;
          }
        }
      } catch { /* fall through */ }
    }
    if (canShare) {
      try {
        await navigator.share({ title: outfit.name, text });
        toast.success("Shared!");
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
      toast.success("Outfit details copied to clipboard");
    }
  };

  return (
    <div
      className="border border-[#EDEDED] hover:border-black transition-all duration-200 overflow-hidden cursor-pointer group"
      onClick={onView}
    >
      {/* Thumbnail strip — 5 fixed equal boxes for core slots, always shown */}
      {(() => {
        const coreSlots = allSlots.filter((s) => !s.optional);
        return (
          <div className="flex" style={{ height: "160px" }}>
            {coreSlots.map((slotConfig, idx) => {
              const slotItem = displayItems.find((i: any) => i.slot === slotConfig.slot);
              const hasImage = slotItem?.item?.imageUrl;
              return (
                <div
                  key={slotConfig.slot}
                  className="flex-1 bg-[#F5F5F5] overflow-hidden relative"
                  style={{ borderRight: idx < coreSlots.length - 1 ? "1px solid #EDEDED" : "none" }}
                >
                  {hasImage ? (
                    <img
                      src={slotItem.item.imageUrl}
                      alt={slotItem.item.title}
                      className="w-full h-full object-cover object-center"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-[9px] text-[#DEDEDE] tracking-widest uppercase">
                        {slotConfig.label}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Info row */}
      <div className="p-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-[13px] font-medium text-black leading-tight">{outfit.name}</h3>
            {outfit.season && (
              <span className="text-[9px] tracking-[0.14em] uppercase px-2 py-0.5 border border-black text-black font-medium">
                {outfit.season}
              </span>
            )}
          </div>
          {outfit.occasion && (
            <p className="text-[11px] text-[#5A5A5A] mt-0.5 italic tracking-wide">{outfit.occasion}</p>
          )}
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[10px] text-[#ACABAB] tracking-wide">
              {displayItems.length} {displayItems.length === 1 ? "piece" : "pieces"}
            </span>
            {outfit.totalPrice != null && outfit.totalPrice > 0 && (
              <span className="text-[10px] text-[#ACABAB] tracking-wide">
                USD {outfit.totalPrice.toLocaleString()}
              </span>
            )}
            <span className="text-[10px] text-[#ACABAB] tracking-wide">
              {new Date(outfit.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onView();
            }}
            className="p-1.5 text-[#ACABAB] hover:text-black transition-colors"
            title="View outfit"
          >
            <Eye size={13} />
          </button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="text-muted-foreground hover:text-foreground h-8 w-8 p-0"
            title="Edit outfit"
          >
            <Pencil size={14} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShare}
            className="text-muted-foreground hover:text-foreground h-8 w-8 p-0"
            title="Share outfit"
          >
            <Share2 size={14} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
            title="Delete outfit"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Outfits Page ──────────────────────────────────────────────────────────────
export default function OutfitsPage() {
  const { isAuthenticated, loading } = useAuth();
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [viewItemId, setViewItemId] = useState<number | null>(null);
  const [viewOutfit, setViewOutfit] = useState<any | null>(null);
  const [editOutfit, setEditOutfit] = useState<any | null>(null);
  const [wearingId, setWearingId] = useState<number | null>(null);
  const [seasonFilter, setSeasonFilter] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"outfits" | "travel">("outfits");
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const SEASONS = ["SS", "AW", "Resort", "Pre-Fall"];

  const { data: outfits = [], isLoading } = trpc.outfits.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const deleteOutfit = trpc.outfits.delete.useMutation({
    onSuccess: () => {
      toast.success("Outfit removed");
      utils.outfits.list.invalidate();
      setDeleteId(null);
    },
    onError: (e) => toast.error(e.message),
  });
  const wearToday = trpc.outfits.wearToday.useMutation({
    onSuccess: (data) => {
      toast.success(`Wore today — ${data.count} piece${data.count === 1 ? "" : "s"} updated`);
      utils.outfits.list.invalidate();
      setWearingId(null);
    },
    onError: (e) => { toast.error(e.message); setWearingId(null); },
  });

  const filteredOutfits = seasonFilter ? outfits.filter((o: any) => o.season === seasonFilter) : outfits;
  if (loading) return null;
  if (!isAuthenticated) {
    return (
      <div className="container py-24 text-center">
        <p className="text-[13px] text-[#ACABAB] tracking-wide">Sign in to view outfits</p>
        <button
          onClick={() => (window.location.href = getLoginUrl())}
          className="mt-6 bg-black text-white text-[10px] tracking-[0.14em] uppercase px-8 py-3 hover:bg-[#323232] transition-colors"
        >
          Sign in
        </button>
      </div>
    );
  }

  return (
    <div className="container py-8">
      {/* Tab switcher */}
      <div className="flex items-end justify-between mb-0 border-b border-[#EDEDED]">
        <div className="flex gap-0">
          {(["outfits", "travel"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-4 text-[11px] tracking-[0.22em] uppercase font-medium transition-colors border-b-2 ${
                activeTab === tab
                  ? "border-black text-black"
                  : "border-transparent text-[#ACABAB] hover:text-black"
              }`}
            >
              {tab === "outfits" ? `Outfits${outfits.length > 0 ? ` (${outfits.length})` : ""}` : "Travel"}
            </button>
          ))}
        </div>
        {activeTab === "outfits" && (
          <button
            onClick={() => navigate("/canvas")}
            className="flex items-center gap-1.5 border border-black text-black text-[10px] tracking-[0.14em] uppercase px-4 py-2 hover:bg-black hover:text-white transition-colors mb-2"
          >
            <Layers size={12} /> New outfit
          </button>
        )}
      </div>
      {/* Travel tab */}
      {activeTab === "travel" && <TravelPage embedded />}
      {/* Outfits tab */}
      {activeTab === "outfits" && (<div className="pt-6">

      {/* Season filter chips */}
      {!isLoading && outfits.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-6">
          <button
            onClick={() => setSeasonFilter("")}
            className={`text-[10px] tracking-[0.14em] uppercase px-3 py-1 border transition-colors ${
              seasonFilter === ""
                ? "bg-black text-white border-black"
                : "border-[#DEDEDE] text-[#5A5A5A] hover:border-black hover:text-black"
            }`}
          >
            All
          </button>
          {SEASONS.map((s) => (
            <button
              key={s}
              onClick={() => setSeasonFilter(seasonFilter === s ? "" : s)}
              className={`text-[10px] tracking-[0.14em] uppercase px-3 py-1 border transition-colors ${
                seasonFilter === s
                  ? "bg-black text-white border-black"
                  : "border-[#DEDEDE] text-[#5A5A5A] hover:border-black hover:text-black"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 rounded-sm bg-muted animate-pulse" />
          ))}
        </div>
      ) : outfits.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-[13px] text-[#ACABAB] tracking-wide mb-2">No outfits yet</p>
          <p className="text-[11px] text-[#DEDEDE] mb-6">
            Compose your first look in Build your Look
          </p>
          <button
            onClick={() => navigate("/canvas")}
            className="text-[10px] tracking-[0.14em] uppercase px-6 py-2.5 border border-black text-black hover:bg-black hover:text-white transition-colors gap-1.5 inline-flex items-center"
          >
            <Layers size={12} /> Build your Look
          </button>
        </div>
      ) : (
        <div className="space-y-4 max-w-2xl">
          {filteredOutfits.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[12px] text-[#ACABAB] tracking-wide">No {seasonFilter} outfits yet</p>
            </div>
          ) : filteredOutfits.map((outfit: any) => (
            <OutfitCard
              key={outfit.id}
              outfit={outfit}
              onDelete={() => setDeleteId(outfit.id)}
              onItemClick={setViewItemId}
              onView={() => setViewOutfit(outfit)}
              onEdit={() => setEditOutfit(outfit)}
              onWear={() => { setWearingId(outfit.id); wearToday.mutate({ id: outfit.id }); }}
              isWearing={wearingId === outfit.id && wearToday.isPending}
            />
          ))}
        </div>
      )}

      </div>)}{/* end outfits tab */}
      {/* Outfit detail modal */}
      {viewOutfit && (
        <OutfitDetailModal
          outfit={viewOutfit}
          open={viewOutfit != null}
          onClose={() => setViewOutfit(null)}
          onItemClick={(id) => {
            setViewOutfit(null);
            setViewItemId(id);
          }}
          onDelete={() => {
            setDeleteId(viewOutfit.id);
            setViewOutfit(null);
          }}
          onEdit={() => {
            setEditOutfit(viewOutfit);
            setViewOutfit(null);
          }}
        />
      )}

      {/* Edit outfit modal */}
      {editOutfit && (
        <EditOutfitModal
          outfit={editOutfit}
          open={editOutfit != null}
          onClose={() => setEditOutfit(null)}
          onSaved={() => setEditOutfit(null)}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={deleteId != null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[13px] font-medium text-black">
              Remove this outfit?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[12px] text-[#5A5A5A]">
              The individual items will remain in your wardrobe.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-[10px] tracking-[0.14em] uppercase rounded-none border-[#DEDEDE] hover:border-black">Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteOutfit.mutate({ id: deleteId })}
              className="text-[10px] tracking-[0.14em] uppercase rounded-none bg-black hover:bg-[#323232]"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Item detail */}
      {viewItemId != null && (
        <ItemDetailModal
          itemId={viewItemId}
          open={viewItemId != null}
          onClose={() => setViewItemId(null)}
          onUpdate={() => {}}
        />
      )}
    </div>
  );
}
