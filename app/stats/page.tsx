"use client";

import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { getLoginUrl } from "@/lib/const";

const CHART_COLORS = [
  "#1A1A2E",
  "#C9A96E",
  "#8B6F47",
  "#4A7C59",
  "#7B5EA7",
  "#C75B5B",
  "#3A7CA5",
  "#D4845A",
  "#5B8C5A",
  "#9B6B9B",
];

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="border border-[#EDEDED] p-5">
      <p className="text-[9px] tracking-[0.14em] uppercase text-[#ACABAB] mb-3">{label}</p>
      <p className="text-[26px] font-light text-black leading-none">{value}</p>
      {sub && <p className="text-[11px] text-[#5A5A5A] mt-1.5">{sub}</p>}
    </div>
  );
}

export default function StatsPage() {
  const { isAuthenticated, loading } = useAuth();
  const { data: stats, isLoading } = trpc.stats.summary.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  if (loading) return null;

  if (!isAuthenticated) {
    return (
      <div className="container py-24 text-center">
        <p className="text-[13px] text-[#ACABAB] tracking-wide">Sign in to view statistics</p>
        <button
          onClick={() => (window.location.href = getLoginUrl())}
          className="mt-6 bg-black text-white text-[10px] tracking-[0.14em] uppercase px-8 py-3 hover:bg-[#323232] transition-colors"
        >
          Sign in
        </button>
      </div>
    );
  }

  if (isLoading || !stats) {
    return (
      <div className="container py-8">
        <h1 className="text-[11px] tracking-[0.22em] uppercase font-medium text-black mb-8">Style Index</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-[#F5F5F5] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8 border-b border-[#EDEDED] pb-6">
        <h1 className="text-[11px] tracking-[0.22em] uppercase font-medium text-black">Style Index</h1>
        <p className="text-[12px] text-[#ACABAB] mt-1 tracking-wide">
          An overview of your wardrobe
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatCard
          label="Total pieces"
          value={stats.totalItems.toString()}
          sub="in your wardrobe"
        />
        <StatCard
          label="Current value"
          value={formatCurrency(stats.totalValue)}
          sub="at market price"
        />
        <StatCard
          label="Purchase value"
          value={formatCurrency(stats.totalPurchaseValue)}
          sub="total spent"
        />
        <StatCard
          label="Avg cost / wear"
          value={formatCurrency(stats.costPerWear)}
          sub="across all items"
        />
      </div>

      {/* Charts row */}
      {stats.categoryBreakdown.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          {/* Pie chart */}
          <div className="border border-[#EDEDED] p-5">
            <p className="text-[9px] tracking-[0.14em] uppercase text-[#ACABAB] mb-4">
              Category breakdown
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={stats.categoryBreakdown}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={40}
                  paddingAngle={2}
                >
                  {stats.categoryBreakdown.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [value + " pieces", name]}
                  contentStyle={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: "11px",
                    background: "#FFFFFF",
                    border: "1px solid #EDEDED",
                    borderRadius: "0",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
              {stats.categoryBreakdown.map((entry, i) => (
                <div key={entry.name} className="flex items-center gap-1.5">
                  <div
                    className="w-2 h-2 flex-shrink-0"
                    style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                  />
                  <span className="text-[10px] text-[#5A5A5A] capitalize">{entry.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bar chart — value by category */}
          <div className="border border-[#EDEDED] p-5">
            <p className="text-[9px] tracking-[0.14em] uppercase text-[#ACABAB] mb-4">
              Value by category
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={stats.categoryBreakdown}
                margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 9, fontFamily: "Inter", fill: "#ACABAB" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 9, fontFamily: "Inter", fill: "#ACABAB" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), "Value"]}
                  contentStyle={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: "11px",
                    background: "#FFFFFF",
                    border: "1px solid #EDEDED",
                    borderRadius: "0",
                  }}
                />
                <Bar dataKey="value" radius={[0, 0, 0, 0]}>
                  {stats.categoryBreakdown.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Most worn */}
      {stats.mostWorn.length > 0 && (
        <div className="mb-10">
          <p className="text-[9px] tracking-[0.14em] uppercase text-[#ACABAB] mb-4">
            Most worn
          </p>
          <div className="space-y-px">
            {stats.mostWorn.map((item, i) => (
              <div
                key={item.id}
                className="flex items-center gap-4 border border-[#EDEDED] p-3"
              >
                <span className="text-[11px] text-[#DEDEDE] w-5 text-center font-light">
                  {i + 1}
                </span>
                <div className="w-10 h-10 overflow-hidden bg-[#F5F5F5] flex-shrink-0">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-[#F5F5F5] flex items-center justify-center">
                      <span className="text-sm font-light text-[#DEDEDE]">{item.title?.[0]}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {item.brand && (
                    <p className="text-[9px] tracking-[0.14em] uppercase text-black font-medium">{item.brand}</p>
                  )}
                  <p className="text-[12px] text-[#323232] truncate">{item.title}</p>
                </div>
                <span className="text-[10px] text-[#ACABAB] whitespace-nowrap tracking-wide">
                  {item.wearCount} {item.wearCount === 1 ? "wear" : "wears"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Newest additions */}
      {stats.newest.length > 0 && (
        <div>
          <p className="text-[9px] tracking-[0.14em] uppercase text-[#ACABAB] mb-4">
            Recently added
          </p>
          <div className="space-y-px">
            {stats.newest.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 border border-[#EDEDED] p-3"
              >
                <div className="w-10 h-10 overflow-hidden bg-[#F5F5F5] flex-shrink-0">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-[#F5F5F5] flex items-center justify-center">
                      <span className="text-sm font-light text-[#DEDEDE]">{item.title?.[0]}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {item.brand && (
                    <p className="text-[9px] tracking-[0.14em] uppercase text-black font-medium">{item.brand}</p>
                  )}
                  <p className="text-[12px] text-[#323232] truncate">{item.title}</p>
                </div>
                <span className="text-[10px] text-[#ACABAB] whitespace-nowrap tracking-wide">
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {stats.totalItems === 0 && (
        <div className="text-center py-24">
          <p className="text-[13px] text-[#ACABAB] tracking-wide mb-2">No data yet</p>
          <p className="text-[11px] text-[#DEDEDE] tracking-wide">
            Add pieces to your wardrobe to see statistics
          </p>
        </div>
      )}
    </div>
  );
}
