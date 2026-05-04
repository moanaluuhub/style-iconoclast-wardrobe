import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { ShoppingBag, ExternalLink, Loader2, Lock } from "lucide-react";

export default function SharedWishlistPage() {
  const params = useParams<{ ownerId: string }>();
  const ownerId = parseInt(params.ownerId ?? "0", 10);
  const { isAuthenticated, loading: authLoading } = useAuth();

  const { data, isLoading, error } = trpc.collaborators.ownerWishlist.useQuery(
    { ownerId },
    { enabled: isAuthenticated && ownerId > 0 }
  );

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-[#ACABAB]" size={24} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <Lock className="mx-auto mb-4 text-[#ACABAB]" size={40} />
          <h2 className="text-xl font-light tracking-wide text-black mb-2">Access Denied</h2>
          <p className="text-[12px] text-[#5A5A5A]">
            {error?.message ?? "You don't have permission to view this wishlist."}
          </p>
        </div>
      </div>
    );
  }

  const { ownerName, items } = data;

  return (
    <div className="container py-10">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[10px] tracking-[0.18em] uppercase text-[#5A5A5A] mb-1">Shared Wishlist</p>
        <h1 className="text-2xl font-light tracking-wide text-black">{ownerName}'s Wishlist</h1>
        <p className="text-[11px] text-[#ACABAB] mt-1">{items.length} piece{items.length !== 1 ? "s" : ""}</p>
      </div>

      {items.length === 0 ? (
        <div className="border border-dashed border-[#DEDEDE] py-20 text-center">
          <ShoppingBag size={32} className="mx-auto mb-3 text-[#DEDEDE]" />
          <p className="text-[11px] text-[#ACABAB] tracking-wide">No wishlist items yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {(items as any[]).map((item) => (
            <div key={item.id} className="border border-[#DEDEDE] group flex flex-col">
              {/* Image */}
              <div className="aspect-[3/4] bg-[#F5F5F5] overflow-hidden relative">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShoppingBag size={24} className="text-[#DEDEDE]" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-3 flex flex-col gap-1 flex-1">
                <p className="text-[9px] tracking-[0.12em] uppercase text-[#ACABAB]">{item.brand ?? "—"}</p>
                <p className="text-[11px] font-medium text-black leading-snug line-clamp-2">{item.title}</p>
                {item.price != null && item.price > 0 && (
                  <p className="text-[11px] text-[#5A5A5A] mt-auto pt-1">
                    {item.currency ?? "USD"} {Number(item.price).toLocaleString()}
                  </p>
                )}
                {item.buyUrl && (
                  <a
                    href={item.buyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 flex items-center justify-center gap-1 border border-[#DEDEDE] text-[9px] tracking-[0.1em] uppercase py-1.5 text-[#5A5A5A] hover:border-black hover:text-black transition-colors"
                  >
                    <ExternalLink size={9} />
                    Shop
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
