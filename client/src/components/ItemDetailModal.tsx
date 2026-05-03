import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Edit2, Trash2, Heart, ExternalLink, TrendingUp, TrendingDown,
  Minus, RefreshCw, Loader2, X, ShoppingBag, CheckCircle2, Share2
} from "lucide-react";
import AddEditItemModal from "./AddEditItemModal";
import PriceTracker from "./PriceTracker";
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

// ─── Price Sparkline ───────────────────────────────────────────────────────────

function PriceSparkline({ history }: { history: { price: number; recordedAt: Date }[] }) {
  if (history.length < 2) return null;
  const prices = history.map((h) => h.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const W = 280;
  const H = 60;
  const PAD = 8;

  const points = prices.map((p, i) => {
    const x = PAD + (i / (prices.length - 1)) * (W - PAD * 2);
    const y = PAD + ((max - p) / range) * (H - PAD * 2);
    return { x, y, price: p };
  });

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  const last = prices[prices.length - 1];
  const first = prices[0];
  const isUp = last > first;
  const isDown = last < first;
  const color = isUp ? "#000000" : isDown ? "#5A5A5A" : "#ACABAB";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] tracking-[0.14em] uppercase text-[#5A5A5A]">Price history</span>
        <span className={`text-[10px] font-medium ${isUp ? "text-black" : isDown ? "text-[#5A5A5A]" : "text-[#ACABAB]"}`}>
          {isUp ? "↑" : isDown ? "↓" : "→"}{" "}
          {(((last - first) / first) * 100).toFixed(1)}% since added
        </span>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
        {/* Area fill */}
        <defs>
          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.15" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`${pathD} L ${points[points.length - 1].x} ${H} L ${points[0].x} ${H} Z`}
          fill="url(#sparkGrad)"
        />
        {/* Line */}
        <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Dots */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} />
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{new Date(history[0].recordedAt).toLocaleDateString()}</span>
        <span>{new Date(history[history.length - 1].recordedAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

interface ItemDetailModalProps {
  itemId: number;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export default function ItemDetailModal({ itemId, open, onClose, onUpdate }: ItemDetailModalProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const utils = trpc.useUtils();
  const { data: item, isLoading, refetch } = trpc.items.get.useQuery(
    { id: itemId },
    { enabled: open && itemId > 0 }
  );

  const deleteItem = trpc.items.delete.useMutation({
    onSuccess: () => {
      toast.success("Item deleted");
      utils.items.list.invalidate();
      onUpdate();
      onClose();
    },
  });

  const markWorn = trpc.items.markWorn.useMutation({
    onSuccess: () => {
      toast.success("Marked as worn");
      refetch();
      onUpdate();
    },
  });


  const toggleLove = trpc.items.update.useMutation({
    onSuccess: () => { refetch(); onUpdate(); },
  });

  const addToCart = trpc.cart.add.useMutation({
    onSuccess: () => {
      utils.cart.list.invalidate();
      toast.success("Added to cart");
    },
  });

  const removeFromCart = trpc.cart.remove.useMutation({
    onSuccess: () => {
      utils.cart.list.invalidate();
      toast.success("Removed from cart");
    },
  });

  const handleShare = () => {
    if (!item) return;
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

  if (!open) return null;

  const history = item?.priceHistory ?? [];
  const currentPrice = item?.currentPrice ?? item?.purchasePrice;

  const priceTrend = (() => {
    if (history.length < 2) return null;
    const first = history[0].price;
    const last = history[history.length - 1].price;
    const pct = ((last - first) / first) * 100;
    return { pct, isUp: pct > 0.5, isDown: pct < -0.5 };
  })();

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 rounded-none border-[#DEDEDE]">
          {isLoading || !item ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="animate-spin text-muted-foreground" size={24} />
            </div>
          ) : (
            <>
              <div className="md:flex md:items-start">
              {/* Image */}
              <div className="relative bg-[#F5F5F5] overflow-hidden md:w-[280px] md:shrink-0" style={{ aspectRatio: "4/5" }}>
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-[#F5F5F5] flex items-center justify-center">
                    <span className="text-7xl font-light text-[#DEDEDE]">
                      {item.title?.[0] ?? "?"}
                    </span>
                  </div>
                )}
                {/* Love button */}
                <button
                  onClick={() => toggleLove.mutate({ id: item.id, isLoved: !item.isLoved })}
                  className="absolute top-3 right-3 bg-white/90 p-2 hover:bg-white transition-colors"
                >
                  <Heart
                    size={16}
                    fill={item.isLoved ? "currentColor" : "none"}
                    className="text-black"
                  />
                </button>
                {/* Close button */}
                <button
                  onClick={onClose}
                  className="absolute top-3 left-3 bg-white/90 p-2 hover:bg-white transition-colors"
                >
                  <X size={16} className="text-black" />
                </button>
              </div>

              {/* Content */}
              <div className="p-5 space-y-5 flex-1 overflow-y-auto">
                {/* Header */}
                <div>
                  {item.brand && (
                    <p className="text-[10px] tracking-[0.14em] uppercase text-black font-medium mb-1">
                      {item.brand}
                    </p>
                  )}
                  <h2 className="text-[15px] font-light leading-snug text-black">{item.title}</h2>
                  <div className="flex items-center gap-2 mt-2">
                    {currentPrice != null && (
                      <span className="text-[13px] font-medium text-black">
                        {item.currency ?? "USD"} {currentPrice.toLocaleString()}
                      </span>
                    )}
                    {priceTrend && (
                      <span
                        className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 bg-[#F5F5F5] text-[#5A5A5A] tracking-wider"
                      >
                        {priceTrend.isUp ? <TrendingUp size={9} /> : priceTrend.isDown ? <TrendingDown size={9} /> : <Minus size={9} />}
                        {priceTrend.pct > 0 ? "+" : ""}{priceTrend.pct.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Meta grid */}
                <div className="grid grid-cols-2 gap-3 border-t border-[#EDEDED] pt-4">
                  {item.category && (
                    <div>
                      <span className="text-[9px] tracking-[0.14em] uppercase text-[#ACABAB]">Category</span>
                      <p className="text-[12px] capitalize mt-0.5 text-black">{item.category}</p>
                    </div>
                  )}
                  {item.color && (
                    <div>
                      <span className="text-[9px] tracking-[0.14em] uppercase text-[#ACABAB]">Color</span>
                      <p className="text-[12px] capitalize mt-0.5 text-black">{item.color}</p>
                    </div>
                  )}
                  {item.size && (
                    <div>
                      <span className="text-[9px] tracking-[0.14em] uppercase text-[#ACABAB]">Size</span>
                      <p className="text-[12px] mt-0.5 text-black">{item.size}</p>
                    </div>
                  )}
                  {item.purchasePrice != null && (
                    <div>
                      <span className="text-[9px] tracking-[0.14em] uppercase text-[#ACABAB]">Paid</span>
                      <p className="text-[12px] mt-0.5 text-black">{item.currency} {item.purchasePrice.toLocaleString()}</p>
                    </div>
                  )}
                  {item.purchaseDate && (
                    <div>
                      <span className="text-[9px] tracking-[0.14em] uppercase text-[#ACABAB]">Purchased</span>
                      <p className="text-[12px] mt-0.5 text-black">{new Date(item.purchaseDate).toLocaleDateString()}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-[9px] tracking-[0.14em] uppercase text-[#ACABAB]">Worn</span>
                    <p className="text-[12px] mt-0.5 text-black">{item.wearCount} {item.wearCount === 1 ? "time" : "times"}</p>
                  </div>
                  {item.purchasePrice && item.wearCount > 0 && (
                    <div>
                      <span className="text-[9px] tracking-[0.14em] uppercase text-[#ACABAB]">Cost / wear</span>
                      <p className="text-[12px] mt-0.5 text-black">{item.currency} {(item.purchasePrice / item.wearCount).toFixed(2)}</p>
                    </div>
                  )}
                </div>
                {/* Price Tracker */}
                <div className="border-t border-[#EDEDED] pt-4">
                  <PriceTracker
                    itemId={item.id}
                    purchasePrice={item.purchasePrice ?? null}
                    currency={item.currency ?? "USD"}
                    onPriceUpdated={() => { refetch(); onUpdate(); }}
                  />
                </div>

                {/* Note */}
                {item.personalNote && (
                  <div className="border-t border-[#EDEDED] pt-4">
                    <p className="text-[10px] tracking-[0.14em] uppercase text-[#5A5A5A] mb-2">Note</p>
                    <p className="text-[12px] leading-relaxed text-[#323232] italic">
                      {item.personalNote}
                    </p>
                  </div>
                )}

                {/* Tags */}
                {item.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {item.tags.map((tag: string) => (
                      <span key={tag} className="tag-chip pointer-events-none">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Action buttons */}
                <div className="border-t border-[#EDEDED] pt-4 grid grid-cols-2 gap-2">
                  {[
                    { label: "Mark worn", icon: <CheckCircle2 size={11} />, onClick: () => markWorn.mutate({ id: item.id }), disabled: markWorn.isPending },
                    { label: "Share", icon: <Share2 size={11} />, onClick: handleShare, disabled: false },
                    { label: item.inCart ? "In cart" : "Cart", icon: <ShoppingBag size={11} fill={item.inCart ? "currentColor" : "none"} />, onClick: () => item.inCart ? removeFromCart.mutate({ itemId: item.id }) : addToCart.mutate({ itemId: item.id }), disabled: addToCart.isPending || removeFromCart.isPending, filled: item.inCart },
                    { label: "Edit", icon: <Edit2 size={11} />, onClick: () => setEditOpen(true), disabled: false },
                    ...(item.buyUrl ? [{ label: "Shop", icon: <ExternalLink size={11} />, onClick: () => window.open(item.buyUrl ?? undefined, "_blank"), disabled: false }] : []),
                  ].map(({ label, icon, onClick, disabled, filled }: any) => (
                    <button
                      key={label}
                      onClick={onClick}
                      disabled={disabled}
                      className={`flex items-center justify-center gap-1.5 text-[10px] tracking-[0.12em] uppercase py-2.5 border transition-colors disabled:opacity-40 ${
                        filled ? "bg-black text-white border-black" : "border-[#DEDEDE] text-[#5A5A5A] hover:border-black hover:text-black"
                      }`}
                    >
                      {icon}{label}
                    </button>
                  ))}
                  <button
                    onClick={() => setDeleteOpen(true)}
                    className="col-span-2 flex items-center justify-center gap-1.5 text-[10px] tracking-[0.12em] uppercase py-2.5 border border-[#DEDEDE] text-[#ACABAB] hover:border-black hover:text-black transition-colors"
                  >
                    <Trash2 size={11} /> Delete piece
                  </button>
                </div>
              </div>
              </div>{/* end two-col */}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit modal */}
      {editOpen && item && (
        <AddEditItemModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onSuccess={() => { refetch(); onUpdate(); }}
          editItem={item}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-none border-[#DEDEDE]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[11px] tracking-[0.18em] uppercase font-medium">
              Remove this piece?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[12px] text-[#5A5A5A]">
              This will permanently remove <span className="font-medium text-foreground">{item?.title}</span> and all its price history from your wardrobe.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-[10px] tracking-[0.14em] uppercase rounded-none border-[#DEDEDE] hover:border-black">Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteItem.mutate({ id: itemId })}
              className="text-[10px] tracking-[0.14em] uppercase rounded-none bg-black hover:bg-[#323232]"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
