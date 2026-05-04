import { useMemo, useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useParams } from "wouter";
import { MapPin, Calendar, Sun, Cloud, CloudRain, CloudSnow, CloudLightning, Wind, Shirt, X, ChevronLeft, ChevronRight } from "lucide-react";

function formatDate(ts: number | Date) {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function daysBetween(start: Date, end: Date) {
  const days: Date[] = [];
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const endD = new Date(end);
  endD.setHours(0, 0, 0, 0);
  while (cur <= endD) { days.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }
  return days;
}
function WeatherIcon({ icon, className = "w-4 h-4" }: { icon: string; className?: string }) {
  if (icon === "sunny" || icon === "mostly-sunny") return <Sun className={className + " text-yellow-400"} />;
  if (icon === "rainy" || icon === "heavy-rain" || icon === "drizzle") return <CloudRain className={className + " text-blue-400"} />;
  if (icon === "snowy") return <CloudSnow className={className + " text-blue-200"} />;
  if (icon === "thunderstorm") return <CloudLightning className={className + " text-purple-400"} />;
  if (icon === "windy") return <Wind className={className + " text-gray-400"} />;
  return <Cloud className={className + " text-gray-400"} />;
}

// ── Lightbox ──────────────────────────────────────────────────────────────────
interface LightboxImage { url: string; outfitName: string | null; slotLabel: string; dayLabel: string; }
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
          <p className="text-white/50 text-[10px] tracking-[0.15em] uppercase">{current.slotLabel} · {current.dayLabel}</p>
          {current.outfitName && <p className="text-white text-[13px] tracking-wide mt-1">{current.outfitName}</p>}
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

// ── Outfit mini-grid ──────────────────────────────────────────────────────────
function OutfitMini({
  label, images, outfitName, onImageClick,
}: {
  label: string;
  images: string[];
  outfitName: string | null;
  onImageClick: (imgIdx: number) => void;
}) {
  return (
    <div>
      <p className="text-[8px] tracking-[0.2em] uppercase text-[#ACABAB] mb-1">{label}</p>
      {images.length > 0 ? (
        <>
          <div className="flex gap-0.5 mb-1 flex-wrap">
            {images.slice(0, 3).map((url, i) => (
              <button key={i} onClick={() => onImageClick(i)} className="w-14 h-14 overflow-hidden bg-[#F0F0F0] hover:opacity-80 transition-opacity focus:outline-none focus:ring-1 focus:ring-black">
                <img src={url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
            {images.length > 3 && (
              <button onClick={() => onImageClick(3)} className="w-14 h-14 bg-[#F0F0F0] flex items-center justify-center hover:bg-[#E8E8E8] transition-colors">
                <span className="text-[10px] text-[#ACABAB]">+{images.length - 3}</span>
              </button>
            )}
          </div>
          {outfitName && (
            <div className="flex items-center gap-1 bg-[#F8F8F8] px-2 py-1">
              <Shirt className="w-3 h-3 text-[#ACABAB] shrink-0" />
              <span className="text-[10px] text-black truncate">{outfitName}</span>
            </div>
          )}
        </>
      ) : (
        <div className="border border-dashed border-[#DEDEDE] px-2 py-2 text-center">
          <p className="text-[9px] text-[#ACABAB]">None</p>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SharedTripPage() {
  const { token } = useParams<{ token: string }>();
  const { data: trip, isLoading: tripLoading } = trpc.travel.getShared.useQuery({ token: token ?? "" }, { enabled: !!token });
  const { data: days } = trpc.travel.getSharedDays.useQuery({ token: token ?? "" }, { enabled: !!token });

  // Build a flat list of all lightbox images across all days (outfit1 then outfit2 per day)
  const allImages = useMemo<LightboxImage[]>(() => {
    if (!days) return [];
    const result: LightboxImage[] = [];
    days.forEach(day => {
      const dayLabel = new Date(day.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      const imgs1: string[] = (day as any).outfitImages ?? [];
      const name1: string | null = (day as any).outfitName ?? null;
      imgs1.forEach(url => result.push({ url, outfitName: name1, slotLabel: "Day look", dayLabel }));
      const imgs2: string[] = (day as any).outfitImages2 ?? [];
      const name2: string | null = (day as any).outfitName2 ?? null;
      imgs2.forEach(url => result.push({ url, outfitName: name2, slotLabel: "Evening look", dayLabel }));
    });
    return result;
  }, [days]);

  // Per-day image offsets for lightbox global index
  const dayOffsets = useMemo(() => {
    if (!days) return { slot1: {} as Record<string, number>, slot2: {} as Record<string, number> };
    const slot1: Record<string, number> = {};
    const slot2: Record<string, number> = {};
    let offset = 0;
    days.forEach(day => {
      const key = new Date(day.date).toDateString();
      slot1[key] = offset;
      offset += ((day as any).outfitImages ?? []).length;
      slot2[key] = offset;
      offset += ((day as any).outfitImages2 ?? []).length;
    });
    return { slot1, slot2 };
  }, [days]);

  const [lightboxStart, setLightboxStart] = useState<number | null>(null);

  const tripDays = useMemo(() => {
    if (!trip) return [];
    return daysBetween(new Date(trip.startDate), new Date(trip.endDate));
  }, [trip]);

  type DayRow = NonNullable<typeof days>[number];
  const dayMap = useMemo(() => {
    const m: Record<string, DayRow> = {};
    days?.forEach(d => { m[new Date(d.date).toDateString()] = d; });
    return m;
  }, [days]);

  if (tripLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-[11px] tracking-[0.2em] uppercase text-[#ACABAB]">Loading trip...</p>
      </div>
    );
  }
  if (!trip) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-[11px] tracking-[0.2em] uppercase text-[#ACABAB] mb-2">Trip not found</p>
          <p className="text-[11px] text-[#ACABAB]">This link may have expired or been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {lightboxStart !== null && allImages.length > 0 && (
        <Lightbox images={allImages} startIndex={lightboxStart} onClose={() => setLightboxStart(null)} />
      )}

      {/* Brand header */}
      <div className="border-b border-[#DEDEDE] px-6 py-4 flex items-center justify-between">
        <img src="/manus-storage/style-iconoclast-logo-new_5932eaf0.jpeg" alt="Style Iconoclast" className="h-6 object-contain" />
        <span className="text-[9px] tracking-[0.15em] uppercase text-[#ACABAB] border border-[#DEDEDE] px-2 py-1">Shared Trip</span>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Cover photo */}
        {trip.coverImageUrl && (
          <div className="w-full h-56 overflow-hidden mb-6 relative">
            <img src={trip.coverImageUrl} alt={trip.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 flex items-end p-6">
              <h1 className="text-[28px] font-light tracking-wide uppercase text-white">{trip.name}</h1>
            </div>
          </div>
        )}
        {!trip.coverImageUrl && (
          <h1 className="text-[28px] font-light tracking-wide uppercase text-black mb-4">{trip.name}</h1>
        )}

        {/* Trip metadata */}
        <div className="flex flex-wrap gap-4 mb-6 pb-6 border-b border-[#DEDEDE]">
          <div className="flex items-center gap-1.5 text-[11px] text-[#5A5A5A]">
            <MapPin className="w-3.5 h-3.5 text-[#ACABAB]" />{trip.destination}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#5A5A5A]">
            <Calendar className="w-3.5 h-3.5 text-[#ACABAB]" />{formatDate(trip.startDate)} — {formatDate(trip.endDate)}
          </div>
          {trip.notes && <p className="w-full text-[11px] text-[#5A5A5A] italic">{trip.notes}</p>}
        </div>

        {/* Day cards */}
        <p className="text-[9px] tracking-[0.3em] uppercase text-[#ACABAB] mb-4">Day by Day</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tripDays.map((day, i) => {
            const existing = dayMap[day.toDateString()];
            const dateLabel = day.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
            const imgs1: string[] = (existing as any)?.outfitImages ?? [];
            const name1: string | null = (existing as any)?.outfitName ?? null;
            const imgs2: string[] = (existing as any)?.outfitImages2 ?? [];
            const name2: string | null = (existing as any)?.outfitName2 ?? null;
            const key = day.toDateString();
            const off1 = dayOffsets.slot1[key] ?? 0;
            const off2 = dayOffsets.slot2[key] ?? 0;
            const hasAnyOutfit = !!(existing?.outfitId || (existing as any)?.outfitId2);

            return (
              <div key={day.toISOString()} className="border border-[#DEDEDE] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[9px] tracking-[0.2em] uppercase text-[#ACABAB]">Day {i + 1}</p>
                    <p className="text-[12px] font-medium text-black">{dateLabel}</p>
                  </div>
                  {existing?.weatherTemp && (
                    <div className="flex items-center gap-1.5">
                      {existing.weatherIcon && <WeatherIcon icon={existing.weatherIcon} />}
                      <span className="text-[11px] text-[#5A5A5A]">{existing.weatherTemp}</span>
                    </div>
                  )}
                </div>

                {hasAnyOutfit ? (
                  <div className="grid grid-cols-2 gap-2">
                    <OutfitMini
                      label="Day look"
                      images={imgs1}
                      outfitName={name1}
                      onImageClick={idx => setLightboxStart(off1 + idx)}
                    />
                    <OutfitMini
                      label="Evening look"
                      images={imgs2}
                      outfitName={name2}
                      onImageClick={idx => setLightboxStart(off2 + idx)}
                    />
                  </div>
                ) : (
                  <div className="border border-dashed border-[#DEDEDE] px-3 py-2 text-center">
                    <p className="text-[10px] text-[#ACABAB]">No outfit assigned</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-[#DEDEDE] flex items-center justify-center">
          <img src="/manus-storage/style-iconoclast-logo-new_5932eaf0.jpeg" alt="Style Iconoclast" className="h-5 object-contain opacity-60" />
        </div>
      </div>
    </div>
  );
}
