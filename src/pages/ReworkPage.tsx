import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

export default function ReworkPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [reworkMap, setReworkMap] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [oRes, rRes] = await Promise.all([
        supabase.from("orders").select("*").order("created_at", { ascending: false }),
        (supabase.from("rework_logs" as any) as any).select("*"),
      ]);
      if (oRes.error) { toast.error("Failed to load orders"); return; }
      setOrders(oRes.data || []);

      const rm: Record<string, any[]> = {};
      (rRes.data || []).forEach((l: any) => {
        if (!rm[l.order_id]) rm[l.order_id] = [];
        rm[l.order_id].push(l);
      });
      setReworkMap(rm);
      setLoading(false);
    };
    fetch();
  }, []);

  const ordersWithRework = orders.filter((o) => (reworkMap[o.id] || []).length > 0);
  const pendingOrders = ordersWithRework.filter((o) => (reworkMap[o.id] || []).some((r: any) => r.status === "Pending"));
  const inProgressOrders = ordersWithRework.filter((o) => (reworkMap[o.id] || []).some((r: any) => r.status === "In Progress"));
  const solvedOrders = ordersWithRework.filter((o) => (reworkMap[o.id] || []).every((r: any) => r.status === "Solved" || r.status === "Closed"));

  const getLatestIssue = (id: string) => {
    const logs = reworkMap[id] || [];
    if (logs.length === 0) return "—";
    const latest = logs[0];
    return `${latest.rework_qty}× ${latest.issue_type || latest.rework_issue || "—"}`;
  };

  const getStatus = (id: string) => {
    const logs = reworkMap[id] || [];
    if (logs.length === 0) return "—";
    const hasP = logs.some((r: any) => r.status === "Pending");
    const hasIP = logs.some((r: any) => r.status === "In Progress");
    if (hasP) return "Pending";
    if (hasIP) return "In Progress";
    return "Solved";
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "Pending": return "bg-warning/15 text-warning border-warning/20";
      case "In Progress": return "bg-blue-500/15 text-blue-600 border-blue-500/20";
      case "Solved": return "bg-green-500/15 text-green-600 border-green-500/20";
      default: return "";
    }
  };

  const renderTable = (list: any[]) => (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order Type</TableHead>
            <TableHead>Order Name</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Quote No</TableHead>
            <TableHead>SO No</TableHead>
            <TableHead>Product Type</TableHead>
            <TableHead className="text-right">Windows</TableHead>
            <TableHead className="text-right">Value</TableHead>
            <TableHead>Latest Issue</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
          ) : list.length === 0 ? (
            <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No orders</TableCell></TableRow>
          ) : list.map((o) => (
            <TableRow key={o.id}>
              <TableCell className="text-sm">{o.order_type}</TableCell>
              <TableCell>
                <Link to={`/orders/${o.id}`} className="font-medium text-primary hover:underline">{o.order_name}</Link>
              </TableCell>
              <TableCell className="text-sm">{o.dealer_name}</TableCell>
              <TableCell className="text-sm">{o.quote_no || "—"}</TableCell>
              <TableCell className="text-sm">{o.sales_order_no || "—"}</TableCell>
              <TableCell className="text-sm">{o.product_type}</TableCell>
              <TableCell className="text-right">{o.total_windows}</TableCell>
              <TableCell className="text-right font-medium">₹{Number(o.order_value).toLocaleString()}</TableCell>
              <TableCell className="text-sm max-w-[200px] truncate">{getLatestIssue(o.id)}</TableCell>
              <TableCell>
                <Badge variant="outline" className={statusColor(getStatus(o.id))}>{getStatus(o.id)}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Rework</h1>
        <p className="text-sm text-muted-foreground">Track defects, complaints, and corrective work</p>
      </div>
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending Issues ({pendingOrders.length})</TabsTrigger>
          <TabsTrigger value="inprogress">In Progress ({inProgressOrders.length})</TabsTrigger>
          <TabsTrigger value="solved">Solved ({solvedOrders.length})</TabsTrigger>
          <TabsTrigger value="all">All Issues ({ordersWithRework.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4">{renderTable(pendingOrders)}</TabsContent>
        <TabsContent value="inprogress" className="mt-4">{renderTable(inProgressOrders)}</TabsContent>
        <TabsContent value="solved" className="mt-4">{renderTable(solvedOrders)}</TabsContent>
        <TabsContent value="all" className="mt-4">{renderTable(ordersWithRework)}</TabsContent>
      </Tabs>
    </div>
  );
}
