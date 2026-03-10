import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_QUEUES } from "@/lib/roleQueueConfig";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

interface Order {
  id: string;
  order_name: string;
  dealer_name: string;
  total_windows: number;
  order_value: number;
  finance_status: string;
  survey_status: string;
  design_status: string;
  dispatch_status: string;
  installation_status: string;
  commercial_status: string;
  created_at: string;
}

export default function RoleQueuePage() {
  const { role } = useParams<{ role: string }>();
  const queueDef = ROLE_QUEUES.find((q) => q.role === role);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!queueDef) { setLoading(false); return; }

    const fetchOrders = async () => {
      let query = supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      // Apply filter using the field and values from queue config
      query = query.in(queueDef.filterField as any, queueDef.filterValues);

      if (error) toast.error("Failed to load queue");
      else setOrders((data as Order[]) || []);
      setLoading(false);
    };

    fetchOrders();
  }, [queueDef]);

  if (!queueDef) {
    return <div className="p-6 text-muted-foreground">Queue not found.</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{queueDef.label}</h1>
        <p className="text-sm text-muted-foreground">{queueDef.description} — {orders.length} orders</p>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order Name</TableHead>
              <TableHead>Dealer</TableHead>
              <TableHead>Windows</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No orders in this queue</TableCell>
              </TableRow>
            ) : (
              orders.map((order) => {
                const statusValue = (order as any)[queueDef.filterField] as string;
                return (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Link to={`/orders/${order.id}`} className="font-medium text-primary hover:underline">
                        {order.order_name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">{order.dealer_name}</TableCell>
                    <TableCell className="text-sm">{order.total_windows}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{statusValue}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">₹{Number(order.order_value).toLocaleString()}</TableCell>
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
