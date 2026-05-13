import { useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { X, ShoppingBag, Trash2, ExternalLink } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

interface CartPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function CartPanel({ open, onClose }: CartPanelProps) {
  const utils = trpc.useUtils();
  const { data: cartEntries = [], isLoading } = trpc.cart.list.useQuery(undefined, {
    enabled: open,
  });

  const removeFromCart = trpc.cart.remove.useMutation({
    onMutate: async ({ itemId }) => {
      await utils.cart.list.cancel();
      const prev = utils.cart.list.getData();
      utils.cart.list.setData(undefined, (old) =>
        (old ?? []).filter((c: any) => c.itemId !== itemId)
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.cart.list.setData(undefined, ctx.prev);
      toast.error("Failed to remove");
    },
    onSettled: () => utils.cart.list.invalidate(),
  });

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const items = cartEntries.map((c: any) => c.item).filter(Boolean);
  const total = items.reduce(
    (sum: number, item: any) => sum + (item.currentPrice ?? item.purchasePrice ?? 0),
    0
  );

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-sm bg-background border-l border-border/60 z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <ShoppingBag size={16} className="text-muted-foreground" />
            <h2 className="font-serif text-xl">Cart</h2>
            {items.length > 0 && (
              <span className="text-xs text-muted-foreground">
                ({items.length} {items.length === 1 ? "piece" : "pieces"})
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 rounded-sm bg-muted animate-pulse" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
              <ShoppingBag size={32} className="text-muted-foreground/30" />
              <div>
                <p className="font-serif text-xl text-muted-foreground/60">
                  Your cart is empty
                </p>
                <p className="text-xs text-muted-foreground mt-1 italic font-serif">
                  Add pieces from your wardrobe
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {cartEntries.map((entry: any) => {
                const item = entry.item;
                if (!item) return null;
                const price = item.currentPrice ?? item.purchasePrice;
                return (
                  <div key={entry.id} className="flex gap-3 p-4 hover:bg-muted/30 transition-colors">
                    {/* Thumbnail */}
                    <div className="w-16 h-20 rounded-sm overflow-hidden bg-muted flex-shrink-0">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-muted to-accent/30 flex items-center justify-center">
                          <span className="font-serif text-lg text-muted-foreground/30">
                            {item.title?.[0]}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 py-0.5">
                      {item.brand && (
                        <p className="text-[9px] tracking-widest uppercase text-muted-foreground mb-0.5">
                          {item.brand}
                        </p>
                      )}
                      <p className="text-sm font-serif leading-snug line-clamp-2">{item.title}</p>
                      {item.size && (
                        <p className="text-xs text-muted-foreground mt-0.5">Size {item.size}</p>
                      )}
                      {price != null && price > 0 && (
                        <p className="text-sm font-serif mt-1">
                          {formatCurrency(price)}
                        </p>
                      )}
                      {item.buyUrl && (
                        <a
                          href={item.buyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors mt-1 tracking-wide"
                        >
                          <ExternalLink size={10} />
                          View product
                        </a>
                      )}
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => removeFromCart.mutate({ itemId: entry.itemId })}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1 self-start mt-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer — total */}
        {items.length > 0 && (
          <div className="border-t border-border/40 px-6 py-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs tracking-widest uppercase text-muted-foreground">
                Total value
              </span>
              <span className="font-serif text-2xl">{formatCurrency(total)}</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs tracking-widest uppercase"
                onClick={() => {
                  // Clear all
                  cartEntries.forEach((entry: any) =>
                    removeFromCart.mutate({ itemId: entry.itemId })
                  );
                }}
              >
                Clear all
              </Button>
              {/* If any item has a buyUrl, open the first one */}
              {items.find((i: any) => i.buyUrl) && (
                <Button
                  size="sm"
                  className="flex-1 text-xs tracking-widest uppercase gap-1.5"
                  onClick={() => {
                    const withUrl = items.filter((i: any) => i.buyUrl);
                    withUrl.forEach((i: any) => window.open(i.buyUrl, "_blank"));
                  }}
                >
                  <ExternalLink size={12} />
                  Shop all
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
