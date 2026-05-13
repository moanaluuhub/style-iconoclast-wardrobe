"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";

export default function SharedOutfitPage() {
  const { token } = useParams() as { token: string };
  const { data: outfit, isLoading, error } = trpc.outfits.getShared.useQuery(
    { token: token ?? "" },
    { enabled: !!token }
  );

  // Lightbox state
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const images: { url: string; label: string; brand?: string | null }[] = (outfit?.items ?? [])
    .filter((i: any) => i.item?.imageUrl)
    .map((i: any) => ({
      url: i.item.imageUrl as string,
      label: i.item.title ?? "",
      brand: i.item.brand,
    }));

  const closeLightbox = useCallback(() => setLightboxIdx(null), []);
  const prevImage = useCallback(() => setLightboxIdx((idx) => (idx !== null ? (idx - 1 + images.length) % images.length : null)), [images.length]);
  const nextImage = useCallback(() => setLightboxIdx((idx) => (idx !== null ? (idx + 1) % images.length : null)), [images.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (lightboxIdx === null) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") prevImage();
      if (e.key === "ArrowRight") nextImage();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxIdx, closeLightbox, prevImage, nextImage]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-[11px] tracking-[0.2em] uppercase text-[#ACABAB]">Loading…</div>
      </div>
    );
  }

  if (error || !outfit) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <p className="text-[13px] tracking-[0.15em] uppercase text-[#5A5A5A]">This outfit is no longer available.</p>
        <a href="/" className="text-[11px] tracking-[0.2em] uppercase text-black underline underline-offset-4">
          Go to Style Iconoclast
        </a>
      </div>
    );
  }

  const items: any[] = outfit.items ?? [];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-[#EDEDED] px-6 py-4 flex items-center justify-between">
        <a href="/" className="font-serif text-[15px] tracking-[0.25em] uppercase text-black">
          Style Iconoclast
        </a>
        <span className="text-[10px] tracking-[0.18em] uppercase text-[#ACABAB]">Shared Look</span>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {/* Outfit meta */}
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-normal text-black leading-tight mb-2">{outfit.name}</h1>
          <div className="flex flex-wrap items-center gap-4 text-[11px] tracking-[0.14em] uppercase text-[#ACABAB]">
            {outfit.season && <span>{outfit.season}</span>}
            {outfit.occasion && <span>{outfit.occasion}</span>}
            {outfit.totalPrice != null && outfit.totalPrice > 0 && (
              <span>USD {outfit.totalPrice.toLocaleString()}</span>
            )}
            <span>{items.length} {items.length === 1 ? "piece" : "pieces"}</span>
          </div>
          {(outfit as any).notes && (
            <p className="mt-3 text-[13px] text-[#5A5A5A] leading-relaxed">{(outfit as any).notes}</p>
          )}
        </div>

        {/* Item grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-[#EDEDED]">
          {items.map((oi: any, idx: number) => {
            const item = oi.item;
            if (!item) return null;
            const imgIdx = images.findIndex((img) => img.url === item.imageUrl);
            return (
              <button
                key={oi.id ?? idx}
                onClick={() => imgIdx >= 0 && setLightboxIdx(imgIdx)}
                className="group bg-white overflow-hidden text-left focus:outline-none"
              >
                <div className="aspect-square bg-[#F5F5F5] overflow-hidden relative">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.title ?? ""}
                      className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="font-serif text-4xl text-[#DEDEDE]">{item.title?.[0]}</span>
                    </div>
                  )}
                  {imgIdx >= 0 && (
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 text-white text-[10px] tracking-[0.2em] uppercase transition-opacity duration-200">View</span>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-[9px] tracking-[0.18em] uppercase text-[#ACABAB] mb-0.5">{oi.slot}</p>
                  {item.brand && (
                    <p className="text-[10px] tracking-[0.12em] uppercase text-black font-medium mb-0.5">{item.brand}</p>
                  )}
                  <p className="text-[12px] text-[#323232] leading-snug line-clamp-2">{item.title}</p>
                  {item.currentPrice != null && (
                    <p className="text-[11px] text-[#ACABAB] mt-1">{item.currency ?? "USD"} {item.currentPrice.toLocaleString()}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {items.length === 0 && (
          <div className="text-center py-16">
            <p className="text-[12px] tracking-[0.15em] uppercase text-[#ACABAB]">No items in this outfit</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#EDEDED] px-6 py-6 mt-12 text-center">
        <a href="/" className="font-serif text-[13px] tracking-[0.2em] uppercase text-[#ACABAB] hover:text-black transition-colors">
          Style Iconoclast
        </a>
      </footer>

      {/* Lightbox */}
      {lightboxIdx !== null && images[lightboxIdx] && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Prev */}
          {images.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); prevImage(); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-3xl w-10 h-10 flex items-center justify-center"
            >
              ‹
            </button>
          )}
          {/* Image */}
          <div
            className="relative max-w-2xl w-full mx-16 flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={images[lightboxIdx].url}
              alt={images[lightboxIdx].label}
              className="max-h-[75vh] w-full object-contain"
            />
            <div className="mt-4 text-center">
              {images[lightboxIdx].brand && (
                <p className="text-[10px] tracking-[0.2em] uppercase text-white/50 mb-1">{images[lightboxIdx].brand}</p>
              )}
              <p className="text-[13px] text-white/80">{images[lightboxIdx].label}</p>
              <p className="text-[10px] text-white/40 mt-1">{lightboxIdx + 1} / {images.length}</p>
            </div>
          </div>
          {/* Next */}
          {images.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); nextImage(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-3xl w-10 h-10 flex items-center justify-center"
            >
              ›
            </button>
          )}
          {/* Close */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
