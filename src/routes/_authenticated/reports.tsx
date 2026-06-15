import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Download, Filter, Inbox } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reports")({
  component: Reports,
});

interface DelayRow {
  id: string;
  shop_desc: string;
  eqpt_name: string | null;
  sub_eqpt_name: string | null;
  agency: string | null;
  delay_from: string | null;
  delay_upto: string | null;
  delay_duration: number | null;
  delay_desc: string | null;
  user_entered: string | null;
}

function fmt(dt: string | null) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Reports() {
  const [shop, setShop] = useState("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sortDesc, setSortDesc] = useState(true);

  const { data, isLoading } = useQuery({
    queryKey: ["delays", "reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delays_data")
        .select(
          "id, shop_desc, eqpt_name, sub_eqpt_name, agency, delay_from, delay_upto, delay_duration, delay_desc, user_entered"
        )
        .order("delay_from", { ascending: false });
      if (error) throw error;
      return data as DelayRow[];
    },
  });

  const rows = data ?? [];
  const shops = useMemo(
    () => Array.from(new Set(rows.map((r) => r.shop_desc))).sort(),
    [rows]
  );

  const filtered = useMemo(() => {
    const fromT = from ? new Date(from).getTime() : null;
    const toT = to ? new Date(to).getTime() + 86400000 : null;
    const out = rows.filter((r) => {
      if (shop !== "ALL" && r.shop_desc !== shop) return false;
      const t = r.delay_from ? new Date(r.delay_from).getTime() : null;
      if (fromT && (t === null || t < fromT)) return false;
      if (toT && (t === null || t > toT)) return false;
      return true;
    });
    out.sort((a, b) => {
      const da = a.delay_from ? new Date(a.delay_from).getTime() : 0;
      const db = b.delay_from ? new Date(b.delay_from).getTime() : 0;
      return sortDesc ? db - da : da - db;
    });
    return out;
  }, [rows, shop, from, to, sortDesc]);

  const chartData = useMemo(() => {
    const m = new Map<string, number>();
    filtered.forEach((r) => {
      const key = shop === "ALL" ? r.shop_desc : r.eqpt_name || "—";
      m.set(key, (m.get(key) || 0) + (Number(r.delay_duration) || 0));
    });
    return Array.from(m, ([name, hours]) => ({ name, hours: Math.round(hours * 10) / 10 }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 12);
  }, [filtered, shop]);

  function exportCSV() {
    const headers = [
      "Shop",
      "Equipment",
      "Sub Equipment",
      "Agency",
      "Delay From",
      "Delay Upto",
      "Duration (hrs)",
      "Description",
      "Logged By",
    ];
    const lines = filtered.map((r) =>
      [
        r.shop_desc,
        r.eqpt_name ?? "",
        r.sub_eqpt_name ?? "",
        r.agency ?? "",
        r.delay_from ?? "",
        r.delay_upto ?? "",
        r.delay_duration ?? "",
        (r.delay_desc ?? "").replace(/"/g, '""'),
        r.user_entered ?? "",
      ]
        .map((v) => `"${String(v)}"`)
        .join(",")
    );
    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `delay_report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Delay Reports</h1>
          <p className="text-sm text-muted-foreground">
            Filter, analyse and export equipment delay records
          </p>
        </div>
        <Button onClick={exportCSV} disabled={!filtered.length} className="bg-gradient-molten text-primary-foreground shadow-molten">
          <Download className="mr-1 h-4 w-4" /> Export CSV
        </Button>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4 text-primary" /> Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Shop</Label>
              <Select value={shop} onValueChange={setShop}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Shops</SelectItem>
                  {shops.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>From Date</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>To Date</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="table">
        <TabsList>
          <TabsTrigger value="table">Tabular View</TabsTrigger>
          <TabsTrigger value="graph">Graphical View</TabsTrigger>
        </TabsList>

        <TabsContent value="table">
          <Card className="shadow-card">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
                  <Inbox className="h-10 w-10" />
                  <p>No delays match the selected filters.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Shop</TableHead>
                        <TableHead>Equipment</TableHead>
                        <TableHead>Agency</TableHead>
                        <TableHead
                          className="cursor-pointer select-none"
                          onClick={() => setSortDesc((s) => !s)}
                        >
                          Delay From {sortDesc ? "↓" : "↑"}
                        </TableHead>
                        <TableHead className="text-right">Duration (hrs)</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Logged By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((r, i) => (
                        <TableRow key={r.id} className={i % 2 ? "bg-secondary/30" : ""}>
                          <TableCell className="font-medium">{r.shop_desc}</TableCell>
                          <TableCell>
                            {r.eqpt_name}
                            {r.sub_eqpt_name ? ` / ${r.sub_eqpt_name}` : ""}
                          </TableCell>
                          <TableCell>{r.agency}</TableCell>
                          <TableCell className="whitespace-nowrap">{fmt(r.delay_from)}</TableCell>
                          <TableCell className="text-right font-medium text-primary">
                            {r.delay_duration}
                          </TableCell>
                          <TableCell className="max-w-[220px] truncate text-muted-foreground">
                            {r.delay_desc}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{r.user_entered}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="graph">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">
                Delay Hours by {shop === "ALL" ? "Shop" : "Equipment"}
              </CardTitle>
            </CardHeader>
            <CardContent className="h-96">
              {isLoading ? (
                <Skeleton className="h-full w-full" />
              ) : chartData.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Inbox className="h-10 w-10" />
                  <p>No data for selected filters.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                    <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={12} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={90}
                      stroke="var(--color-muted-foreground)"
                      fontSize={12}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-popover)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                        color: "var(--color-foreground)",
                      }}
                      cursor={{ fill: "var(--color-muted)" }}
                    />
                    <Bar dataKey="hours" fill="var(--color-primary)" radius={[0, 6, 6, 0]} animationDuration={800} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
