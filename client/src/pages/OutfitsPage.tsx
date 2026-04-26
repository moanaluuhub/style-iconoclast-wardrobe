import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
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
import { Trash2, Layers, Share2, Eye, X } from "lucide-react";
import ItemDetailModal from "@/components/ItemDetailModal";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { OUTFIT_SLOTS } from "@/lib/types";

// ─── Outfit Detail Modal ───────────────────────────────────────────────────────

function OutfitDetailModal({
  outfit,
  open,
  onClose,
  onItemClick,
  onDelete,
}: {
  outfit: any;
  open: boolean;
  onClose: () => void;
  onItemClick: (id: number) => void;
  onDelete: () => void;
}) {
  if (!outfit) return null;

  const allSlots = OUTFIT_SLOTS;
  const filledSlots = allSlots.filter((s) =>
    outfit.items?.some((i: any) => i.slot === s.slot)
  );

  const handleShare = async () => {
    const text = `${outfit.name} — ${filledSlots.length} pieces${
      outfit.totalPrice ? ` · USD ${outfit.totalPrice.toLocaleString()}` : ""
    }\n${filledSlots
      .map((s) => {
        const item = outfit.items?.find((i: any) => i.slot === s.slot)?.item;
        return item ? `${s.icon} ${item.brand ? item.brand + " " : ""}${item.title}` : null;
      })
      .filter(Boolean)
      .join("\n")}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: outfit.name, text });
        toast.success("Shared!");
      } catch {
        /* cancelled */
      }
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

        {/* Full-size slot grid */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          {filledSlots.map((slotConfig) => {
            const slotItem = outfit.items?.find((i: any) => i.slot === slotConfig.slot);
            const item = slotItem?.item;
            if (!item) return null;
            return (
              <button
                key={slotConfig.slot}
                onClick={() => { onItemClick(item.id); onClose(); }}
                className="group rounded-sm overflow-hidden border border-border/40 hover:border-primary/40 transition-all duration-150 text-left"
              >
                <div className="aspect-square bg-muted overflow-hidden relative">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-muted to-accent/30 flex items-center justify-center">
                      <span className="font-serif text-3xl text-muted-foreground/30">
                        {item.title?.[0]}
                      </span>
                    </div>
                  )}
                  {/* Slot badge */}
                  <div className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm rounded-sm px-1.5 py-0.5">
                    <span className="text-[9px] tracking-widest uppercase text-muted-foreground">
                      {slotConfig.icon} {slotConfig.label}
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

        {/* Actions */}
        <div className="flex gap-2 mt-6 pt-4 border-t border-border/40">
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="flex-1 gap-1.5 text-xs tracking-wide"
          >
            <Share2 size={13} />
            Share look
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { onDelete(); onClose(); }}
            className="gap-1.5 text-xs tracking-wide text-destructive hover:text-destructive hover:border-destructive/40"
          >
            <Trash2 size={13} />
            Remove
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
}: {
  outfit: any;
  onDelete: () => void;
  onItemClick: (id: number) => void;
  onView: () => void;
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
        return item ? `${s.icon} ${item.brand ? item.brand + " " : ""}${item.title}` : null;
      })
      .filter(Boolean)
      .join("\n")}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: outfit.name, text });
        toast.success("Shared!");
      } catch {
        /* cancelled */
      }
    } else {
      await navigator.clipboard.writeText(text);
      toast.success("Outfit details copied to clipboard");
    }
  };

  return (
    <div
      className="border border-border/40 rounded-sm bg-card hover:border-border transition-all duration-200 overflow-hidden cursor-pointer group"
      onClick={onView}
    >
      {/* Thumbnail strip — show all filled slots */}
      <div className="flex gap-px bg-border/20">
        {allSlots.map((slotConfig) => {
          const slotItem = displayItems.find((i: any) => i.slot === slotConfig.slot);
          if (!slotItem && slotConfig.optional) return null;
          return (
            <div
              key={slotConfig.slot}
              className="flex-1 aspect-square bg-muted overflow-hidden"
              style={{ minWidth: 0 }}
            >
              {slotItem?.item?.imageUrl ? (
                <img
                  src={slotItem.item.imageUrl}
                  alt={slotItem.item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-muted to-accent/20 flex items-center justify-center">
                  {slotItem?.item ? (
                    <span className="font-serif text-sm text-muted-foreground/30">
                      {slotItem.item.title?.[0]}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/20 text-xs">{slotConfig.icon}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Info */}
      <div className="p-4 flex items-center justify-between">
        <div>
          <h3 className="font-serif text-lg leading-tight">{outfit.name}</h3>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-muted-foreground">
              {displayItems.length} {displayItems.length === 1 ? "piece" : "pieces"}
            </span>
            {outfit.totalPrice != null && outfit.totalPrice > 0 && (
              <span className="text-xs text-muted-foreground">
                USD {outfit.totalPrice.toLocaleString()}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {new Date(outfit.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onView(); }}
            className="text-muted-foreground hover:text-foreground h-8 w-8 p-0"
            title="View outfit"
          >
            <Eye size={14} />
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
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
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
  const [, navigate] = useLocation();

  const utils = trpc.useUtils();
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

  if (loading) return null;

  if (!isAuthenticated) {
    return (
      <div className="container py-24 text-center">
        <p className="font-serif text-2xl text-muted-foreground/60">Sign in to view outfits</p>
        <Button
          onClick={() => (window.location.href = getLoginUrl())}
          className="mt-6 text-xs tracking-widest uppercase"
        >
          Sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-serif text-4xl">Outfits</h1>
          <p className="text-xs text-muted-foreground mt-1 tracking-wide">
            {outfits.length} saved {outfits.length === 1 ? "outfit" : "outfits"}
          </p>
        </div>
        <Button
          onClick={() => navigate("/canvas")}
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs tracking-widest uppercase"
        >
          <Layers size={13} />
          New outfit
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 rounded-sm bg-muted animate-pulse" />
          ))}
        </div>
      ) : outfits.length === 0 ? (
        <div className="text-center py-24">
          <p className="font-serif text-3xl text-muted-foreground/60 mb-3">No outfits yet</p>
          <p className="text-sm text-muted-foreground mb-6 italic font-serif">
            Compose your first look on the canvas
          </p>
          <Button
            onClick={() => navigate("/canvas")}
            variant="outline"
            className="text-xs tracking-widest uppercase gap-1.5"
          >
            <Layers size={13} />
            Open canvas
          </Button>
        </div>
      ) : (
        <div className="space-y-4 max-w-2xl">
          {outfits.map((outfit: any) => (
            <OutfitCard
              key={outfit.id}
              outfit={outfit}
              onDelete={() => setDeleteId(outfit.id)}
              onItemClick={setViewItemId}
              onView={() => setViewOutfit(outfit)}
            />
          ))}
        </div>
      )}

      {/* Outfit detail modal */}
      {viewOutfit && (
        <OutfitDetailModal
          outfit={viewOutfit}
          open={viewOutfit != null}
          onClose={() => setViewOutfit(null)}
          onItemClick={(id) => { setViewOutfit(null); setViewItemId(id); }}
          onDelete={() => { setDeleteId(viewOutfit.id); setViewOutfit(null); }}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={deleteId != null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif font-normal text-xl">
              Remove this outfit?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              The individual items will remain in your wardrobe.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs tracking-wide">Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteOutfit.mutate({ id: deleteId })}
              className="text-xs tracking-wide bg-destructive hover:bg-destructive/90"
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
