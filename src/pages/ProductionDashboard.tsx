import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

const STAGES = ["cutting", "assembly", "glazing", "qc", "packing"] as const;
const STAGE_LABELS: Record<string, string> = {
  cutting: "Cutting", assembly: "Assembly", glazing: "Glazing", qc: "QC", packing: "Packing",
};

interface OrderWithProduction {
  id: string;
  order_name: string;
  dealer_name: string;
  total_windows: number;
  production: {
    id: string;
    unit: string;
    cutting: number;
    assembly: number;
    glazing: number;
    qc: number;
    packing: number;
  }[];
}

export default function ProductionDashboard() {
  const [orders, setOrders] = useState<OrderWithProduction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      // Get orders that are in production (design released)
      const { data: ordersData } = await supabase
        .from("orders")
        .select("id, order_name, dealer_name, total_windows, design_status")
        .order("created_at", { ascending: false });

      if (!ordersData) { setLoading(false); return; }

      const { data: prodData } = await supabase
        .from("production_status")
        .select("*");

      const mapped: OrderWithProduction[] = (ordersData as any[])
        .filter((o) => {
          const prods = (prodData || []).filter((p: any) => p.order_id === o.id);
          return prods.length > 0;
        })
        .map((o) => ({
          ...o,
          production: (prodData || []).filter((p: any) => p.order_id === o.id) as any[],
        }));

      setOrders(mapped);
      setLoading(false);
    };
    fetch();
  }, []);

  const getOrderTotals = (order: OrderWithProduction) => {
    const totals: Record<string, number> = {};
    STAGES.forEach((s) => {
      totals[s] = order.production.reduce((sum, p) => sum + (p[s] || 0), 0);
    });
    return totals;
  };

  const overallProgress = (order: OrderWithProduction) => {
    const totals = getOrderTotals(order);
    const total = order.total_windows || 1;
    const avg = STAGES.reduce((sum, s) => sum + (totals[s] / total) * 100, 0) / STAGES.length;
    return Math.min(100, Math.round(avg));
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Production Dashboard</h1>
        <p className="text-sm text-muted-foreground">{orders.length} orders in production</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {STAGES.map((stage) => {
          const totalCompleted = orders.reduce((sum, o) => {
            return sum + o.production.reduce((s, p) => s + (p[stage] || 0), 0);
          }, 0);
          const totalWindows = orders.reduce((sum, o) => sum + o.total_windows, 0);
          return (
            <Card key={stage}>
              <CardContent className="pt-4 pb-3 px-4">
                <p className="text-xs text-muted-foreground">{STAGE_LABELS[stage]}</p>
                <p className="text-lg font-semibold">{totalCompleted} / {totalWindows}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead className="text-right">Total</TableHead>
              {STAGES.map((s) => (
                <TableHead key={s} className="text-center">{STAGE_LABELS[s]}</TableHead>
              ))}
              <TableHead className="w-32">Progress</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : orders.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No orders in production</TableCell></TableRow>
            ) : (
              orders.map((order) => {
                const totals = getOrderTotals(order);
                const progress = overallProgress(order);
                return (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Link to={`/orders/${order.id}`} className="font-medium text-primary hover:underline">
                        {order.order_name}
                      </Link>
                      <div className="text-xs text-muted-foreground">{order.dealer_name}</div>
                    </TableCell>
                    <TableCell className="text-right font-medium">{order.total_windows}</TableCell>
                    {STAGES.map((s) => (
                      <TableCell key={s} className="text-center">
                        <span className={totals[s] >= order.total_windows ? "text-success font-medium" : ""}>
                          {totals[s]}
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
    </div>
  );
}
