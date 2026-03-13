import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

export default function InstallationPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [installMap, setInstallMap] = useState<Record<string, number>>({});
  const [dispatchMap, setDispatchMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [oRes, iRes, dRes] = await Promise.all([
        supabase.from("orders").select("*").order("created_at", { ascending: false }),
        (supabase.from("installation_logs" as any) as any).select("order_id, windows_installed"),
        (supabase.from("dispatch_logs" as any) as any).select("order_id, windows_dispatched"),
      ]);
      if (oRes.error) { toast.error("Failed to load orders"); return; }
      setOrders(oRes.data || []);

      const im: Record<string, number> = {};
      (iRes.data || []).forEach((l: any) => { im[l.order_id] = (im[l.order_id] || 0) + l.windows_installed; });
      setInstallMap(im);

      const dm: Record<string, number> = {};
      (dRes.data || []).forEach((l: any) => { dm[l.order_id] = (dm[l.order_id] || 0) + l.windows_dispatched; });
      setDispatchMap(dm);

      setLoading(false);
    };
    fetch();
  }, []);

  const getDispatched = (id: string) => dispatchMap[id] || 0;
  const getInstalled = (id: string) => installMap[id] || 0;
  const getPending = (id: string) => getDispatched(id) - getInstalled(id);

  const readyOrders = orders.filter((o) => getDispatched(o.id) > 0 && getInstalled(o.id) === 0);
  const partialOrders = orders.filter((o) => getInstalled(o.id) > 0 && getInstalled(o.id) < (o.design_released_windows || 0));
  const fullyOrders = orders.filter((o) => getInstalled(o.id) > 0 && getInstalled(o.id) >= (o.design_released_windows || 0) && (o.design_released_windows || 0) > 0);

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
            <TableHead className="text-right">Sqft</TableHead>
            <TableHead className="text-right">Value</TableHead>
            <TableHead className="text-right">Installed</TableHead>
            <TableHead className="text-right">Pending</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
          ) : list.length === 0 ? (
            <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">No orders</TableCell></TableRow>
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
              <TableCell className="text-right">{Number(o.sqft).toFixed(1)}</TableCell>
              <TableCell className="text-right font-medium">₹{Number(o.order_value).toLocaleString()}</TableCell>
              <TableCell className="text-right font-medium">{getInstalled(o.id)}</TableCell>
              <TableCell className="text-right">{getPending(o.id)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Installation</h1>
        <p className="text-sm text-muted-foreground">Track site installation progress</p>
      </div>
      <Tabs defaultValue="ready">
        <TabsList>
          <TabsTrigger value="ready">Ready for Installation ({readyOrders.length})</TabsTrigger>
          <TabsTrigger value="partial">Partially Installed ({partialOrders.length})</TabsTrigger>
          <TabsTrigger value="full">Fully Installed ({fullyOrders.length})</TabsTrigger>
          <TabsTrigger value="all">All Orders ({orders.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="ready" className="mt-4">{renderTable(readyOrders)}</TabsContent>
        <TabsContent value="partial" className="mt-4">{renderTable(partialOrders)}</TabsContent>
        <TabsContent value="full" className="mt-4">{renderTable(fullyOrders)}</TabsContent>
        <TabsContent value="all" className="mt-4">{renderTable(orders)}</TabsContent>
      </Tabs>
    </div>
  );
}
