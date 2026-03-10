import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";

interface Order {
  id: string;
  quote_no: string | null;
  sales_order_no: string | null;
  order_name: string;
  dealer_name: string;
  salesperson: string | null;
  colour_shade: string | null;
  total_windows: number;
  windows_released: number;
  sqft: number;
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
}

const statusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "confirmed": return "bg-success/15 text-success border-success/20";
    case "pending": return "bg-warning/15 text-warning border-warning/20";
    case "cancelled": return "bg-destructive/15 text-destructive border-destructive/20";
    default: return "bg-muted text-muted-foreground";
  }
};

export default function OrdersDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchOrders = async () => {
    const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    if (error) toast.error("Failed to load orders");
    else setOrders((data as Order[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const filtered = orders.filter(
    (o) =>
      o.order_name.toLowerCase().includes(search.toLowerCase()) ||
      o.dealer_name.toLowerCase().includes(search.toLowerCase()) ||
      (o.sales_order_no || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      order_name: fd.get("order_name") as string,
      dealer_name: fd.get("dealer_name") as string,
      salesperson: fd.get("salesperson") as string,
      quote_no: fd.get("quote_no") as string,
      total_windows: Number(fd.get("total_windows")) || 0,
      sqft: Number(fd.get("sqft")) || 0,
      order_value: Number(fd.get("order_value")) || 0,
    };
    const { error } = await supabase.from("orders").insert(payload);
    if (error) toast.error(error.message);
    else {
      toast.success("Order created");
      setDialogOpen(false);
      fetchOrders();
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground">{orders.length} total orders</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> New Order
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Order</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Order Name</Label>
                  <Input name="order_name" required />
                </div>
                <div className="space-y-1">
                  <Label>Dealer Name</Label>
                  <Input name="dealer_name" required />
                </div>
                <div className="space-y-1">
                  <Label>Quote No</Label>
                  <Input name="quote_no" />
                </div>
                <div className="space-y-1">
                  <Label>Salesperson</Label>
                  <Input name="salesperson" />
                </div>
                <div className="space-y-1">
                  <Label>Total Windows</Label>
                  <Input name="total_windows" type="number" />
                </div>
                <div className="space-y-1">
                  <Label>Sqft</Label>
                  <Input name="sqft" type="number" step="0.01" />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label>Order Value</Label>
                  <Input name="order_value" type="number" step="0.01" />
                </div>
              </div>
              <Button type="submit" className="w-full">Create</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order Name</TableHead>
              <TableHead>SO No</TableHead>
              <TableHead>Dealer</TableHead>
              <TableHead>Salesperson</TableHead>
              <TableHead className="text-right">Windows</TableHead>
              <TableHead className="text-right">Sqft</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No orders found</TableCell>
              </TableRow>
            ) : (
              filtered.map((order) => (
                <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <Link to={`/orders/${order.id}`} className="font-medium text-primary hover:underline">
                      {order.order_name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{order.sales_order_no || "—"}</TableCell>
                  <TableCell>{order.dealer_name}</TableCell>
                  <TableCell>{order.salesperson || "—"}</TableCell>
                  <TableCell className="text-right">{order.total_windows}</TableCell>
                  <TableCell className="text-right">{Number(order.sqft).toFixed(1)}</TableCell>
                  <TableCell className="text-right font-medium">₹{Number(order.order_value).toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColor(order.commercial_status)}>
                      {order.commercial_status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
