import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { OUTFIT_SLOTS, type OutfitSlot } from "@/lib/types";
import { X, RefreshCw, Loader2, Save, HardHat, Shirt, Scissors, Footprints, Watch, Briefcase, Gem, PlusCircle, type LucideIcon } from "lucide-react";

// Map icon name strings to neutral lucide components
const SLOT_ICONS: Record<string, LucideIcon> = {
  hat: HardHat,
  shirt: Shirt,
  scissors: Scissors,
  footprints: Footprints,
  watch: Watch,
  briefcase: Briefcase,
  gem: Gem,
  "plus-circle": PlusCircle,
};
function SlotIcon({ name, size = 14 }: { name: string; size?: number }) {
  const Icon = SLOT_ICONS[name] ?? PlusCircle;
  return <Icon size={size} className="text-muted-foreground/60" />;
}
import { getLoginUrl } from "@/const";
import ItemDetailModal from "@/components/ItemDetailModal";

// ─── Slot Picker Modal ─────────────────────────────────────────────────────────

function SlotPickerModal({
  slot,
  open,
  onClose,
  onSelect,
}: {
  slot: OutfitSlot;
  open: boolean;
  onClose: () => void;
  onSelect: (item: any) => void;
}) {
  const slotConfig = OUTFIT_SLOTS.find((s) => s.slot === slot);
  const { data: items = [] } = trpc.items.list.useQuery(
    { category: slotConfig?.categories[0] },
    { enabled: open }
  );

  // Show all items that match any of the slot's categories
  const { data: allItems = [] } = trpc.items.list.useQuery({}, { enabled: open });
  const filtered = allItems.filter((item: any) =>
    slotConfig?.categories.includes(item.category)
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif font-normal text-xl">
            Choose {slotConfig?.label}
          </DialogTitle>
        </DialogHeader>
        {filtered.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground italic font-serif">
              No items in this category yet
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pt-2">
            {filtered.map((item: any) => (
              <button
                key={item.id}
                onClick={() => { onSelect(item); onClose(); }}
                className="group rounded-sm overflow-hidden border border-border/40 hover:border-primary/40 transition-all duration-150 text-left"
              >
                <div className="aspect-square bg-muted overflow-hidden">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-muted to-accent/30 flex items-center justify-center">
                      <span className="font-serif text-2xl text-muted-foreground/30">
                        {item.title?.[0]}
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-2">
                  {item.brand && (
                    <p className="text-[9px] tracking-widest uppercase text-muted-foreground">
                      {item.brand}
                    </p>
                  )}
                  <p className="text-xs font-serif leading-snug line-clamp-2">{item.title}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Slot Card ─────────────────────────────────────────────────────────────────

function SlotCard({
  slot,
  label,
  item,
  onAdd,
  onSwap,
  onClear,
  onViewItem,
  iconName,
}: {
  slot: OutfitSlot;
  label: string;
  item: any | null;
  onAdd: () => void;
  onSwap: () => void;
  onClear: () => void;
  onViewItem: (id: number) => void;
  iconName?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="flex items-center justify-center gap-1 text-[10px] tracking-widest uppercase text-muted-foreground text-center">
        {iconName && <SlotIcon name={iconName} size={11} />}
        {label}
      </span>
      <div
        className={`slot-card ${item ? "filled" : ""}`}
        onClick={!item ? onAdd : undefined}
      >
        {item ? (
          <>
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={item.title}
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => onViewItem(item.id)}
              />
            ) : (
              <div
                className="w-full h-full bg-gradient-to-br from-muted to-accent/30 flex items-center justify-center cursor-pointer"
                onClick={() => onViewItem(item.id)}
              >
                <span className="font-serif text-3xl text-muted-foreground/30">
                  {item.title?.[0]}
                </span>
              </div>
            )}
            {/* Controls */}
            <div className="absolute top-1.5 right-1.5 flex gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); onSwap(); }}
                className="bg-background/80 backdrop-blur-sm rounded-full p-1 hover:bg-background transition-colors"
              >
                <RefreshCw size={11} className="text-muted-foreground" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onClear(); }}
                className="bg-background/80 backdrop-blur-sm rounded-full p-1 hover:bg-background transition-colors"
              >
                <X size={11} className="text-muted-foreground" />
              </button>
            </div>
            {/* Item name overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/40 to-transparent p-2">
              <p className="text-[10px] text-white/90 font-serif leading-tight line-clamp-1">
                {item.title}
              </p>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-6 h-6 rounded-full border border-dashed border-muted-foreground/40 flex items-center justify-center">
              <span className="text-muted-foreground/40 text-lg leading-none">+</span>
            </div>
            <span className="text-[10px] text-muted-foreground/60 tracking-wider">Add</span>
          </div>
        )}
      </div>
      {item && (
        <p className="text-[10px] text-center text-muted-foreground line-clamp-1 font-serif">
          {item.brand ? `${item.brand} · ` : ""}{item.title}
        </p>
      )}
    </div>
  );
}
// ─── Canvas Page ────────────────────────────────────────────────────────────────

type SlotState = Record<OutfitSlot, any | null>;

const EMPTY_SLOTS: SlotState = {
  head: null,
  top: null,
  bottom: null,
  shoes: null,
  accessory: null,
  bag: null,
  jewelry: null,
  other: null,
};

export default function CanvasPage() {
  const { isAuthenticated, loading } = useAuth();
  const [slots, setSlots] = useState<SlotState>(EMPTY_SLOTS);
  const [pickerSlot, setPickerSlot] = useState<OutfitSlot | null>(null);
  const [outfitName, setOutfitName] = useState("");
  const [viewItemId, setViewItemId] = useState<number | null>(null);
  // Optional slots that the user has chosen to add
  const [activeOptional, setActiveOptional] = useState<OutfitSlot[]>([]);

  const optionalSlots = OUTFIT_SLOTS.filter((s) => s.optional);
  const coreSlots = OUTFIT_SLOTS.filter((s) => !s.optional);

  const addOptionalSlot = (slot: OutfitSlot) => {
    setActiveOptional((prev) => prev.includes(slot) ? prev : [...prev, slot]);
  };
  const removeOptionalSlot = (slot: OutfitSlot) => {
    setActiveOptional((prev) => prev.filter((s) => s !== slot));
    setSlots((s) => ({ ...s, [slot]: null }));
  };

  const utils = trpc.useUtils();
  const saveOutfit = trpc.outfits.create.useMutation({
    onSuccess: () => {
      toast.success("Outfit saved");
      setSlots(EMPTY_SLOTS);
      setOutfitName("");
      utils.outfits.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  if (loading) return null;

  if (!isAuthenticated) {
    return (
      <div className="container py-24 text-center">
        <p className="font-serif text-2xl text-muted-foreground/60">Sign in to build outfits</p>
        <Button
          onClick={() => (window.location.href = getLoginUrl())}
          className="mt-6 text-xs tracking-widest uppercase"
        >
          Sign in
        </Button>
      </div>
    );
  }

  const filledSlots = OUTFIT_SLOTS.filter((s) => slots[s.slot] !== null);
  const totalPrice = filledSlots.reduce(
    (sum, s) => sum + (slots[s.slot]?.currentPrice ?? slots[s.slot]?.purchasePrice ?? 0),
    0
  );

  const handleSave = () => {
    if (!outfitName.trim()) {
      toast.error("Give your outfit a name");
      return;
    }
    if (filledSlots.length === 0) {
      toast.error("Add at least one item to your outfit");
      return;
    }
    saveOutfit.mutate({
      name: outfitName,
      slots: filledSlots.map((s) => ({ slot: s.slot, itemId: slots[s.slot].id })),
      totalPrice: totalPrice > 0 ? totalPrice : undefined,
    });
  };

  return (
    <div className="container py-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-4xl">Canvas</h1>
        <p className="text-xs text-muted-foreground mt-1 tracking-wide">
          Compose an outfit from your wardrobe
        </p>
      </div>

      {/* Core slot grid */}
      <div className="space-y-4">
        {/* Row 1: Head + Accessory */}
        <div className="grid grid-cols-2 gap-4">
          {(["head", "accessory"] as OutfitSlot[]).map((slot) => {
            const config = OUTFIT_SLOTS.find((s) => s.slot === slot)!;
            return (
              <SlotCard
                key={slot}
                slot={slot}
                label={config.label}
                iconName={config.icon}
                item={slots[slot]}
                onAdd={() => setPickerSlot(slot)}
                onSwap={() => setPickerSlot(slot)}
                onClear={() => setSlots((s) => ({ ...s, [slot]: null }))}
                onViewItem={setViewItemId}
              />
            );
          })}
        </div>

        {/* Row 2: Top + Bottom */}
        <div className="grid grid-cols-2 gap-4">
          {(["top", "bottom"] as OutfitSlot[]).map((slot) => {
            const config = OUTFIT_SLOTS.find((s) => s.slot === slot)!;
            return (
              <SlotCard
                key={slot}
                slot={slot}
                label={config.label}
                iconName={config.icon}
                item={slots[slot]}
                onAdd={() => setPickerSlot(slot)}
                onSwap={() => setPickerSlot(slot)}
                onClear={() => setSlots((s) => ({ ...s, [slot]: null }))}
                onViewItem={setViewItemId}
              />
            );
          })}
        </div>

        {/* Row 3: Shoes (centered) */}
        <div className="grid grid-cols-3 gap-4">
          <div />
          <SlotCard
            slot="shoes"
            label="Shoes"
            iconName="footprints"
            item={slots.shoes}
            onAdd={() => setPickerSlot("shoes")}
            onSwap={() => setPickerSlot("shoes")}
            onClear={() => setSlots((s) => ({ ...s, shoes: null }))}
            onViewItem={setViewItemId}
          />
          <div />
        </div>

        {/* Active optional slots */}
        {activeOptional.length > 0 && (
          <div className="grid grid-cols-2 gap-4">
            {activeOptional.map((slot) => {
              const config = OUTFIT_SLOTS.find((s) => s.slot === slot)!;
              return (
                <div key={slot} className="relative">
                  <SlotCard
                    slot={slot}
                    label={config.label}
                iconName={config.icon}
                    item={slots[slot]}
                    onAdd={() => setPickerSlot(slot)}
                    onSwap={() => setPickerSlot(slot)}
                    onClear={() => setSlots((s) => ({ ...s, [slot]: null }))}
                    onViewItem={setViewItemId}
                  />
                  {/* Remove optional slot button */}
                  <button
                    onClick={() => removeOptionalSlot(slot)}
                    className="absolute -top-2 -right-2 z-10 bg-background border border-border rounded-full w-5 h-5 flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors"
                    title={`Remove ${config.label} slot`}
                  >
                    <X size={10} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Add optional slot buttons */}
        {optionalSlots.some((s) => !activeOptional.includes(s.slot)) && (
          <div className="flex flex-wrap gap-2 pt-2">
            <span className="text-[10px] tracking-widest uppercase text-muted-foreground self-center mr-1">Add slot:</span>
            {optionalSlots
              .filter((s) => !activeOptional.includes(s.slot))
              .map((s) => (
                <button
                  key={s.slot}
                  onClick={() => addOptionalSlot(s.slot)}
                  className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-sm border border-dashed border-border hover:border-primary/60 hover:bg-accent text-muted-foreground hover:text-foreground transition-all"
                >
                  <SlotIcon name={s.icon} size={11} />
                  <span>{s.label}</span>
                </button>
              ))}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="w-full h-px bg-border/60 my-8" />

      {/* Save outfit */}
      <div className="space-y-4">
        {totalPrice > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground text-xs tracking-widest uppercase">Total value</span>
            <span className="font-serif text-lg">
              USD {totalPrice.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          </div>
        )}
        <div className="flex gap-3">
          <Input
            placeholder="Name this outfit..."
            value={outfitName}
            onChange={(e) => setOutfitName(e.target.value)}
            className="text-sm font-serif italic"
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
          <Button
            onClick={handleSave}
            disabled={saveOutfit.isPending}
            className="gap-1.5 text-xs tracking-widest uppercase whitespace-nowrap"
          >
            {saveOutfit.isPending ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Save size={13} />
            )}
            Save outfit
          </Button>
        </div>
        {filledSlots.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {filledSlots.length} {filledSlots.length === 1 ? "piece" : "pieces"} selected
          </p>
        )}
      </div>

      {/* Slot Picker */}
      {pickerSlot && (
        <SlotPickerModal
          slot={pickerSlot}
          open={!!pickerSlot}
          onClose={() => setPickerSlot(null)}
          onSelect={(item) => setSlots((s) => ({ ...s, [pickerSlot]: item }))}
        />
      )}

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
