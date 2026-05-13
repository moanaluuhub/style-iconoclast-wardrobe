import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, Minus, Plus, Loader2, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area, AreaChart,
} from "recharts";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface PricePoint {
  id: number;
  price: number;
  currency: string | null;
  note: string | null;
  recordedAt: Date;
}

interface PriceTrackerProps {
  itemId: number;
  purchasePrice: number | null;
  currency?: string | null;
  onPriceUpdated?: () => void;
}

// ─── Custom Tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label, currency }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-black text-white px-3 py-2 text-[11px] space-y-0.5">
      <p className="text-[#ACABAB] tracking-wide">{label}</p>
      <p className="font-medium tracking-wide">
        {currency ?? "USD"} {Number(payload[0].value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
      </p>
      {payload[0].payload?.note && (
        <p className="text-[#ACABAB] italic">{payload[0].payload.note}</p>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function PriceTracker({ itemId, purchasePrice, currency = "USD", onPriceUpdated }: PriceTrackerProps) {
  const [logOpen, setLogOpen] = useState(false);
  const [newPrice, setNewPrice] = useState("");
  const [newNote, setNewNote] = useState("");

  const utils = trpc.useUtils();

  const { data: history = [], isLoading } = trpc.priceHistory.list.useQuery(
    { itemId },
    { enabled: !!itemId }
  );

  const addPrice = trpc.priceHistory.add.useMutation({
    onSuccess: () => {
      toast.success("Price logged");
      setNewPrice("");
      setNewNote("");
      setLogOpen(false);
      utils.priceHistory.list.invalidate({ itemId });
      utils.items.list.invalidate();
      onPriceUpdated?.();
    },
    onError: (e) => toast.error(e.message),
  });

  const pts = history as PricePoint[];
  const cur = currency ?? "USD";

  // Derived stats
  const latestPrice = pts.length > 0 ? pts[pts.length - 1].price : null;
  const firstPrice = pts.length > 0 ? pts[0].price : null;
  const gainVsPurchase = purchasePrice != null && latestPrice != null
    ? ((latestPrice - purchasePrice) / purchasePrice) * 100
    : null;
  const gainVsFirst = firstPrice != null && latestPrice != null && pts.length >= 2
    ? ((latestPrice - firstPrice) / firstPrice) * 100
    : null;
  const isUp = gainVsPurchase != null ? gainVsPurchase > 0 : gainVsFirst != null ? gainVsFirst > 0 : null;
  const isDown = gainVsPurchase != null ? gainVsPurchase < 0 : gainVsFirst != null ? gainVsFirst < 0 : null;

  // Chart data
  const chartData = [
    // Optionally include purchase price as the first point if we have it and it predates history
    ...(purchasePrice != null && pts.length === 0
      ? [{ date: "Purchase", price: purchasePrice, note: "Purchase price" }]
      : []),
    ...pts.map((p) => ({
      date: new Date(p.recordedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: pts.length > 8 ? "2-digit" : undefined }),
      price: p.price,
      note: p.note,
    })),
  ];

  // Include purchase price as reference line
  const allPrices = pts.map((p) => p.price);
  if (purchasePrice) allPrices.push(purchasePrice);
  const minPrice = allPrices.length > 0 ? Math.min(...allPrices) * 0.95 : 0;
  const maxPrice = allPrices.length > 0 ? Math.max(...allPrices) * 1.05 : 100;

  const handleSubmit = () => {
    const p = parseFloat(newPrice);
    if (!newPrice || isNaN(p) || p <= 0) {
      toast.error("Enter a valid price");
      return;
    }
    addPrice.mutate({ itemId, price: p, currency: cur, note: newNote || undefined });
  };

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] tracking-[0.18em] uppercase text-[#ACABAB] mb-1">Price Tracking</p>
          {latestPrice != null ? (
            <div className="flex items-baseline gap-3">
              <span className="text-[22px] font-light tracking-tight text-black">
                {cur} {latestPrice.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </span>
              {gainVsPurchase != null && (
                <span className={`flex items-center gap-1 text-[11px] font-medium ${isUp ? "text-emerald-700" : isDown ? "text-red-600" : "text-[#ACABAB]"}`}>
                  {isUp ? <TrendingUp size={12} /> : isDown ? <TrendingDown size={12} /> : <Minus size={12} />}
                  {gainVsPurchase > 0 ? "+" : ""}{gainVsPurchase.toFixed(1)}% vs paid
                </span>
              )}
            </div>
          ) : purchasePrice != null ? (
            <div className="flex items-baseline gap-2">
              <span className="text-[22px] font-light tracking-tight text-black">
                {cur} {purchasePrice.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-[#ACABAB] tracking-wide">purchase price</span>
            </div>
          ) : (
            <span className="text-[13px] text-[#ACABAB]">No price logged yet</span>
          )}
        </div>

        <button
          onClick={() => setLogOpen((o) => !o)}
          className={`flex items-center gap-1.5 text-[10px] tracking-[0.14em] uppercase font-medium px-3 py-2 border transition-colors ${logOpen ? "bg-black text-white border-black" : "border-[#DEDEDE] text-[#5A5A5A] hover:border-black hover:text-black"}`}
        >
          <Plus size={11} />
          Log price
        </button>
      </div>

      {/* Log price form */}
      {logOpen && (
        <div className="border border-[#DEDEDE] p-4 space-y-3 bg-[#FAFAFA]">
          <p className="text-[10px] tracking-[0.14em] uppercase text-[#5A5A5A]">Log current market / resale price</p>
          <div className="flex gap-2">
            <div className="flex items-center border border-[#DEDEDE] focus-within:border-black transition-colors">
              <span className="px-2 text-[11px] text-[#ACABAB] select-none">{cur}</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                className="w-28 h-8 text-[12px] bg-transparent outline-none pr-2 text-black placeholder:text-[#ACABAB]"
              />
            </div>
            <input
              type="text"
              placeholder="Note (e.g. Vestiaire listing)"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="flex-1 h-8 border border-[#DEDEDE] focus:border-black outline-none px-3 text-[12px] bg-transparent text-black placeholder:text-[#ACABAB] transition-colors"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={addPrice.isPending || !newPrice}
              className="flex items-center gap-1.5 bg-black text-white text-[10px] tracking-[0.14em] uppercase px-4 py-2 hover:bg-[#323232] transition-colors disabled:opacity-40"
            >
              {addPrice.isPending && <Loader2 size={10} className="animate-spin" />}
              Save
            </button>
            <button
              onClick={() => { setLogOpen(false); setNewPrice(""); setNewNote(""); }}
              className="text-[10px] tracking-[0.14em] uppercase text-[#5A5A5A] hover:text-black transition-colors px-3 py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Summary stats row */}
      {(purchasePrice != null || pts.length > 0) && (
        <div className="grid grid-cols-3 gap-3">
          {purchasePrice != null && (
            <div className="border border-[#EDEDED] p-3">
              <p className="text-[9px] tracking-[0.14em] uppercase text-[#ACABAB] mb-1">Paid</p>
              <p className="text-[13px] font-medium text-black">{cur} {purchasePrice.toLocaleString()}</p>
            </div>
          )}
          {latestPrice != null && (
            <div className="border border-[#EDEDED] p-3">
              <p className="text-[9px] tracking-[0.14em] uppercase text-[#ACABAB] mb-1">Current</p>
              <p className="text-[13px] font-medium text-black">{cur} {latestPrice.toLocaleString()}</p>
            </div>
          )}
          {gainVsPurchase != null && (
            <div className={`border p-3 ${isUp ? "border-emerald-200 bg-emerald-50" : isDown ? "border-red-100 bg-red-50" : "border-[#EDEDED]"}`}>
              <p className="text-[9px] tracking-[0.14em] uppercase text-[#ACABAB] mb-1">Gain / Loss</p>
              <p className={`text-[13px] font-medium flex items-center gap-1 ${isUp ? "text-emerald-700" : isDown ? "text-red-600" : "text-[#ACABAB]"}`}>
                {isUp ? <TrendingUp size={11} /> : isDown ? <TrendingDown size={11} /> : <Minus size={11} />}
                {gainVsPurchase > 0 ? "+" : ""}{gainVsPurchase.toFixed(1)}%
              </p>
            </div>
          )}
        </div>
      )}

      {/* Chart */}
      {isLoading ? (
        <div className="h-40 flex items-center justify-center">
          <Loader2 size={16} className="animate-spin text-[#ACABAB]" />
        </div>
      ) : chartData.length >= 2 ? (
        <div>
          <p className="text-[9px] tracking-[0.14em] uppercase text-[#ACABAB] mb-3">Price over time</p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#000000" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#000000" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#EDEDED" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: "#ACABAB", letterSpacing: "0.08em" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[minPrice, maxPrice]}
                tick={{ fontSize: 9, fill: "#ACABAB" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${cur} ${Number(v).toLocaleString()}`}
                width={72}
              />
              <Tooltip content={<CustomTooltip currency={cur} />} />
              {purchasePrice != null && (
                <ReferenceLine
                  y={purchasePrice}
                  stroke="#ACABAB"
                  strokeDasharray="4 3"
                  label={{ value: "Paid", position: "insideTopRight", fontSize: 9, fill: "#ACABAB" }}
                />
              )}
              <Area
                type="monotone"
                dataKey="price"
                stroke="#000000"
                strokeWidth={1.5}
                fill="url(#priceGrad)"
                dot={{ r: 3, fill: "#000000", strokeWidth: 0 }}
                activeDot={{ r: 4, fill: "#000000", strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : pts.length === 1 ? (
        <p className="text-[11px] text-[#ACABAB] text-center py-4">Log one more price point to see the chart</p>
      ) : null}

      {/* History log table */}
      {pts.length > 0 && (
        <div>
          <p className="text-[9px] tracking-[0.14em] uppercase text-[#ACABAB] mb-2">History</p>
          <div className="border border-[#EDEDED] divide-y divide-[#EDEDED]">
            {[...pts].reverse().map((p, i) => {
              const prev = pts[pts.length - 2 - i];
              const delta = prev ? ((p.price - prev.price) / prev.price) * 100 : null;
              return (
                <div key={p.id} className="flex items-center justify-between px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-[#ACABAB] w-20 shrink-0">
                      {new Date(p.recordedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                    <span className="text-[12px] font-medium text-black">
                      {cur} {p.price.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </span>
                    {p.note && (
                      <span className="text-[11px] text-[#ACABAB] italic truncate max-w-[120px]">{p.note}</span>
                    )}
                  </div>
                  {delta != null && (
                    <span className={`text-[10px] font-medium flex items-center gap-0.5 ${delta > 0 ? "text-emerald-700" : delta < 0 ? "text-red-600" : "text-[#ACABAB]"}`}>
                      {delta > 0 ? <TrendingUp size={10} /> : delta < 0 ? <TrendingDown size={10} /> : <Minus size={10} />}
                      {delta > 0 ? "+" : ""}{delta.toFixed(1)}%
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {pts.length === 0 && !isLoading && (
        <div className="text-center py-6 border border-dashed border-[#DEDEDE]">
          <p className="text-[11px] text-[#ACABAB] tracking-wide">No price points logged yet</p>
          <p className="text-[10px] text-[#DEDEDE] mt-1">Log the current market or resale value to start tracking</p>
        </div>
      )}
    </div>
  );
}
