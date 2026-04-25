import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
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
import { Trash2, Layers } from "lucide-react";
import ItemDetailModal from "@/components/ItemDetailModal";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";

function OutfitCard({
  outfit,
  onDelete,
  onItemClick,
}: {
  outfit: any;
  onDelete: () => void;
  onItemClick: (id: number) => void;
}) {
  const slots = ["head", "top", "bottom", "shoes", "accessory"];
  const slotItems = slots
    .map((slot) => outfit.items?.find((i: any) => i.slot === slot))
    .filter(Boolean);

  const displayItems = outfit.items ?? [];

  return (
    <div className="border border-border/40 rounded-sm bg-card hover:border-border transition-all duration-200 overflow-hidden">
      {/* Thumbnail strip */}
      <div className="flex gap-px bg-border/20">
        {slots.map((slot) => {
          const slotItem = displayItems.find((i: any) => i.slot === slot);
          return (
            <div
              key={slot}
              className="flex-1 aspect-square bg-muted overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => slotItem?.item && onItemClick(slotItem.item.id)}
            >
              {slotItem?.item?.imageUrl ? (
                <img
                  src={slotItem.item.imageUrl}
                  alt={slotItem.item.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-muted to-accent/20 flex items-center justify-center">
                  {slotItem?.item ? (
                    <span className="font-serif text-sm text-muted-foreground/30">
                      {slotItem.item.title?.[0]}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/20 text-xs">—</span>
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
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
        >
          <Trash2 size={14} />
        </Button>
      </div>
    </div>
  );
}

export default function OutfitsPage() {
  const { isAuthenticated, loading } = useAuth();
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [viewItemId, setViewItemId] = useState<number | null>(null);
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
            />
          ))}
        </div>
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
