import { useState, useEffect, useCallback } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { X, ChevronLeft, ChevronRight, Shirt } from "lucide-react";

// ── Lightbox ──────────────────────────────────────────────────────────────────
interface LightboxImage { url: string; label: string; brand?: string | null; }
function Lightbox({ images, startIndex, onClose }: { images: LightboxImage[]; startIndex: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIndex);
  const current = images[idx];
  const prev = useCallback(() => setIdx(i => (i - 1 + images.length) % images.length), [images.length]);
  const next = useCallback(() => setIdx(i => (i + 1) % images.length), [images.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, prev, next]);

  if (!current) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors">
        <X className="w-6 h-6" />
      </button>
      {images.length > 1 && (
        <button onClick={e => { e.stopPropagation(); prev(); }} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors bg-black/30 rounded-full p-2">
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}
      <div className="flex flex-col items-center gap-4 px-16" onClick={e => e.stopPropagation()}>
        <img src={current.url} alt="" className="max-h-[80vh] max-w-[80vw] object-contain" />
        <div className="text-center">
          {current.brand && <p className="text-white/50 text-[10px] tracking-[0.15em] uppercase mb-1">{current.brand}</p>}
          <p className="text-white text-[13px] tracking-wide">{current.label}</p>
          {images.length > 1 && <p className="text-white/30 text-[10px] mt-1">{idx + 1} / {images.length}</p>}
        </div>
      </div>
      {images.length > 1 && (
        <button onClick={e => { e.stopPropagation(); next(); }} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors bg-black/30 rounded-full p-2">
          <ChevronRight className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SharedOutfitPage() {
  const { token } = useParams<{ token: string }>();
  const { data: outfit, isLoading, error } = trpc.outfits.getShared.useQuery(
    { token: token ?? "" },
    { enabled: !!token }
  );

  const [lightboxStart, setLightboxStart] = useState<number | null>(null);

  // Build flat list of all images with metadata
  const allImages: LightboxImage[] = (outfit?.items ?? [])
    .filter((i: any) => i.item?.imageUrl)
    .map((i: any) => ({
      url: i.item.imageUrl as string,
      label: i.item.title ?? "",
      brand: i.item.brand,
    }));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-[11px] tracking-[0.2em] uppercase text-[#ACABAB]">Loading outfit...</p>
      </div>
    );
  }

  if (error || !outfit) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-[11px] tracking-[0.2em] uppercase text-[#ACABAB] mb-2">Outfit not found</p>
          <p className="text-[11px] text-[#ACABAB]">This link may have expired or been removed.</p>
        </div>
      </div>
    );
  }

  const items: any[] = outfit.items ?? [];

  return (
    <div className="min-h-screen bg-white">
      {lightboxStart !== null && allImages.length > 0 && (
        <Lightbox images={allImages} startIndex={lightboxStart} onClose={() => setLightboxStart(null)} />
      )}

      {/* Brand header — identical to SharedTripPage */}
      <div className="border-b border-[#DEDEDE] px-6 py-4 flex items-center justify-between">
        <img src="/manus-storage/style-iconoclast-logo-new_5932eaf0.jpeg" alt="Style Iconoclast" className="h-6 object-contain" />
        <span className="text-[9px] tracking-[0.15em] uppercase text-[#ACABAB] border border-[#DEDEDE] px-2 py-1">Shared Look</span>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Outfit title */}
        <h1 className="text-[28px] font-light tracking-wide uppercase text-black mb-4">{outfit.name}</h1>

        {/* Outfit metadata */}
        <div className="flex flex-wrap gap-4 mb-6 pb-6 border-b border-[#DEDEDE]">
          {outfit.season && (
            <span className="text-[11px] text-[#5A5A5A] border border-[#DEDEDE] px-2 py-0.5 tracking-wide">{outfit.season}</span>
          )}
          {(outfit as any).occasion && (
            <span className="text-[11px] text-[#5A5A5A]">{(outfit as any).occasion}</span>
          )}
          {outfit.totalPrice != null && outfit.totalPrice > 0 && (
            <span className="text-[11px] text-[#5A5A5A]">USD {outfit.totalPrice.toLocaleString()}</span>
          )}
          <span className="text-[11px] text-[#ACABAB]">{items.length} {items.length === 1 ? "piece" : "pieces"}</span>
          {(outfit as any).notes && (
            <p className="w-full text-[11px] text-[#5A5A5A] italic">{(outfit as any).notes}</p>
          )}
        </div>

        {/* Item grid — same card style as OutfitMini in SharedTripPage */}
        <p className="text-[9px] tracking-[0.3em] uppercase text-[#ACABAB] mb-4">Pieces</p>
        {items.length === 0 ? (
          <div className="border border-dashed border-[#DEDEDE] px-3 py-6 text-center">
            <p className="text-[10px] text-[#ACABAB]">No items in this outfit</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {items.map((oi: any, idx: number) => {
              const item = oi.item;
              if (!item) return null;
              const imgIdx = allImages.findIndex(img => img.url === item.imageUrl);
              return (
                <div key={oi.id ?? idx} className="border border-[#DEDEDE]">
                  <button
                    onClick={() => imgIdx >= 0 && setLightboxStart(imgIdx)}
                    className="w-full focus:outline-none group"
                    disabled={imgIdx < 0}
                  >
                    <div className="aspect-square bg-[#F5F5F5] overflow-hidden">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.title ?? ""}
                          className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Shirt className="w-8 h-8 text-[#DEDEDE]" />
                        </div>
                      )}
                    </div>
                  </button>
                  <div className="px-2 py-1.5">
                    <p className="text-[8px] tracking-[0.2em] uppercase text-[#ACABAB] mb-0.5">{oi.slot}</p>
                    {item.brand && (
                      <p className="text-[9px] tracking-[0.12em] uppercase text-black font-medium leading-tight">{item.brand}</p>
                    )}
                    <p className="text-[10px] text-[#323232] leading-snug line-clamp-2">{item.title}</p>
                    {item.currentPrice != null && (
                      <p className="text-[10px] text-[#ACABAB] mt-0.5">{item.currency ?? "USD"} {item.currentPrice.toLocaleString()}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer — identical to SharedTripPage */}
        <div className="mt-12 pt-6 border-t border-[#DEDEDE] flex items-center justify-center">
          <img src="/manus-storage/style-iconoclast-logo-new_5932eaf0.jpeg" alt="Style Iconoclast" className="h-5 object-contain opacity-60" />
        </div>
      </div>
    </div>
  );
}
