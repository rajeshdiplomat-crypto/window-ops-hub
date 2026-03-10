import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import {
  Lightbulb, FileText, CheckCircle2, XCircle,
} from "lucide-react";
import { format, startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth, subMonths, isWithinInterval } from "date-fns";

interface Order {
  id: string;
  order_name: string;
  dealer_name: string;
  salesperson: string | null;
  order_value: number;
  advance_received: number;
  balance_amount: number;
  commercial_status: string;
  finance_status: string;
  survey_status: string;
  design_status: string;
  dispatch_status: string;
  installation_status: string;
  created_at: string;
  total_windows: number;
}

const COLORS = ["hsl(213, 50%, 32%)", "hsl(199, 70%, 44%)", "hsl(142, 60%, 40%)", "hsl(38, 92%, 50%)", "hsl(0, 72%, 51%)", "hsl(270, 50%, 50%)"];

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyticsRange, setAnalyticsRange] = useState("weekly");

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("orders").select("*");
      setOrders((data as Order[]) || []);
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) {
    return <div className="flex h-full items-center justify-center text-muted-foreground">Loading...</div>;
  }

  // Summary cards
  const pipeline = orders.filter((o) => o.commercial_status === "Pipeline");
  const confirmed = orders.filter((o) => o.commercial_status === "Order Confirmed");
  const totalValue = orders.reduce((s, o) => s + Number(o.order_value || 0), 0);
  const confirmedValue = confirmed.reduce((s, o) => s + Number(o.order_value || 0), 0);
  const pipelineValue = pipeline.reduce((s, o) => s + Number(o.order_value || 0), 0);
  const balanceTotal = orders.reduce((s, o) => s + Number(o.balance_amount || 0), 0);

  const summaryCards = [
    { count: orders.length, label: "Total Orders", value: totalValue, icon: Lightbulb, color: "hsl(var(--primary))" },
    { count: pipeline.length, label: "Pipeline", value: pipelineValue, icon: FileText, color: "hsl(var(--accent))" },
    { count: confirmed.length, label: "Confirmed", value: confirmedValue, icon: CheckCircle2, color: "hsl(var(--success))" },
    { count: orders.length - pipeline.length - confirmed.length, label: "Balance Due", value: balanceTotal, icon: XCircle, color: "hsl(var(--warning))" },
  ];

  // Analytics chart data
  const buildChartData = () => {
    const now = new Date();
    if (analyticsRange === "weekly") {
      const weeks = Array.from({ length: 6 }, (_, i) => {
        const weekStart = startOfWeek(subWeeks(now, 5 - i), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(subWeeks(now, 5 - i), { weekStartsOn: 1 });
        const inRange = orders.filter((o) =>
          isWithinInterval(new Date(o.created_at), { start: weekStart, end: weekEnd })
        );
        const pipelineW = inRange.filter((o) => o.commercial_status === "Pipeline");
        const confirmedW = inRange.filter((o) => o.commercial_status === "Order Confirmed");
        return {
          name: `${format(weekStart, "dd MMM")} - ${format(weekEnd, "dd MMM")}`,
          Pipeline: pipelineW.reduce((s, o) => s + Number(o.order_value), 0),
          Confirmed: confirmedW.reduce((s, o) => s + Number(o.order_value), 0),
          Total: inRange.reduce((s, o) => s + Number(o.order_value), 0),
        };
      });
      return weeks;
    } else {
      const months = Array.from({ length: 6 }, (_, i) => {
        const monthStart = startOfMonth(subMonths(now, 5 - i));
        const monthEnd = endOfMonth(subMonths(now, 5 - i));
        const inRange = orders.filter((o) =>
          isWithinInterval(new Date(o.created_at), { start: monthStart, end: monthEnd })
        );
        const pipelineM = inRange.filter((o) => o.commercial_status === "Pipeline");
        const confirmedM = inRange.filter((o) => o.commercial_status === "Order Confirmed");
        return {
          name: format(monthStart, "MMM yyyy"),
          Pipeline: pipelineM.reduce((s, o) => s + Number(o.order_value), 0),
          Confirmed: confirmedM.reduce((s, o) => s + Number(o.order_value), 0),
          Total: inRange.reduce((s, o) => s + Number(o.order_value), 0),
        };
      });
      return months;
    }
  };
  const chartData = buildChartData();

  // Dealer breakdown
  const dealerMap: Record<string, { count: number; value: number }> = {};
  orders.forEach((o) => {
    const d = o.dealer_name || "Unknown";
    if (!dealerMap[d]) dealerMap[d] = { count: 0, value: 0 };
    dealerMap[d].count++;
    dealerMap[d].value += Number(o.order_value || 0);
  });
  const dealerRows = Object.entries(dealerMap)
    .sort((a, b) => b[1].value - a[1].value)
    .slice(0, 8);

  // Status distribution for pie chart
  const statusDist = [
    { name: "Finance Pending", value: orders.filter((o) => o.finance_status === "Pending Approval").length },
    { name: "Survey Pending", value: orders.filter((o) => o.survey_status === "Pending").length },
    { name: "Design Pending", value: orders.filter((o) => o.design_status === "Pending").length },
    { name: "In Production", value: orders.filter((o) => o.design_status === "Released").length },
    { name: "Dispatched", value: orders.filter((o) => o.dispatch_status === "Fully Dispatched").length },
    { name: "Installed", value: orders.filter((o) => o.installation_status === "Completed").length },
  ].filter((d) => d.value > 0);

  // Salesperson breakdown for pie
  const spMap: Record<string, number> = {};
  orders.forEach((o) => {
    const sp = o.salesperson || "Unassigned";
    spMap[sp] = (spMap[sp] || 0) + 1;
  });
  const salespersonData = Object.entries(spMap).map(([name, value]) => ({ name, value }));

  // Conversion funnel
  const funnel = [
    { stage: "Created", count: orders.length, pct: 100, value: totalValue },
    { stage: "Confirmed", count: confirmed.length, pct: orders.length ? Math.round((confirmed.length / orders.length) * 100) : 0, value: confirmedValue },
    { stage: "Dispatched", count: orders.filter((o) => o.dispatch_status !== "Not Dispatched").length, pct: orders.length ? Math.round((orders.filter((o) => o.dispatch_status !== "Not Dispatched").length / orders.length) * 100) : 0, value: orders.filter((o) => o.dispatch_status !== "Not Dispatched").reduce((s, o) => s + Number(o.order_value), 0) },
    { stage: "Installed", count: orders.filter((o) => o.installation_status === "Completed").length, pct: orders.length ? Math.round((orders.filter((o) => o.installation_status === "Completed").length / orders.length) * 100) : 0, value: orders.filter((o) => o.installation_status === "Completed").reduce((s, o) => s + Number(o.order_value), 0) },
  ];

  const formatCurrency = (v: number) => `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((c) => (
          <Card key={c.label}>
            <CardContent className="pt-5 pb-4 px-5 flex items-start justify-between">
              <div>
                <p className="text-2xl font-bold">{c.count}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{c.label}</p>
                <p className="text-sm font-semibold mt-2">{formatCurrency(c.value)}</p>
              </div>
              <div className="rounded-full p-2" style={{ backgroundColor: `${c.color}15` }}>
                <c.icon className="h-5 w-5" style={{ color: c.color }} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Middle row: Chart + Dealer table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Order Analytics</CardTitle>
            <Select value={analyticsRange} onValueChange={setAnalyticsRange}>
              <SelectTrigger className="w-28 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Pipeline" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Confirmed" fill="hsl(var(--success))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Dealer Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Dealer</TableHead>
                  <TableHead className="text-xs text-center">Qty</TableHead>
                  <TableHead className="text-xs text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dealerRows.map(([dealer, data]) => (
                  <TableRow key={dealer}>
                    <TableCell className="text-xs font-medium text-primary py-2">{dealer}</TableCell>
                    <TableCell className="text-xs text-center py-2">{data.count}</TableCell>
                    <TableCell className="text-xs text-right py-2">{formatCurrency(data.value)}</TableCell>
                  </TableRow>
                ))}
                {dealerRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-xs text-muted-foreground text-center py-4">No data</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Status Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Order Status Distribution</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <div className="w-36 h-36">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusDist} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value" paddingAngle={2}>
                    {statusDist.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 flex-1">
              {statusDist.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2 text-xs">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-muted-foreground flex-1">{d.name}</span>
                  <span className="font-medium">{d.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Salesperson Source */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">By Salesperson</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <div className="w-36 h-36">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={salespersonData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value" paddingAngle={2}>
                    {salespersonData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 flex-1">
              {salespersonData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2 text-xs">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-muted-foreground flex-1">{d.name}</span>
                  <span className="font-medium">{d.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Conversion Funnel */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Order Conversion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {funnel.map((f) => (
              <div key={f.stage} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{f.stage}</span>
                  <span className="font-medium">{formatCurrency(f.value)}</span>
                </div>
                <div className="h-6 w-full rounded bg-muted overflow-hidden flex items-center">
                  <div
                    className="h-full rounded bg-accent flex items-center justify-center text-[10px] font-semibold text-accent-foreground"
                    style={{ width: `${Math.max(f.pct, 8)}%` }}
                  >
                    {f.count} - {f.pct}%
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
