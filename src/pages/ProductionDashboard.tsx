import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { checkMaterialDependency } from "@/lib/nextActions";
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
  materialStatus: Record<string, any> | null;
  blockedStages: Record<string, string | null>;
}

export default function ProductionDashboard() {
  const [orders, setOrders] = useState<OrderWithProduction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [ordersRes, prodRes, matRes] = await Promise.all([
        supabase.from("orders").select("id, order_name, dealer_name, total_windows, design_status").order("created_at", { ascending: false }),
        supabase.from("production_status").select("*"),
        supabase.from("material_status").select("*"),
      ]);

      if (!ordersRes.data) { setLoading(false); return; }

      const prodData = prodRes.data || [];
      const matData = matRes.data || [];

      const matMap: Record<string, any> = {};
      (matData as any[]).forEach((m) => { matMap[m.order_id] = m; });

      const mapped: OrderWithProduction[] = (ordersRes.data as any[])
        .filter((o) => {
          const prods = (prodData as any[]).filter((p) => p.order_id === o.id);
          return prods.length > 0;
        })
        .map((o) => {
          const mat = matMap[o.id] || null;
          const blockedStages: Record<string, string | null> = {};
          STAGES.forEach((s) => {
            blockedStages[s] = checkMaterialDependency(s, mat);
          });
          return {
            ...o,
            production: (prodData as any[]).filter((p) => p.order_id === o.id),
            materialStatus: mat,
            blockedStages,
          };
        });

      setOrders(mapped);
      setLoading(false);
    };
    fetch();
  }, []);

  const getOrderTotals = (order: OrderWithProduction) => {
    const totals: Record<string, number> = {};
    STAGES.forEach((s) => {
      totals[s] = order.production.reduce((sum, p) => sum + ((p as any)[s] || 0), 0);
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

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {STAGES.map((stage) => {
          const totalCompleted = orders.reduce((sum, o) =>
            sum + o.production.reduce((s, p) => s + ((p as any)[stage] || 0), 0), 0);
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
                    {STAGES.map((s) => {
                      const blocked = order.blockedStages[s];
                      return (
                        <TableCell key={s} className="text-center">
                          {blocked ? (
                            <span className="text-xs text-destructive" title={blocked}>🔒</span>
                          ) : (
                            <span className={totals[s] >= order.total_windows ? "text-green-600 font-medium" : ""}>
                              {totals[s]}
                            </span>
                          )}
                        </TableCell>
                      );
                    })}
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
