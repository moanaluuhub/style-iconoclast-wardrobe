import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useParams } from "wouter";
import { MapPin, Calendar, Sun, Cloud, CloudRain, CloudSnow, CloudLightning, Wind, Shirt } from "lucide-react";

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

export default function SharedTripPage() {
  const { token } = useParams<{ token: string }>();
  const { data: trip, isLoading: tripLoading } = trpc.travel.getShared.useQuery({ token: token ?? "" }, { enabled: !!token });
  const { data: days } = trpc.travel.getSharedDays.useQuery({ token: token ?? "" }, { enabled: !!token });
  const { data: outfits } = trpc.outfits.list.useQuery(undefined, { enabled: false });

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
      {/* Brand header */}
      <div className="border-b border-[#DEDEDE] px-6 py-4 flex items-center justify-between">
        <span className="text-[13px] tracking-[0.3em] uppercase font-light">Style Iconoclast</span>
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

        {/* Trip info */}
        {!trip.coverImageUrl && (
          <h1 className="text-[28px] font-light tracking-wide uppercase text-black mb-4">{trip.name}</h1>
        )}
        <div className="flex flex-wrap gap-4 mb-6 pb-6 border-b border-[#DEDEDE]">
          <div className="flex items-center gap-1.5 text-[11px] text-[#5A5A5A]">
            <MapPin className="w-3.5 h-3.5 text-[#ACABAB]" />
            {trip.destination}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#5A5A5A]">
            <Calendar className="w-3.5 h-3.5 text-[#ACABAB]" />
            {formatDate(trip.startDate)} — {formatDate(trip.endDate)}
          </div>
          {trip.notes && <p className="w-full text-[11px] text-[#5A5A5A] italic">{trip.notes}</p>}
        </div>

        {/* Day cards */}
        <p className="text-[9px] tracking-[0.3em] uppercase text-[#ACABAB] mb-4">Day by Day</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tripDays.map((day, i) => {
            const existing = dayMap[day.toDateString()];
            const dateLabel = day.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
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
                {existing?.outfitId ? (
                  <div className="flex items-center gap-2 bg-[#F8F8F8] px-3 py-2">
                    <Shirt className="w-3.5 h-3.5 text-[#ACABAB]" />
                    <span className="text-[11px] text-black">Outfit planned</span>
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
      </div>
    </div>
  );
}
