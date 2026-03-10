import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Search, Upload, Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { importOrdersFromFile, exportOrdersToExcel, downloadImportTemplate } from "@/lib/excelUtils";
import CreateOrderDialog from "@/components/CreateOrderDialog";

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
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // handleCreate removed - now in CreateOrderDialog

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const result = await importOrdersFromFile(file);
      toast.success(`Import complete: ${result.created} created, ${result.updated} updated`);
      if (result.errors.length > 0) {
        result.errors.forEach((err) => toast.error(err));
      }
      fetchOrders();
    } catch (err: any) {
      toast.error("Import failed: " + err.message);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground">{orders.length} total orders</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleImport}
          />
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => downloadImportTemplate()}
          >
            <FileSpreadsheet className="h-4 w-4" /> Template
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={importing}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" /> {importing ? "Importing…" : "Import"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => exportOrdersToExcel(filtered)}
          >
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" /> New Order
          </Button>
          <CreateOrderDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            onCreated={fetchOrders}
          />
        </div>
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
              <TableHead>Owner</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Commercial</TableHead>
              <TableHead>Finance</TableHead>
              <TableHead>Survey</TableHead>
              <TableHead>Design</TableHead>
              <TableHead>Dispatch</TableHead>
              <TableHead>Installation</TableHead>
              <TableHead className="text-right">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No orders found</TableCell>
              </TableRow>
            ) : (
              filtered.map((order) => (
                <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <Link to={`/orders/${order.id}`} className="font-medium text-primary hover:underline">
                      {order.order_name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{order.dealer_name}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{(order as any).order_type || "Retail"}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className={statusColor(order.commercial_status)}>{order.commercial_status}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{order.finance_status}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{order.survey_status}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{order.design_status}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{order.dispatch_status}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{order.installation_status}</Badge></TableCell>
                  <TableCell className="text-right font-medium">₹{Number(order.order_value).toLocaleString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
