import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Edit2, Trash2, Heart, ExternalLink, TrendingUp, TrendingDown,
  Minus, RefreshCw, Loader2, X, ShoppingBag, CheckCircle2
} from "lucide-react";
import AddEditItemModal from "./AddEditItemModal";
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
  const color = isUp ? "#dc2626" : isDown ? "#059669" : "#78716c";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs tracking-widest uppercase text-muted-foreground">Price history</span>
        <span className={`text-xs font-medium ${isUp ? "text-red-600" : isDown ? "text-emerald-700" : "text-stone-500"}`}>
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
  const [logPriceOpen, setLogPriceOpen] = useState(false);
  const [newPrice, setNewPrice] = useState("");
  const [priceNote, setPriceNote] = useState("");

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

  const addPrice = trpc.priceHistory.add.useMutation({
    onSuccess: () => {
      toast.success("Price logged");
      refetch();
      setLogPriceOpen(false);
      setNewPrice("");
      setPriceNote("");
    },
  });

  const toggleLove = trpc.items.update.useMutation({
    onSuccess: () => { refetch(); onUpdate(); },
  });

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
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0">
          {isLoading || !item ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="animate-spin text-muted-foreground" size={24} />
            </div>
          ) : (
            <>
              {/* Image */}
              <div className="relative bg-muted overflow-hidden rounded-t-sm" style={{ aspectRatio: "4/5" }}>
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-muted to-accent/30 flex items-center justify-center">
                    <span className="font-serif text-7xl text-muted-foreground/20">
                      {item.title?.[0] ?? "?"}
                    </span>
                  </div>
                )}
                {/* Love button */}
                <button
                  onClick={() => toggleLove.mutate({ id: item.id, isLoved: !item.isLoved })}
                  className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm rounded-full p-2 hover:bg-background transition-colors"
                >
                  <Heart
                    size={16}
                    fill={item.isLoved ? "currentColor" : "none"}
                    className={item.isLoved ? "text-rose-500" : "text-muted-foreground"}
                  />
                </button>
                {/* Close button */}
                <button
                  onClick={onClose}
                  className="absolute top-3 left-3 bg-background/80 backdrop-blur-sm rounded-full p-2 hover:bg-background transition-colors"
                >
                  <X size={16} className="text-muted-foreground" />
                </button>
              </div>

              {/* Content */}
              <div className="p-5 space-y-5">
                {/* Header */}
                <div>
                  {item.brand && (
                    <p className="text-[10px] tracking-widest uppercase text-muted-foreground mb-1">
                      {item.brand}
                    </p>
                  )}
                  <h2 className="font-serif text-2xl leading-tight">{item.title}</h2>
                  <div className="flex items-center gap-2 mt-2">
                    {currentPrice != null && (
                      <span className="text-sm text-foreground">
                        {item.currency ?? "USD"} {currentPrice.toLocaleString()}
                      </span>
                    )}
                    {priceTrend && (
                      <span
                        className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-sm ${
                          priceTrend.isUp
                            ? "bg-red-50 text-red-600"
                            : priceTrend.isDown
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-stone-100 text-stone-500"
                        }`}
                      >
                        {priceTrend.isUp ? <TrendingUp size={9} /> : priceTrend.isDown ? <TrendingDown size={9} /> : <Minus size={9} />}
                        {priceTrend.pct > 0 ? "+" : ""}{priceTrend.pct.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Meta grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {item.category && (
                    <div>
                      <span className="text-muted-foreground tracking-wider uppercase text-[10px]">Category</span>
                      <p className="capitalize mt-0.5">{item.category}</p>
                    </div>
                  )}
                  {item.color && (
                    <div>
                      <span className="text-muted-foreground tracking-wider uppercase text-[10px]">Color</span>
                      <p className="capitalize mt-0.5">{item.color}</p>
                    </div>
                  )}
                  {item.size && (
                    <div>
                      <span className="text-muted-foreground tracking-wider uppercase text-[10px]">Size</span>
                      <p className="mt-0.5">{item.size}</p>
                    </div>
                  )}
                  {item.purchasePrice != null && (
                    <div>
                      <span className="text-muted-foreground tracking-wider uppercase text-[10px]">Paid</span>
                      <p className="mt-0.5">{item.currency} {item.purchasePrice.toLocaleString()}</p>
                    </div>
                  )}
                  {item.purchaseDate && (
                    <div>
                      <span className="text-muted-foreground tracking-wider uppercase text-[10px]">Purchased</span>
                      <p className="mt-0.5">{new Date(item.purchaseDate).toLocaleDateString()}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground tracking-wider uppercase text-[10px]">Worn</span>
                    <p className="mt-0.5">{item.wearCount} {item.wearCount === 1 ? "time" : "times"}</p>
                  </div>
                  {item.purchasePrice && item.wearCount > 0 && (
                    <div>
                      <span className="text-muted-foreground tracking-wider uppercase text-[10px]">Cost / wear</span>
                      <p className="mt-0.5">{item.currency} {(item.purchasePrice / item.wearCount).toFixed(2)}</p>
                    </div>
                  )}
                </div>

                {/* Sparkline */}
                {history.length >= 2 && (
                  <div className="border-t border-border/40 pt-4">
                    <PriceSparkline history={history} />
                  </div>
                )}

                {/* Log price inline */}
                {logPriceOpen && (
                  <div className="border border-border/60 rounded-sm p-3 space-y-3 bg-muted/30">
                    <p className="text-xs tracking-widest uppercase text-muted-foreground">Log current price</p>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Current price"
                        value={newPrice}
                        onChange={(e) => setNewPrice(e.target.value)}
                        className="text-sm"
                      />
                      <Input
                        placeholder="Note (optional)"
                        value={priceNote}
                        onChange={(e) => setPriceNote(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          if (!newPrice) return;
                          addPrice.mutate({
                            itemId: item.id,
                            price: parseFloat(newPrice),
                            currency: item.currency ?? "USD",
                            note: priceNote || undefined,
                          });
                        }}
                        disabled={addPrice.isPending || !newPrice}
                        className="text-xs tracking-wide gap-1.5"
                      >
                        {addPrice.isPending && <Loader2 size={11} className="animate-spin" />}
                        Save price
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setLogPriceOpen(false)}
                        className="text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Note */}
                {item.personalNote && (
                  <div className="border-t border-border/40 pt-4">
                    <p className="text-xs tracking-widest uppercase text-muted-foreground mb-1">Note</p>
                    <p className="font-serif italic text-sm leading-relaxed text-foreground/80">
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
                <div className="border-t border-border/40 pt-4 grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => markWorn.mutate({ id: item.id })}
                    disabled={markWorn.isPending}
                    className="text-xs gap-1.5 tracking-wide"
                  >
                    {markWorn.isPending ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={12} />
                    )}
                    Mark worn
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLogPriceOpen(!logPriceOpen)}
                    className="text-xs gap-1.5 tracking-wide"
                  >
                    <RefreshCw size={12} />
                    Log price
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditOpen(true)}
                    className="text-xs gap-1.5 tracking-wide"
                  >
                    <Edit2 size={12} />
                    Edit
                  </Button>
                  {item.buyUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(item.buyUrl ?? undefined, "_blank")}
                      className="text-xs gap-1.5 tracking-wide"
                    >
                      <ExternalLink size={12} />
                      Buy
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteOpen(true)}
                    className="text-xs gap-1.5 tracking-wide text-destructive hover:text-destructive col-span-2"
                  >
                    <Trash2 size={12} />
                    Delete piece
                  </Button>
                </div>
              </div>
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif font-normal text-xl">
              Remove this piece?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              This will permanently remove <span className="font-medium text-foreground">{item?.title}</span> and all its price history from your wardrobe.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs tracking-wide">Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteItem.mutate({ id: itemId })}
              className="text-xs tracking-wide bg-destructive hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
