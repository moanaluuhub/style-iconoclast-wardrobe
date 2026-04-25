import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
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
import { getLoginUrl } from "@/const";

const CHART_COLORS = [
  "oklch(0.55 0.15 200)",
  "oklch(0.60 0.12 160)",
  "oklch(0.65 0.1 120)",
  "oklch(0.70 0.08 80)",
  "oklch(0.75 0.06 40)",
  "oklch(0.50 0.13 240)",
  "oklch(0.45 0.18 30)",
  "oklch(0.68 0.09 300)",
  "oklch(0.62 0.11 180)",
  "oklch(0.58 0.14 60)",
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
    <div className="border border-border/40 rounded-sm bg-card p-5">
      <p className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2">{label}</p>
      <p className="font-serif text-3xl text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
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
        <p className="font-serif text-2xl text-muted-foreground/60">Sign in to view statistics</p>
        <Button
          onClick={() => (window.location.href = getLoginUrl())}
          className="mt-6 text-xs tracking-widest uppercase"
        >
          Sign in
        </Button>
      </div>
    );
  }

  if (isLoading || !stats) {
    return (
      <div className="container py-8">
        <h1 className="font-serif text-4xl mb-8">Statistics</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-sm bg-muted animate-pulse" />
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
      <div className="mb-8">
        <h1 className="font-serif text-4xl">Statistics</h1>
        <p className="text-xs text-muted-foreground mt-1 tracking-wide">
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
          <div className="border border-border/40 rounded-sm bg-card p-5">
            <p className="text-[10px] tracking-widest uppercase text-muted-foreground mb-4">
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
                    fontFamily: "DM Sans, sans-serif",
                    fontSize: "11px",
                    background: "oklch(0.965 0.007 80)",
                    border: "1px solid oklch(0.87 0.01 80)",
                    borderRadius: "2px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
              {stats.categoryBreakdown.map((entry, i) => (
                <div key={entry.name} className="flex items-center gap-1.5">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                  />
                  <span className="text-[10px] text-muted-foreground capitalize">{entry.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bar chart — value by category */}
          <div className="border border-border/40 rounded-sm bg-card p-5">
            <p className="text-[10px] tracking-widest uppercase text-muted-foreground mb-4">
              Value by category
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={stats.categoryBreakdown}
                margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.87 0.01 80)" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 9, fontFamily: "DM Sans", fill: "oklch(0.52 0.012 60)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 9, fontFamily: "DM Sans", fill: "oklch(0.52 0.012 60)" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), "Value"]}
                  contentStyle={{
                    fontFamily: "DM Sans, sans-serif",
                    fontSize: "11px",
                    background: "oklch(0.965 0.007 80)",
                    border: "1px solid oklch(0.87 0.01 80)",
                    borderRadius: "2px",
                  }}
                />
                <Bar dataKey="value" radius={[2, 2, 0, 0]}>
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
          <p className="text-[10px] tracking-widest uppercase text-muted-foreground mb-4">
            Most worn
          </p>
          <div className="space-y-2">
            {stats.mostWorn.map((item, i) => (
              <div
                key={item.id}
                className="flex items-center gap-4 border border-border/40 rounded-sm bg-card p-3"
              >
                <span className="font-serif text-2xl text-muted-foreground/40 w-6 text-center">
                  {i + 1}
                </span>
                <div className="w-10 h-10 rounded-sm overflow-hidden bg-muted flex-shrink-0">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-muted to-accent/30 flex items-center justify-center">
                      <span className="font-serif text-sm text-muted-foreground/30">{item.title?.[0]}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {item.brand && (
                    <p className="text-[9px] tracking-widest uppercase text-muted-foreground">{item.brand}</p>
                  )}
                  <p className="text-sm font-serif truncate">{item.title}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
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
          <p className="text-[10px] tracking-widest uppercase text-muted-foreground mb-4">
            Recently added
          </p>
          <div className="space-y-2">
            {stats.newest.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 border border-border/40 rounded-sm bg-card p-3"
              >
                <div className="w-10 h-10 rounded-sm overflow-hidden bg-muted flex-shrink-0">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-muted to-accent/30 flex items-center justify-center">
                      <span className="font-serif text-sm text-muted-foreground/30">{item.title?.[0]}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {item.brand && (
                    <p className="text-[9px] tracking-widest uppercase text-muted-foreground">{item.brand}</p>
                  )}
                  <p className="text-sm font-serif truncate">{item.title}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
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
          <p className="font-serif text-3xl text-muted-foreground/60 mb-3">No data yet</p>
          <p className="text-sm text-muted-foreground italic font-serif">
            Add pieces to your wardrobe to see statistics
          </p>
        </div>
      )}
    </div>
  );
}
