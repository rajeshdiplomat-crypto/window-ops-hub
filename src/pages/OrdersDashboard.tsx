import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, Search, Upload, Download, FileSpreadsheet, Pencil, Filter, X } from "lucide-react";
import { toast } from "sonner";
import { importOrdersFromFile, exportOrdersToExcel, downloadImportTemplate } from "@/lib/excelUtils";
import CreateOrderDialog from "@/components/CreateOrderDialog";
import EditOrderDialog from "@/components/EditOrderDialog";
import { useUserRoles } from "@/hooks/useUserRoles";

interface ReworkSummary {
  order_id: string;
  total_qty: number;
  latest_issue: string | null;
}

interface PaymentLog {
  order_id: string;
  amount: number;
  status: string;
}

interface Order {
  id: string;
  order_type: string;
  quote_no: string | null;
  sales_order_no: string | null;
  order_name: string;
  dealer_name: string;
  salesperson: string | null;
  colour_shade: string | null;
  product_type: string;
  total_windows: number;
  windows_released: number;
  sqft: number;
  order_value: number;
  advance_received: number;
  balance_amount: number;
  commercial_status: string;
  dispatch_status: string;
  created_at: string;
}

const statusColor = (status: string) => {
  const s = status.toLowerCase();
  if (s === "confirmed") return "bg-success/15 text-success border-success/20";
  if (s === "pipeline") return "bg-blue-500/15 text-blue-600 border-blue-500/20";
  if (s === "hold") return "bg-warning/15 text-warning border-warning/20";
  if (s === "cancelled") return "bg-destructive/15 text-destructive border-destructive/20";
  if (s === "pending") return "bg-warning/15 text-warning border-warning/20";
  return "bg-muted text-muted-foreground";
};

const dispatchColor = (status: string) => {
  if (status === "Fully Dispatched") return "bg-success/15 text-success border-success/20";
  if (status === "Partially Dispatched") return "bg-blue-500/15 text-blue-600 border-blue-500/20";
  return "bg-muted text-muted-foreground";
};

interface Filters {
  salesperson: string;
  orderOwner: string;
  orderType: string;
  colourShade: string;
  commercialStatus: string;
  hasRework: string;
}

const emptyFilters: Filters = {
  salesperson: "", orderOwner: "", orderType: "", colourShade: "", commercialStatus: "", hasRework: "",
};

export default function OrdersDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [reworkMap, setReworkMap] = useState<Record<string, ReworkSummary>>({});
  const [paymentMap, setPaymentMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editOrder, setEditOrder] = useState<Order | null>(null);
  const [importing, setImporting] = useState(false);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [tab, setTab] = useState("open");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { hasRole } = useUserRoles();

  const [salespersons, setSalespersons] = useState<string[]>([]);
  const [owners, setOwners] = useState<string[]>([]);
  const [shades, setShades] = useState<string[]>([]);
  const [commercialStatuses, setCommercialStatuses] = useState<string[]>([]);

  const canEdit = hasRole("sales") || hasRole("admin") || hasRole("management");

  const fetchOrders = async () => {
    const [ordersRes, reworkRes] = await Promise.all([
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      (supabase.from("rework_logs" as any) as any).select("order_id, rework_qty, rework_issue, reported_at").order("reported_at", { ascending: false }),
    ]);
    if (ordersRes.error) toast.error("Failed to load orders");
    else setOrders((ordersRes.data as unknown as Order[]) || []);

    // Build rework summary map
    const logs = (reworkRes.data || []) as { order_id: string; rework_qty: number; rework_issue: string; reported_at: string }[];
    const map: Record<string, ReworkSummary> = {};
    for (const log of logs) {
      if (!map[log.order_id]) {
        map[log.order_id] = { order_id: log.order_id, total_qty: 0, latest_issue: log.rework_issue };
      }
      map[log.order_id].total_qty += log.rework_qty;
    }
    setReworkMap(map);
    setLoading(false);
  };

  const fetchFilterOptions = async () => {
    const [sp, cs, clr] = await Promise.all([
      supabase.from("salespersons").select("name").eq("active", true).order("name"),
      supabase.from("commercial_statuses" as any).select("name").eq("active", true).order("name") as any,
      supabase.from("colour_shades").select("name").eq("active", true).order("name"),
    ]);
    setSalespersons((sp.data || []).map((d: any) => d.name));
    setCommercialStatuses((cs.data || []).map((d: any) => d.name));
    setShades((clr.data || []).map((d: any) => d.name));
    const uniqueOwners = [...new Set(orders.map((o) => o.dealer_name).filter(Boolean))].sort();
    setOwners(uniqueOwners);
  };

  useEffect(() => { fetchOrders(); }, []);
  useEffect(() => { if (orders.length > 0) fetchFilterOptions(); }, [orders.length]);

  const tabFiltered = orders.filter((o) => {
    if (tab === "open") return o.dispatch_status !== "Fully Dispatched";
    if (tab === "dispatched") return o.dispatch_status === "Fully Dispatched";
    return true;
  });

  const filtered = tabFiltered.filter((o) => {
    if (search) {
      const s = search.toLowerCase();
      const matches = o.order_name.toLowerCase().includes(s) ||
        o.dealer_name.toLowerCase().includes(s) ||
        (o.quote_no || "").toLowerCase().includes(s);
      if (!matches) return false;
    }
    if (filters.salesperson && o.salesperson !== filters.salesperson) return false;
    if (filters.orderOwner && o.dealer_name !== filters.orderOwner) return false;
    if (filters.orderType && o.order_type !== filters.orderType) return false;
    if (filters.colourShade && o.colour_shade !== filters.colourShade) return false;
    if (filters.commercialStatus && o.commercial_status !== filters.commercialStatus) return false;
    const rework = reworkMap[o.id];
    if (filters.hasRework === "yes" && (!rework || rework.total_qty <= 0)) return false;
    if (filters.hasRework === "no" && rework && rework.total_qty > 0) return false;
    return true;
  });

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const result = await importOrdersFromFile(file);
      toast.success(`Import: ${result.created} created, ${result.updated} updated`);
      if (result.errors.length > 0) result.errors.forEach((err) => toast.error(err));
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
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sales</h1>
          <p className="text-sm text-muted-foreground">{orders.length} total orders</p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => downloadImportTemplate()}>
            <FileSpreadsheet className="h-4 w-4" /> Template
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" disabled={importing} onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" /> {importing ? "Importing…" : "Import"}
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => exportOrdersToExcel(filtered)}>
            <Download className="h-4 w-4" /> Export
          </Button>
          {canEdit && (
            <Button size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" /> New Order
            </Button>
          )}
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, owner, quotation..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1.5">
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 space-y-3" align="start">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Filters</span>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setFilters(emptyFilters)}>
                  <X className="h-3 w-3 mr-1" /> Clear
                </Button>
              )}
            </div>
            <FilterSelect label="Salesperson" value={filters.salesperson} options={salespersons} onChange={(v) => setFilters({ ...filters, salesperson: v })} />
            <FilterSelect label="Order Owner" value={filters.orderOwner} options={owners} onChange={(v) => setFilters({ ...filters, orderOwner: v })} />
            <FilterSelect label="Order Type" value={filters.orderType} options={["Retail", "Project"]} onChange={(v) => setFilters({ ...filters, orderType: v })} />
            <FilterSelect label="Colour Shade" value={filters.colourShade} options={shades} onChange={(v) => setFilters({ ...filters, colourShade: v })} />
            <FilterSelect label="Commercial Status" value={filters.commercialStatus} options={commercialStatuses} onChange={(v) => setFilters({ ...filters, commercialStatus: v })} />
            <FilterSelect label="Rework Present" value={filters.hasRework} options={["yes", "no"]} onChange={(v) => setFilters({ ...filters, hasRework: v })} />
          </PopoverContent>
        </Popover>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mb-4">
        <TabsList>
          <TabsTrigger value="open">Open Orders</TabsTrigger>
          <TabsTrigger value="dispatched">Dispatched Orders</TabsTrigger>
          <TabsTrigger value="all">All Orders</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="rounded-md border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[80px]">Type</TableHead>
              <TableHead className="min-w-[140px]">Order Name</TableHead>
              <TableHead className="min-w-[120px]">Owner</TableHead>
              <TableHead className="min-w-[100px]">Quotation No</TableHead>
              <TableHead className="min-w-[80px]">SO No</TableHead>
              <TableHead className="min-w-[100px]">Shade</TableHead>
              <TableHead className="min-w-[100px]">Salesperson</TableHead>
              <TableHead className="min-w-[140px]">Product Type</TableHead>
              <TableHead className="text-right min-w-[60px]">Windows</TableHead>
              <TableHead className="text-right min-w-[70px]">Avl to Work</TableHead>
              <TableHead className="text-right min-w-[60px]">Sqft</TableHead>
              <TableHead className="text-right min-w-[90px]">Order Value</TableHead>
              <TableHead className="text-right min-w-[80px]">Receipt</TableHead>
              <TableHead className="text-right min-w-[80px]">Balance</TableHead>
              <TableHead className="text-right min-w-[70px]">Rework Total</TableHead>
              <TableHead className="min-w-[120px]">Latest Issue</TableHead>
              <TableHead className="min-w-[120px]">Dispatch Status</TableHead>
              <TableHead className="min-w-[100px]">Commercial</TableHead>
              {canEdit && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 19 : 18} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 19 : 18} className="text-center py-8 text-muted-foreground">No orders found</TableCell>
              </TableRow>
            ) : (
              filtered.map((order) => {
                const rework = reworkMap[order.id];
                return (
                  <TableRow key={order.id} className="hover:bg-muted/50">
                    <TableCell><Badge variant="outline" className="text-xs">{order.order_type}</Badge></TableCell>
                    <TableCell>
                      <Link to={`/orders/${order.id}`} className="font-medium text-primary hover:underline">{order.order_name}</Link>
                    </TableCell>
                    <TableCell className="text-sm">{order.dealer_name}</TableCell>
                    <TableCell className="text-sm">{order.quote_no || "—"}</TableCell>
                    <TableCell className="text-sm">{order.sales_order_no || "—"}</TableCell>
                    <TableCell className="text-sm">{order.colour_shade || "—"}</TableCell>
                    <TableCell className="text-sm">{order.salesperson || "—"}</TableCell>
                    <TableCell className="text-sm max-w-[180px] truncate" title={order.product_type}>{order.product_type}</TableCell>
                    <TableCell className="text-right">{order.total_windows}</TableCell>
                    <TableCell className="text-right">{order.windows_released}</TableCell>
                    <TableCell className="text-right">{Number(order.sqft).toFixed(1)}</TableCell>
                    <TableCell className="text-right font-medium">₹{Number(order.order_value).toLocaleString()}</TableCell>
                    <TableCell className="text-right">₹{Number(order.advance_received).toLocaleString()}</TableCell>
                    <TableCell className="text-right">₹{Number(order.balance_amount).toLocaleString()}</TableCell>
                    <TableCell className="text-right">{rework && rework.total_qty > 0 ? rework.total_qty : "—"}</TableCell>
                    <TableCell className="text-sm max-w-[120px] truncate" title={rework?.latest_issue || ""}>{rework?.latest_issue || "—"}</TableCell>
                    <TableCell><Badge variant="outline" className={dispatchColor(order.dispatch_status)}>{order.dispatch_status}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className={statusColor(order.commercial_status)}>{order.commercial_status}</Badge></TableCell>
                    {canEdit && (
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setEditOrder(order); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <CreateOrderDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreated={fetchOrders} />
      <EditOrderDialog open={!!editOrder} onOpenChange={(v) => { if (!v) setEditOrder(null); }} onUpdated={fetchOrders} order={editOrder} />
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <Select value={value || "all"} onValueChange={(v) => onChange(v === "all" ? "" : v)}>
        <SelectTrigger className="h-8 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          {options.map((o) => (
            <SelectItem key={o} value={o}>{o}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
