import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import { Clock, AlarmClock, Factory, Gauge } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

interface DelayRow {
  shop_desc: string;
  agency: string | null;
  delay_duration: number | null;
  delay_from: string | null;
  created_at: string;
}

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  suffix?: string;
}) {
  return (
    <Card className="overflow-hidden shadow-card">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-molten shadow-molten">
          <Icon className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="font-display text-2xl font-bold text-foreground">
            {value}
            {suffix && <span className="ml-1 text-base text-muted-foreground">{suffix}</span>}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["delays", "dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delays_data")
        .select("shop_desc, agency, delay_duration, delay_from, created_at");
      if (error) throw error;
      return data as DelayRow[];
    },
  });

  const rows = data ?? [];
  const today = new Date().toDateString();
  const now = new Date();

  const todaysDelays = rows.filter(
    (r) => r.delay_from && new Date(r.delay_from).toDateString() === today
  ).length;

  const monthHours = rows
    .filter((r) => {
      const d = r.delay_from ? new Date(r.delay_from) : null;
      return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, r) => sum + (Number(r.delay_duration) || 0), 0);

  const totalHours = rows.reduce((s, r) => s + (Number(r.delay_duration) || 0), 0);
  const avg = rows.length ? totalHours / rows.length : 0;

  const shopMap = new Map<string, number>();
  rows.forEach((r) => {
    shopMap.set(r.shop_desc, (shopMap.get(r.shop_desc) || 0) + (Number(r.delay_duration) || 0));
  });
  const shopData = Array.from(shopMap, ([shop, hours]) => ({
    shop,
    hours: Math.round(hours * 10) / 10,
  }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 8);

  const agencyMap = new Map<string, number>();
  rows.forEach((r) => {
    const a = r.agency || "Other";
    agencyMap.set(a, (agencyMap.get(a) || 0) + (Number(r.delay_duration) || 0));
  });
  const agencyData = Array.from(agencyMap, ([name, value]) => ({
    name,
    value: Math.round(value * 10) / 10,
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Operations Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Live overview of equipment delays across the plant
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={AlarmClock} label="Today's Delays" value={todaysDelays} />
          <StatCard
            icon={Clock}
            label="Delay Hours (This Month)"
            value={Math.round(monthHours * 10) / 10}
            suffix="hrs"
          />
          <StatCard icon={Factory} label="Total Delays Logged" value={rows.length} />
          <StatCard
            icon={Gauge}
            label="Avg Delay Duration"
            value={Math.round(avg * 10) / 10}
            suffix="hrs"
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="shadow-card lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Shop-wise Delay Hours</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={shopData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="shop" stroke="var(--color-muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      color: "var(--color-foreground)",
                    }}
                    cursor={{ fill: "var(--color-muted)" }}
                  />
                  <Bar dataKey="hours" fill="var(--color-primary)" radius={[6, 6, 0, 0]} animationDuration={800} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Agency-wise Delay Share</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={agencyData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={3}
                    animationDuration={800}
                  >
                    {agencyData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      color: "var(--color-foreground)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              {agencyData.map((a, i) => (
                <div key={a.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                  />
                  {a.name}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
