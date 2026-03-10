import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import {
  Package, DollarSign, Factory, Truck, ClipboardCheck, Paintbrush, Eye, Wrench,
} from "lucide-react";

interface Metrics {
  totalOrders: number;
  pipelineOrders: number;
  pendingFinance: number;
  pendingSurvey: number;
  pendingDesign: number;
  inProduction: number;
  pendingDispatch: number;
  pendingInstallation: number;
  totalValue: number;
  totalBalance: number;
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("orders").select("*");
      const orders = (data || []) as any[];

      setMetrics({
        totalOrders: orders.length,
        pipelineOrders: orders.filter((o) => o.commercial_status === "Pipeline").length,
        pendingFinance: orders.filter((o) => o.finance_status === "Pending Approval").length,
        pendingSurvey: orders.filter((o) => o.survey_status === "Pending").length,
        pendingDesign: orders.filter((o) => o.survey_status === "Completed" && o.design_status === "Pending").length,
        inProduction: orders.filter((o) => o.design_status === "Released").length,
        pendingDispatch: orders.filter((o) => o.dispatch_status !== "Fully Dispatched" && o.design_status === "Released").length,
        pendingInstallation: orders.filter((o) =>
          (o.dispatch_status === "Partially Dispatched" || o.dispatch_status === "Fully Dispatched") &&
          o.installation_status !== "Completed"
        ).length,
        totalValue: orders.reduce((s, o) => s + Number(o.order_value || 0), 0),
        totalBalance: orders.reduce((s, o) => s + Number(o.balance_amount || 0), 0),
      });
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) {
    return <div className="flex h-full items-center justify-center text-muted-foreground">Loading...</div>;
  }

  if (!metrics) return null;

  const cards = [
    { label: "Total Orders", value: metrics.totalOrders, icon: Package },
    { label: "Pipeline", value: metrics.pipelineOrders, icon: ClipboardCheck },
    { label: "Pending Finance", value: metrics.pendingFinance, icon: DollarSign },
    { label: "Pending Survey", value: metrics.pendingSurvey, icon: Eye },
    { label: "Pending Design", value: metrics.pendingDesign, icon: Paintbrush },
    { label: "In Production", value: metrics.inProduction, icon: Factory },
    { label: "Pending Dispatch", value: metrics.pendingDispatch, icon: Truck },
    { label: "Pending Installation", value: metrics.pendingInstallation, icon: Wrench },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Operations overview</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="pt-4 pb-3 px-4 flex items-center gap-3">
              <div className="rounded-md bg-primary/10 p-2">
                <c.icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="text-xl font-semibold">{c.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground mb-1">Total Order Value</p>
            <p className="text-2xl font-semibold">₹{metrics.totalValue.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground mb-1">Outstanding Balance</p>
            <p className="text-2xl font-semibold">₹{metrics.totalBalance.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
