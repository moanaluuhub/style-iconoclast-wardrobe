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
  return <Icon size={size} className="text-[#ACABAB]" />;
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
      <DialogContent className="max-w-sm max-h-[70vh] overflow-y-auto rounded-none border-[#DEDEDE] p-0">
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-[#DEDEDE]">
          <DialogTitle className="text-[11px] tracking-[0.18em] uppercase font-medium text-black">
            Choose {slotConfig?.label}
          </DialogTitle>
        </DialogHeader>
        {filtered.length === 0 ? (
          <div className="text-center py-8 px-5">
            <p className="text-[12px] text-[#ACABAB] tracking-wide">
              No items in this category yet
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 p-5">
            {filtered.map((item: any) => (
              <button
                key={item.id}
                onClick={() => { onSelect(item); onClose(); }}
                className="group overflow-hidden border border-[#DEDEDE] hover:border-black transition-all duration-150 text-left"
              >
                <div className="aspect-square bg-[#F5F5F5] overflow-hidden">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#F5F5F5] flex items-center justify-center">
                      <span className="text-2xl font-light text-[#DEDEDE]">
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
                  <p className="text-[11px] leading-snug line-clamp-2 text-[#323232]">{item.title}</p>
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
      <span className="flex items-center justify-center gap-1 text-[9px] tracking-[0.14em] uppercase text-[#ACABAB] text-center mb-1">
        {iconName && <SlotIcon name={iconName} size={10} />}
        {label}
      </span>
      <div
        className={`relative aspect-[3/4] border overflow-hidden cursor-pointer transition-all ${
          item ? "border-[#DEDEDE]" : "border-dashed border-[#DEDEDE] bg-[#F9F9F9] hover:border-black"
        }`}
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
                className="w-full h-full bg-[#F5F5F5] flex items-center justify-center cursor-pointer"
                onClick={() => onViewItem(item.id)}
              >
                <span className="text-3xl font-light text-[#DEDEDE]">
                  {item.title?.[0]}
                </span>
              </div>
            )}
            {/* Controls */}
            <div className="absolute top-1.5 right-1.5 flex gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); onSwap(); }}
                className="bg-white/90 p-1 hover:bg-white transition-colors"
              >
                <RefreshCw size={10} className="text-black" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onClear(); }}
                className="bg-white/90 p-1 hover:bg-white transition-colors"
              >
                <X size={10} className="text-black" />
              </button>
            </div>
            {/* Item name overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2">
              <p className="text-[9px] text-white leading-tight line-clamp-1 tracking-wide">
                {item.title}
              </p>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-1.5">
            <span className="text-[#DEDEDE] text-2xl leading-none">+</span>
            <span className="text-[9px] text-[#ACABAB] tracking-[0.12em] uppercase">Add</span>
          </div>
        )}
      </div>
      {item && (
        <p className="text-[9px] text-center text-[#5A5A5A] line-clamp-1 mt-1">
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
        <p className="text-[13px] text-[#ACABAB] tracking-wide">Sign in to build outfits</p>
        <button
          onClick={() => (window.location.href = getLoginUrl())}
          className="mt-6 bg-black text-white text-[10px] tracking-[0.14em] uppercase px-8 py-3 hover:bg-[#323232] transition-colors"
        >
          Sign in
        </button>
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
      <div className="mb-8 border-b border-[#EDEDED] pb-6">
        <h1 className="text-[11px] tracking-[0.22em] uppercase font-medium text-black">Canvas</h1>
        <p className="text-[12px] text-[#ACABAB] mt-1 tracking-wide">
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
                    className="absolute -top-2 -right-2 z-10 bg-white border border-[#DEDEDE] w-5 h-5 flex items-center justify-center hover:border-black transition-colors"
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
            <span className="text-[9px] tracking-[0.14em] uppercase text-[#ACABAB] self-center mr-1">Add slot:</span>
            {optionalSlots
              .filter((s) => !activeOptional.includes(s.slot))
              .map((s) => (
                <button
                  key={s.slot}
                  onClick={() => addOptionalSlot(s.slot)}
                  className="flex items-center gap-1 text-[10px] px-2.5 py-1 border border-dashed border-[#DEDEDE] hover:border-black text-[#5A5A5A] hover:text-black transition-all tracking-wide"
                >
                  <SlotIcon name={s.icon} size={10} />
                  <span>{s.label}</span>
                </button>
              ))}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="w-full h-px bg-[#EDEDED] my-8" />

      {/* Save outfit */}
      <div className="space-y-4">
        {totalPrice > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-[9px] tracking-[0.14em] uppercase text-[#ACABAB]">Total value</span>
            <span className="text-[14px] font-medium text-black">
              USD {totalPrice.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          </div>
        )}
        <div className="flex gap-3">
          <Input
            placeholder="Name this outfit..."
            value={outfitName}
            onChange={(e) => setOutfitName(e.target.value)}
            className="text-[12px] rounded-none border-[#DEDEDE] focus-visible:ring-0 focus-visible:border-black h-10"
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
          <button
            onClick={handleSave}
            disabled={saveOutfit.isPending}
            className="flex items-center gap-1.5 bg-black text-white text-[10px] tracking-[0.14em] uppercase px-5 h-10 whitespace-nowrap hover:bg-[#323232] transition-colors disabled:opacity-40"
          >
            {saveOutfit.isPending ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Save size={12} />
            )}
            Save outfit
          </button>
        </div>
        {filledSlots.length > 0 && (
          <p className="text-[10px] text-[#ACABAB] tracking-wide">
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
