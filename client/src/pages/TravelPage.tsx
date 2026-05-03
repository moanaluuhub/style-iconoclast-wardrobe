import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import {
  MapPin, Calendar, Plus, Trash2, ChevronLeft, ChevronRight,
  Cloud, Sun, CloudRain, CloudSnow, CloudLightning, Wind, Droplets,
  CheckSquare, Square, X, Edit2, Luggage, Shirt
} from "lucide-react";
import { toast } from "sonner";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(ts: number | Date) {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function daysBetween(start: Date, end: Date) {
  const days: Date[] = [];
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const endD = new Date(end);
  endD.setHours(0, 0, 0, 0);
  while (cur <= endD) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}
function WeatherIcon({ icon, className = "w-4 h-4" }: { icon: string; className?: string }) {
  if (icon === "sunny" || icon === "mostly-sunny") return <Sun className={className + " text-yellow-400"} />;
  if (icon === "rainy" || icon === "heavy-rain" || icon === "drizzle") return <CloudRain className={className + " text-blue-400"} />;
  if (icon === "snowy" || icon === "heavy-snow") return <CloudSnow className={className + " text-blue-200"} />;
  if (icon === "stormy") return <CloudLightning className={className + " text-purple-400"} />;
  if (icon === "foggy") return <Wind className={className + " text-gray-400"} />;
  return <Cloud className={className + " text-gray-400"} />;
}

// ─── Create Trip Modal ────────────────────────────────────────────────────────
function CreateTripModal({ onClose }: { onClose: () => void }) {
  const utils = trpc.useUtils();
  const createTrip = trpc.travel.create.useMutation({
    onSuccess: () => { utils.travel.list.invalidate(); onClose(); toast.success("Trip created"); },
    onError: () => toast.error("Failed to create trip"),
  });
  const [name, setName] = useState("");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !destination || !startDate || !endDate) return;
    createTrip.mutate({
      name, destination,
      startDate: new Date(startDate).getTime(),
      endDate: new Date(endDate).getTime(),
      notes: notes || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white w-full max-w-md p-8 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-[#ACABAB] hover:text-black"><X className="w-4 h-4" /></button>
        <p className="text-[9px] tracking-[0.3em] uppercase text-[#ACABAB] mb-2">New Trip</p>
        <h2 className="text-[18px] font-light tracking-wide uppercase text-black mb-6">Plan your journey</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[9px] tracking-[0.2em] uppercase text-[#ACABAB] block mb-1">Trip name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Tokyo Winter 2025" required
              className="w-full border border-[#DEDEDE] px-3 py-2 text-[12px] focus:outline-none focus:border-black" />
          </div>
          <div>
            <label className="text-[9px] tracking-[0.2em] uppercase text-[#ACABAB] block mb-1">Destination *</label>
            <input value={destination} onChange={e => setDestination(e.target.value)} placeholder="Tokyo, Japan" required
              className="w-full border border-[#DEDEDE] px-3 py-2 text-[12px] focus:outline-none focus:border-black" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] tracking-[0.2em] uppercase text-[#ACABAB] block mb-1">Start date *</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required
                className="w-full border border-[#DEDEDE] px-3 py-2 text-[12px] focus:outline-none focus:border-black" />
            </div>
            <div>
              <label className="text-[9px] tracking-[0.2em] uppercase text-[#ACABAB] block mb-1">End date *</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required
                className="w-full border border-[#DEDEDE] px-3 py-2 text-[12px] focus:outline-none focus:border-black" />
            </div>
          </div>
          <div>
            <label className="text-[9px] tracking-[0.2em] uppercase text-[#ACABAB] block mb-1">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="I'm so excited!!" rows={2}
              className="w-full border border-[#DEDEDE] px-3 py-2 text-[12px] focus:outline-none focus:border-black resize-none" />
          </div>
          <button type="submit" disabled={createTrip.isPending}
            className="w-full bg-black text-white text-[10px] tracking-[0.22em] uppercase py-3 hover:bg-[#222] transition-colors disabled:opacity-50">
            {createTrip.isPending ? "Creating..." : "Create Trip"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Outfit Picker Modal ──────────────────────────────────────────────────────
function OutfitPickerModal({
  onSelect, onClose,
}: {
  onSelect: (outfitId: number | null) => void;
  onClose: () => void;
}) {
  const { data: outfits } = trpc.outfits.list.useQuery();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white w-full max-w-lg p-6 relative max-h-[80vh] flex flex-col">
        <button onClick={onClose} className="absolute top-4 right-4 text-[#ACABAB] hover:text-black"><X className="w-4 h-4" /></button>
        <p className="text-[9px] tracking-[0.3em] uppercase text-[#ACABAB] mb-4">Select Outfit</p>
        <button onClick={() => { onSelect(null); onClose(); }}
          className="mb-3 text-[10px] tracking-[0.15em] uppercase text-[#ACABAB] hover:text-black border border-[#DEDEDE] px-3 py-2 text-left">
          Clear outfit
        </button>
        <div className="overflow-y-auto flex-1 space-y-2">
          {outfits?.map(o => (
            <button key={o.id} onClick={() => { onSelect(o.id); onClose(); }}
              className="w-full text-left border border-[#DEDEDE] hover:border-black px-4 py-3 transition-colors">
              <p className="text-[12px] font-medium text-black">{o.name}</p>
              {o.season && <p className="text-[10px] text-[#ACABAB] mt-0.5">{o.season}</p>}
            </button>
          ))}
          {!outfits?.length && (
            <p className="text-[11px] text-[#ACABAB] text-center py-8">No outfits yet. Build some looks first.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Day Card ─────────────────────────────────────────────────────────────────
function DayCard({
  tripId, day, dayIndex, existingDay, outfits,
}: {
  tripId: number;
  day: Date;
  dayIndex: number;
  existingDay?: { id: number; outfitId: number | null; weatherTemp: string | null; weatherDesc: string | null; weatherIcon: string | null; notes: string | null };
  outfits: Array<{ id: number; name: string; season: string | null; items?: Array<{ item: { imageUrl: string | null } | null }> }>;
}) {
  const utils = trpc.useUtils();
  const [showPicker, setShowPicker] = useState(false);
  const setDayOutfit = trpc.travel.setDayOutfit.useMutation({
    onSuccess: () => utils.travel.getDays.invalidate({ tripId }),
  });
  const { data: weather, isLoading: weatherLoading } = trpc.travel.fetchWeather.useQuery(
    { destination: "", date: day.getTime() },
    { enabled: false }
  );
  const outfit = outfits.find(o => o.id === existingDay?.outfitId);
  const dateLabel = day.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  return (
    <>
      <div className="border border-[#DEDEDE] p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[9px] tracking-[0.2em] uppercase text-[#ACABAB]">Day {dayIndex + 1}</p>
            <p className="text-[12px] font-medium text-black">{dateLabel}</p>
          </div>
          {existingDay?.weatherTemp && (
            <div className="flex items-center gap-1.5">
              {existingDay.weatherIcon && <WeatherIcon icon={existingDay.weatherIcon} />}
              <span className="text-[11px] text-[#5A5A5A]">{existingDay.weatherTemp}</span>
            </div>
          )}
        </div>
        {outfit ? (
          <div className="mb-2">
            {/* Outfit thumbnails */}
            {outfit.items && outfit.items.length > 0 ? (
              <div className="flex gap-1 mb-1.5">
                {outfit.items.slice(0, 4).map((oi, idx) => (
                  oi.item?.imageUrl ? (
                    <img key={idx} src={oi.item.imageUrl} alt="" className="w-10 h-10 object-cover bg-[#F0F0F0]" />
                  ) : (
                    <div key={idx} className="w-10 h-10 bg-[#F0F0F0] flex items-center justify-center">
                      <Shirt className="w-3 h-3 text-[#DEDEDE]" />
                    </div>
                  )
                ))}
                {outfit.items.length > 4 && (
                  <div className="w-10 h-10 bg-[#F0F0F0] flex items-center justify-center">
                    <span className="text-[9px] text-[#ACABAB]">+{outfit.items.length - 4}</span>
                  </div>
                )}
              </div>
            ) : null}
            <div className="flex items-center gap-2 bg-[#F8F8F8] px-3 py-1.5">
              <span className="text-[11px] text-black flex-1 truncate">{outfit.name}</span>
              {outfit.season && <span className="text-[9px] text-[#ACABAB]">{outfit.season}</span>}
            </div>
          </div>
        ) : (
          <div className="border border-dashed border-[#DEDEDE] px-3 py-2 mb-2 text-center">
            <p className="text-[10px] text-[#ACABAB]">No outfit assigned</p>
          </div>
        )}
        <button
          onClick={() => setShowPicker(true)}
          className="w-full text-[9px] tracking-[0.15em] uppercase text-[#ACABAB] hover:text-black border border-[#DEDEDE] hover:border-black py-1.5 transition-colors"
        >
          {outfit ? "Change outfit" : "Assign outfit"}
        </button>
      </div>
      {showPicker && (
        <OutfitPickerModal
          onSelect={(outfitId) => {
            setDayOutfit.mutate({ tripId, date: day.getTime(), outfitId });
          }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  );
}

// ─── Trip Detail View ─────────────────────────────────────────────────────────
function TripDetail({ tripId, onBack }: { tripId: number; onBack: () => void }) {
  const utils = trpc.useUtils();
  const { data: trip } = trpc.travel.getById.useQuery({ tripId });
  const { data: days } = trpc.travel.getDays.useQuery({ tripId });
  const { data: outfits } = trpc.outfits.list.useQuery();
  const { data: packingList } = trpc.travel.getPackingItems.useQuery({ tripId });
  const [newItem, setNewItem] = useState("");
  const [activeTab, setActiveTab] = useState<"outfits" | "checklist">("outfits");
  const [coverUrlInput, setCoverUrlInput] = useState("");
  const [showCoverInput, setShowCoverInput] = useState(false);
  const fetchWeatherBulk = trpc.travel.fetchWeatherBulk.useMutation({
    onSuccess: () => utils.travel.getDays.invalidate({ tripId }),
  });
  // Auto-fetch weather when trip opens
  useEffect(() => {
    if (!trip) return;
    fetchWeatherBulk.mutate({
      tripId,
      destination: trip.destination,
      startDate: new Date(trip.startDate).getTime(),
      endDate: new Date(trip.endDate).getTime(),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip?.id]);
  const updateTripMutation = trpc.travel.update.useMutation({
    onSuccess: () => utils.travel.getById.invalidate({ tripId }),
  });
  const generateShare = trpc.travel.generateShareLink.useMutation({
    onSuccess: ({ token }) => {
      const url = `${window.location.origin}/trip/${token}`;
      navigator.clipboard.writeText(url).then(() => toast.success("Share link copied!")).catch(() => toast.info(`Share link: ${url}`));
    },
  });

  const addItem = trpc.travel.addPackingItem.useMutation({
    onSuccess: () => { utils.travel.getPackingItems.invalidate({ tripId }); setNewItem(""); },
  });
  const toggleItem = trpc.travel.togglePackingItem.useMutation({
    onSuccess: () => utils.travel.getPackingItems.invalidate({ tripId }),
  });
  const deleteItem = trpc.travel.deletePackingItem.useMutation({
    onSuccess: () => utils.travel.getPackingItems.invalidate({ tripId }),
  });

  const tripDays = useMemo(() => {
    if (!trip) return [];
    return daysBetween(new Date(trip.startDate), new Date(trip.endDate));
  }, [trip]);

  type DayRow = NonNullable<typeof days>[number];
  const dayMap = useMemo(() => {
    const m: Record<string, DayRow> = {};
    days?.forEach(d => {
      const key = new Date(d.date).toDateString();
      m[key] = d;
    });
    return m;
  }, [days]);

  if (!trip) return null;

  const checkedCount = packingList?.filter(i => i.checked).length ?? 0;
  const totalCount = packingList?.length ?? 0;

  return (
    <div>
      {/* Cover photo hero */}
      {trip.coverImageUrl ? (
        <div className="relative w-full h-52 mb-6 overflow-hidden group">
          <img src={trip.coverImageUrl} alt={trip.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40 flex items-end p-4">
            <div className="flex-1">
              <button onClick={onBack} className="text-white/70 hover:text-white transition-colors mb-2 flex items-center gap-1">
                <ChevronLeft className="w-4 h-4" />
                <span className="text-[9px] tracking-[0.2em] uppercase">Back</span>
              </button>
              <h1 className="text-[24px] font-light tracking-wide uppercase text-white">{trip.name}</h1>
            </div>
            <button
              onClick={() => setShowCoverInput(v => !v)}
              className="opacity-0 group-hover:opacity-100 text-white/70 hover:text-white transition-all text-[9px] tracking-[0.15em] uppercase border border-white/30 px-2 py-1"
            >
              Change photo
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack} className="text-[#ACABAB] hover:text-black transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <p className="text-[9px] tracking-[0.3em] uppercase text-[#ACABAB]">Trip</p>
            <h1 className="text-[22px] font-light tracking-wide uppercase text-black">{trip.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCoverInput(v => !v)}
              className="text-[9px] tracking-[0.15em] uppercase text-[#ACABAB] hover:text-black border border-[#DEDEDE] hover:border-black px-2 py-1 transition-colors"
            >
              + Cover photo
            </button>
            <button
              onClick={() => generateShare.mutate({ tripId })}
              disabled={generateShare.isPending}
              className="text-[9px] tracking-[0.15em] uppercase text-[#ACABAB] hover:text-black border border-[#DEDEDE] hover:border-black px-2 py-1 transition-colors disabled:opacity-50"
            >
              Share
            </button>
          </div>
        </div>
      )}
      {/* Cover photo URL input */}
      {showCoverInput && (
        <form
          className="flex gap-2 mb-4"
          onSubmit={e => {
            e.preventDefault();
            if (coverUrlInput.trim()) {
              updateTripMutation.mutate({ tripId, coverImageUrl: coverUrlInput.trim() });
              setShowCoverInput(false);
              setCoverUrlInput("");
            }
          }}
        >
          <input
            autoFocus
            value={coverUrlInput}
            onChange={e => setCoverUrlInput(e.target.value)}
            placeholder="Paste image URL for cover photo..."
            className="flex-1 border border-[#DEDEDE] px-3 py-2 text-[12px] focus:outline-none focus:border-black"
          />
          <button type="submit" className="bg-black text-white px-4 py-2 text-[10px] tracking-[0.15em] uppercase hover:bg-[#222] transition-colors">
            Set
          </button>
          <button type="button" onClick={() => setShowCoverInput(false)} className="border border-[#DEDEDE] px-3 py-2 text-[10px] text-[#ACABAB] hover:text-black transition-colors">
            Cancel
          </button>
        </form>
      )}
      {/* Trip meta */}
      <div className="flex flex-wrap gap-4 mb-6 pb-6 border-b border-[#DEDEDE]">
        <div className="flex items-center gap-1.5 text-[11px] text-[#5A5A5A]">
          <MapPin className="w-3.5 h-3.5 text-[#ACABAB]" />
          {trip.destination}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-[#5A5A5A]">
          <Calendar className="w-3.5 h-3.5 text-[#ACABAB]" />
          {formatDate(trip.startDate)} — {formatDate(trip.endDate)}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-[#5A5A5A]">
          <Luggage className="w-3.5 h-3.5 text-[#ACABAB]" />
          {tripDays.length} {tripDays.length === 1 ? "day" : "days"}
        </div>
        {trip.notes && (
          <p className="w-full text-[11px] text-[#5A5A5A] italic">{trip.notes}</p>
        )}
      </div>
      {/* Tabs */}
      <div className="flex border-b border-[#DEDEDE] mb-6">
        {(["outfits", "checklist"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-[10px] tracking-[0.2em] uppercase transition-colors ${activeTab === tab ? "border-b-2 border-black text-black" : "text-[#ACABAB] hover:text-black"}`}>
            {tab === "outfits" ? `Outfits ${tripDays.length}` : `Checklist ${totalCount > 0 ? `${checkedCount}/${totalCount}` : ""}`}
          </button>
        ))}
      </div>
      {/* Outfits tab */}
      {activeTab === "outfits" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tripDays.map((day, i) => (
            <DayCard
              key={day.toISOString()}
              tripId={tripId}
              day={day}
              dayIndex={i}
              existingDay={dayMap[day.toDateString()] as Parameters<typeof DayCard>[0]["existingDay"]}
              outfits={outfits ?? []}
            />
          ))}
        </div>
      )}
      {/* Checklist tab */}
      {activeTab === "checklist" && (
        <div className="max-w-md">
          {/* Packing templates */}
          {totalCount === 0 && (
            <div className="mb-4">
              <p className="text-[9px] tracking-[0.2em] uppercase text-[#ACABAB] mb-2">Quick start with a template</p>
              <div className="flex flex-wrap gap-2">
                {(["Weekend city break", "Beach holiday", "Business trip"] as const).map(tpl => {
                  const items: Record<string, string[]> = {
                    "Weekend city break": ["Passport / ID", "Phone charger", "2x tops", "1x trousers/jeans", "Shoes", "Jacket", "Toiletries", "Sunglasses"],
                    "Beach holiday": ["Swimwear", "Sunscreen SPF50+", "Sunglasses", "Beach towel", "Sandals", "Light cover-up", "Hat", "Toiletries", "Phone charger"],
                    "Business trip": ["Laptop + charger", "Passport / ID", "Business cards", "Suit / blazer", "Dress shirts", "Formal shoes", "Toiletries", "Phone charger"],
                  };
                  return (
                    <button key={tpl}
                      onClick={async () => {
                        for (const label of items[tpl]) {
                          await addItem.mutateAsync({ tripId, label });
                        }
                      }}
                      className="text-[9px] tracking-[0.15em] uppercase border border-[#DEDEDE] hover:border-black px-3 py-1.5 text-[#5A5A5A] hover:text-black transition-colors"
                    >
                      {tpl}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {/* Progress */}
          {totalCount > 0 && (
            <div className="mb-4">
              <div className="flex justify-between text-[9px] tracking-[0.15em] uppercase text-[#ACABAB] mb-1">
                <span>Packed</span><span>{checkedCount}/{totalCount}</span>
              </div>
              <div className="h-0.5 bg-[#DEDEDE]">
                <div className="h-0.5 bg-black transition-all" style={{ width: `${totalCount ? (checkedCount / totalCount) * 100 : 0}%` }} />
              </div>
            </div>
          )}
          {/* Add item */}
          <form onSubmit={e => { e.preventDefault(); if (newItem.trim()) addItem.mutate({ tripId, label: newItem.trim() }); }}
            className="flex gap-2 mb-4">
            <input value={newItem} onChange={e => setNewItem(e.target.value)} placeholder="Add item to pack..."
              className="flex-1 border border-[#DEDEDE] px-3 py-2 text-[12px] focus:outline-none focus:border-black" />
            <button type="submit" className="bg-black text-white px-4 py-2 text-[10px] tracking-[0.15em] uppercase hover:bg-[#222] transition-colors">
              Add
            </button>
          </form>
          {/* List */}
          <div className="space-y-1">
            {packingList?.map(item => (
              <div key={item.id} className="flex items-center gap-3 py-2 border-b border-[#F0F0F0] group">
                <button onClick={() => toggleItem.mutate({ itemId: item.id, checked: !item.checked })}
                  className="text-[#ACABAB] hover:text-black transition-colors shrink-0">
                  {item.checked ? <CheckSquare className="w-4 h-4 text-black" /> : <Square className="w-4 h-4" />}
                </button>
                <span className={`flex-1 text-[12px] ${item.checked ? "line-through text-[#ACABAB]" : "text-black"}`}>
                  {item.label}
                </span>
                <button onClick={() => deleteItem.mutate({ itemId: item.id })}
                  className="opacity-0 group-hover:opacity-100 text-[#ACABAB] hover:text-black transition-all">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {!packingList?.length && (
              <p className="text-[11px] text-[#ACABAB] text-center py-8">Your packing list is empty.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Trip Card ────────────────────────────────────────────────────────────────
function TripCard({
  trip, onOpen, onDelete,
}: {
  trip: { id: number; name: string; destination: string; startDate: Date; endDate: Date; notes: string | null; coverImageUrl?: string | null; totalDays?: number; outfitCount?: number };
  onOpen: () => void;
  onDelete: () => void;
}) {
  const days = trip.totalDays ?? daysBetween(new Date(trip.startDate), new Date(trip.endDate)).length;
  const outfitCount = trip.outfitCount ?? 0;
  const isPast = new Date(trip.endDate) < new Date();
  const isUpcoming = new Date(trip.startDate) > new Date();

  return (
    <div className="border border-[#DEDEDE] hover:border-black transition-colors cursor-pointer group" onClick={onOpen}>
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-[9px] tracking-[0.2em] uppercase text-[#ACABAB]">
                {isPast ? "Past" : isUpcoming ? "Upcoming" : "Ongoing"}
              </p>
            </div>
            <h3 className="text-[15px] font-light tracking-wide uppercase text-black truncate">{trip.name}</h3>
          </div>
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            className="opacity-0 group-hover:opacity-100 text-[#ACABAB] hover:text-black transition-all ml-2 shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-[#5A5A5A] mb-1">
          <MapPin className="w-3 h-3 text-[#ACABAB]" />
          {trip.destination}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-[#5A5A5A]">
          <Calendar className="w-3 h-3 text-[#ACABAB]" />
          {formatDate(trip.startDate)} — {formatDate(trip.endDate)}
          <span className="text-[#DEDEDE]">·</span>
          <span>{days}d</span>
        </div>
        {trip.notes && (
          <p className="text-[10px] text-[#ACABAB] mt-2 italic truncate">{trip.notes}</p>
        )}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#F0F0F0]">
          <span className="text-[9px] tracking-[0.15em] uppercase text-[#ACABAB]">
            {outfitCount}/{days} days planned
          </span>
          <div className="flex-1 h-px bg-[#EBEBEB]">
            <div className="h-px bg-black transition-all" style={{ width: `${days > 0 ? (outfitCount / days) * 100 : 0}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function TravelPage({ embedded = false, ..._ }: { embedded?: boolean; [key: string]: any }) {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const { data: trips, isLoading } = trpc.travel.list.useQuery();
  const deleteTrip = trpc.travel.delete.useMutation({
    onSuccess: () => utils.travel.list.invalidate(),
    onError: () => toast.error("Failed to delete trip"),
  });
  const [showCreate, setShowCreate] = useState(false);
  const [activeTripId, setActiveTripId] = useState<number | null>(null);

  if (!loading && !isAuthenticated) { navigate("/login"); return null; }

  if (activeTripId !== null) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <TripDetail tripId={activeTripId} onBack={() => setActiveTripId(null)} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[9px] tracking-[0.3em] uppercase text-[#ACABAB] mb-1">Travel Planner</p>
          <h1 className="text-[22px] font-light tracking-wide uppercase text-black">Your Trips</h1>
          {trips && <p className="text-[11px] text-[#ACABAB] mt-1">{trips.length} {trips.length === 1 ? "trip" : "trips"}</p>}
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-black text-white text-[10px] tracking-[0.2em] uppercase px-4 py-2.5 hover:bg-[#222] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          New Trip
        </button>
      </div>

      {/* Trip grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-32 bg-[#F8F8F8] animate-pulse" />)}
        </div>
      ) : trips?.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-[#DEDEDE]">
          <Luggage className="w-8 h-8 text-[#DEDEDE] mx-auto mb-4" />
          <p className="text-[13px] text-[#ACABAB] mb-1">No trips planned yet</p>
          <p className="text-[11px] text-[#DEDEDE] mb-6">Create your first trip to start planning outfits</p>
          <button onClick={() => setShowCreate(true)}
            className="bg-black text-white text-[10px] tracking-[0.2em] uppercase px-6 py-2.5 hover:bg-[#222] transition-colors">
            Plan a trip
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {trips?.map(trip => (
            <TripCard
              key={trip.id}
              trip={trip}
              onOpen={() => setActiveTripId(trip.id)}
              onDelete={() => {
                if (confirm(`Delete "${trip.name}"?`)) deleteTrip.mutate({ tripId: trip.id });
              }}
            />
          ))}
        </div>
      )}

      {showCreate && <CreateTripModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
