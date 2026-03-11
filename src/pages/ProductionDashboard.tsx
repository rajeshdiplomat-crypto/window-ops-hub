import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

const STAGES = ["Cutting", "Assembly", "Glazing", "Quality", "Packing"] as const;

interface OrderWithProduction {
  id: string;
  order_name: string;
  dealer_name: string;
  order_type: string;
  quote_no: string | null;
  sales_order_no: string | null;
  colour_shade: string | null;
  salesperson: string | null;
  product_type: string;
  total_windows: number;
  design_released_windows: number;
  sqft: number;
  order_value: number;
  approval_for_production: string;
  stageTotals: Record<string, number>;
}

export default function ProductionDashboard() {
  const [orders, setOrders] = useState<OrderWithProduction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [ordersRes, logsRes] = await Promise.all([
        supabase.from("orders").select("id, order_name, dealer_name, order_type, quote_no, sales_order_no, colour_shade, salesperson, product_type, total_windows, design_released_windows, sqft, order_value, approval_for_production").order("created_at", { ascending: false }),
        supabase.from("production_logs" as any).select("order_id, stage, windows_completed"),
      ]);

      if (!ordersRes.data) { setLoading(false); return; }

      const logs = (logsRes.data || []) as any[];
      const logMap: Record<string, Record<string, number>> = {};
      logs.forEach((l: any) => {
        if (!logMap[l.order_id]) logMap[l.order_id] = {};
        logMap[l.order_id][l.stage] = (logMap[l.order_id][l.stage] || 0) + l.windows_completed;
      });

      const mapped: OrderWithProduction[] = (ordersRes.data as any[]).map((o) => ({
        ...o,
        stageTotals: logMap[o.id] || {},
      }));

      setOrders(mapped);
      setLoading(false);
    };
    fetchData();
  }, []);

  const avlToWork = (o: OrderWithProduction) => o.design_released_windows || 0;

  const overallProgress = (o: OrderWithProduction) => {
    const atw = avlToWork(o) || 1;
    const avg = STAGES.reduce((sum, s) => sum + ((o.stageTotals[s] || 0) / atw) * 100, 0) / STAGES.length;
    return Math.min(100, Math.round(avg));
  };

  const isReadyForProduction = (o: OrderWithProduction) =>
    o.approval_for_production === "Approved" && o.design_released_windows > 0 && !Object.keys(o.stageTotals).length;

  const isInProduction = (o: OrderWithProduction) => {
    const atw = avlToWork(o);
    return (o.stageTotals["Cutting"] || 0) > 0 && (o.stageTotals["Packing"] || 0) < atw;
  };

  const isPacked = (o: OrderWithProduction) => {
    const atw = avlToWork(o);
    return atw > 0 && (o.stageTotals["Packing"] || 0) >= atw;
  };

  const getFilteredOrders = (tab: string) => {
    switch (tab) {
      case "ready": return orders.filter(isReadyForProduction);
      case "in_production": return orders.filter(isInProduction);
      case "packed": return orders.filter(isPacked);
      default: return orders.filter(o => o.approval_for_production === "Approved" && o.design_released_windows > 0);
    }
  };

  const renderTable = (list: OrderWithProduction[]) => (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order</TableHead>
            <TableHead>Quote No</TableHead>
            <TableHead>SO No</TableHead>
            <TableHead className="text-right">Windows</TableHead>
            <TableHead className="text-right">Avl to Work</TableHead>
            {STAGES.map((s) => (
              <TableHead key={s} className="text-center">{s}</TableHead>
            ))}
            <TableHead className="w-32">Progress</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
          ) : list.length === 0 ? (
            <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No orders</TableCell></TableRow>
          ) : (
            list.map((order) => {
              const atw = avlToWork(order);
              const progress = overallProgress(order);
              return (
                <TableRow key={order.id}>
                  <TableCell>
                    <Link to={`/orders/${order.id}`} className="font-medium text-primary hover:underline">
                      {order.order_name}
                    </Link>
                    <div className="text-xs text-muted-foreground">{order.dealer_name}</div>
                  </TableCell>
                  <TableCell className="text-sm">{order.quote_no || "—"}</TableCell>
                  <TableCell className="text-sm">{order.sales_order_no || "—"}</TableCell>
                  <TableCell className="text-right font-medium">{order.total_windows}</TableCell>
                  <TableCell className="text-right">{atw}</TableCell>
                  {STAGES.map((s) => (
                    <TableCell key={s} className="text-center">
                      <span className={(order.stageTotals[s] || 0) >= atw && atw > 0 ? "text-green-600 font-medium" : ""}>
                        {order.stageTotals[s] || 0}
                      </span>
                    </TableCell>
                  ))}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={progress} className="h-2 flex-1" />
                      <span className="text-xs text-muted-foreground w-8">{progress}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Production Dashboard</h1>
        <p className="text-sm text-muted-foreground">{orders.filter(o => o.approval_for_production === "Approved" && o.design_released_windows > 0).length} orders in production pipeline</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {STAGES.map((stage) => {
          const allOrders = orders.filter(o => o.approval_for_production === "Approved" && o.design_released_windows > 0);
          const totalCompleted = allOrders.reduce((sum, o) => sum + (o.stageTotals[stage] || 0), 0);
          const totalAtw = allOrders.reduce((sum, o) => sum + avlToWork(o), 0);
          return (
            <Card key={stage}>
              <CardContent className="pt-4 pb-3 px-4">
                <p className="text-xs text-muted-foreground">{stage}</p>
                <p className="text-lg font-semibold">{totalCompleted} / {totalAtw}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="ready">Ready for Production</TabsTrigger>
          <TabsTrigger value="in_production">In Production</TabsTrigger>
          <TabsTrigger value="packed">Packed</TabsTrigger>
          <TabsTrigger value="all">All Orders</TabsTrigger>
        </TabsList>
        <TabsContent value="ready" className="mt-4">{renderTable(getFilteredOrders("ready"))}</TabsContent>
        <TabsContent value="in_production" className="mt-4">{renderTable(getFilteredOrders("in_production"))}</TabsContent>
        <TabsContent value="packed" className="mt-4">{renderTable(getFilteredOrders("packed"))}</TabsContent>
        <TabsContent value="all" className="mt-4">{renderTable(getFilteredOrders("all"))}</TabsContent>
      </Tabs>
    </div>
  );
}
