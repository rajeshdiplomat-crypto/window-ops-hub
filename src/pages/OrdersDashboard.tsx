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

// ── Types ──

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
  installation_status: string;
  survey_done_windows: number;
  design_released_windows: number;
  hardware_availability: string;
  extrusion_availability: string;
  glass_availability: string;
  coated_extrusion_availability: string;
  created_at: string;
}

interface AggregatedOrder extends Order {
  receipt: number;
  balance: number;
  surveyLabel: string;
  designLabel: string;
  materialsLabel: string;
  productionLabel: string;
  productionPacked: number;
  dispatchLabel: string;
  dispatchedWindows: number;
  installationLabel: string;
  installedWindows: number;
  reworkLabel: string;
  reworkOpenCount: number;
  nextAction: string;
}

// ── Status helpers ──

function getSurveyStatus(o: Order): string {
  if (o.survey_done_windows <= 0) return "Pending";
  if (o.survey_done_windows < o.total_windows) return "Partial";
  return "Complete";
}

function getDesignStatus(o: Order): string {
  if (o.design_released_windows <= 0) return "Pending";
  if (o.design_released_windows < o.survey_done_windows) return "Partial";
  return "Complete";
}

function getMaterialsStatus(o: Order): string {
  const items = [o.hardware_availability, o.extrusion_availability, o.glass_availability, o.coated_extrusion_availability];
  const ready = items.filter((s) => s === "Yes" || s === "Delivered");
  if (ready.length === items.length) return "Ready";
  if (ready.length > 0 || items.some((s) => s === "Partially Available")) return "Partial";
  return "Pending";
}

function getDispatchLabel(dispatched: number, packed: number): string {
  if (dispatched <= 0) return "Not Dispatched";
  if (dispatched < packed) return "Partial";
  return "Complete";
}

function getInstallationLabel(installed: number, dispatched: number): string {
  if (installed <= 0) return "Not Installed";
  if (dispatched > 0 && installed < dispatched) return "Partial";
  if (dispatched > 0 && installed >= dispatched) return "Complete";
  return "Not Installed";
}

function getReworkLabel(openCount: number, totalCount: number): string {
  if (totalCount === 0) return "None";
  if (openCount > 0) return "Open";
  return "Closed";
}

function getNextAction(agg: AggregatedOrder): string {
  if (agg.surveyLabel !== "Complete") return "Survey";
  if (agg.designLabel !== "Complete") return "Design";
  if (agg.materialsLabel !== "Ready") return "Procurement";
  if (agg.productionPacked < agg.total_windows) return "Production";
  if (agg.dispatchLabel !== "Complete") return "Dispatch";
  if (agg.installationLabel !== "Complete") return "Installation";
  if (agg.reworkLabel === "Open") return "Rework";
  return "—";
}

// ── Badge color helpers ──

function statusBadgeClass(label: string): string {
  const l = label.toLowerCase();
  if (["pending", "not dispatched", "not installed", "none"].includes(l)) return "bg-muted text-muted-foreground";
  if (["partial", "open"].includes(l)) return "bg-blue-500/15 text-blue-600 border-blue-500/20";
  if (["ready", "complete", "closed"].includes(l)) return "bg-emerald-500/15 text-emerald-600 border-emerald-500/20";
  if (["blocked"].includes(l)) return "bg-destructive/15 text-destructive border-destructive/20";
  return "bg-muted text-muted-foreground";
}

function nextActionBadgeClass(action: string): string {
  if (action === "—") return "bg-muted text-muted-foreground";
  return "bg-amber-500/15 text-amber-700 border-amber-500/20";
}

// ── Filters ──

interface Filters {
  salesperson: string;
  orderOwner: string;
  dispatchStatus: string;
  installationStatus: string;
  reworkStatus: string;
}

const emptyFilters: Filters = {
  salesperson: "", orderOwner: "", dispatchStatus: "", installationStatus: "", reworkStatus: "",
};

// ── Component ──

export default function OrdersDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [aggregated, setAggregated] = useState<AggregatedOrder[]>([]);
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

  const canEdit = hasRole("sales") || hasRole("admin") || hasRole("management");

  const fetchAll = async () => {
    const [ordersRes, paymentsRes, prodLogsRes, dispatchLogsRes, installLogsRes, reworkRes] = await Promise.all([
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      supabase.from("payment_logs").select("order_id, amount, status"),
      supabase.from("production_logs").select("order_id, stage, windows_completed"),
      supabase.from("dispatch_logs").select("order_id, windows_dispatched"),
      supabase.from("installation_logs").select("order_id, windows_installed"),
      supabase.from("rework_logs").select("order_id, status, rework_qty"),
    ]);

    if (ordersRes.error) { toast.error("Failed to load orders"); return; }
    const rawOrders = (ordersRes.data || []) as unknown as Order[];
    setOrders(rawOrders);

    // Payment map (confirmed only)
    const paymentMap: Record<string, number> = {};
    for (const p of (paymentsRes.data || []) as any[]) {
      if (p.status === "Confirmed") paymentMap[p.order_id] = (paymentMap[p.order_id] || 0) + Number(p.amount);
    }

    // Production packed map
    const packedMap: Record<string, number> = {};
    for (const p of (prodLogsRes.data || []) as any[]) {
      if (p.stage === "Packing") packedMap[p.order_id] = (packedMap[p.order_id] || 0) + Number(p.windows_completed);
    }

    // Dispatch map
    const dispatchMap: Record<string, number> = {};
    for (const d of (dispatchLogsRes.data || []) as any[]) {
      dispatchMap[d.order_id] = (dispatchMap[d.order_id] || 0) + Number(d.windows_dispatched);
    }

    // Installation map
    const installMap: Record<string, number> = {};
    for (const i of (installLogsRes.data || []) as any[]) {
      installMap[i.order_id] = (installMap[i.order_id] || 0) + Number(i.windows_installed);
    }

    // Rework map
    const reworkOpenMap: Record<string, number> = {};
    const reworkTotalMap: Record<string, number> = {};
    for (const r of (reworkRes.data || []) as any[]) {
      reworkTotalMap[r.order_id] = (reworkTotalMap[r.order_id] || 0) + 1;
      if (r.status === "Pending" || r.status === "In Progress") {
        reworkOpenMap[r.order_id] = (reworkOpenMap[r.order_id] || 0) + 1;
      }
    }

    // Aggregate
    const agg: AggregatedOrder[] = rawOrders.map((o) => {
      const receipt = paymentMap[o.id] || 0;
      const packed = packedMap[o.id] || 0;
      const dispatched = dispatchMap[o.id] || 0;
      const installed = installMap[o.id] || 0;
      const openRework = reworkOpenMap[o.id] || 0;
      const totalRework = reworkTotalMap[o.id] || 0;

      const partial: AggregatedOrder = {
        ...o,
        receipt,
        balance: Number(o.order_value) - receipt,
        surveyLabel: getSurveyStatus(o),
        designLabel: getDesignStatus(o),
        materialsLabel: getMaterialsStatus(o),
        productionLabel: `${packed} / ${o.total_windows}`,
        productionPacked: packed,
        dispatchLabel: getDispatchLabel(dispatched, packed),
        dispatchedWindows: dispatched,
        installationLabel: getInstallationLabel(installed, dispatched),
        installedWindows: installed,
        reworkLabel: getReworkLabel(openRework, totalRework),
        reworkOpenCount: openRework,
        nextAction: "",
      };
      partial.nextAction = getNextAction(partial);
      return partial;
    });

    setAggregated(agg);
    setLoading(false);
  };

  const fetchFilterOptions = async () => {
    const sp = await supabase.from("salespersons").select("name").eq("active", true).order("name");
    setSalespersons((sp.data || []).map((d: any) => d.name));
    setOwners([...new Set(orders.map((o) => o.dealer_name).filter(Boolean))].sort());
  };

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { if (orders.length > 0) fetchFilterOptions(); }, [orders.length]);

  // Tab filtering
  const tabFiltered = aggregated.filter((o) => {
    if (tab === "open") return o.dispatchLabel !== "Complete";
    if (tab === "dispatched") return o.dispatchLabel === "Complete";
    if (tab === "completed") return o.installationLabel === "Complete";
    return true; // "all"
  });

  // Search + filters
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
    if (filters.dispatchStatus && o.dispatchLabel !== filters.dispatchStatus) return false;
    if (filters.installationStatus && o.installationLabel !== filters.installationStatus) return false;
    if (filters.reworkStatus && o.reworkLabel !== filters.reworkStatus) return false;
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
      fetchAll();
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
          <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground">{aggregated.length} total orders</p>
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

      {/* Search + Filters */}
      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search quotation, order name, owner..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
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
            <FilterSelect label="Owner" value={filters.orderOwner} options={owners} onChange={(v) => setFilters({ ...filters, orderOwner: v })} />
            <FilterSelect label="Dispatch Status" value={filters.dispatchStatus} options={["Not Dispatched", "Partial", "Complete"]} onChange={(v) => setFilters({ ...filters, dispatchStatus: v })} />
            <FilterSelect label="Installation Status" value={filters.installationStatus} options={["Not Installed", "Partial", "Complete"]} onChange={(v) => setFilters({ ...filters, installationStatus: v })} />
            <FilterSelect label="Rework" value={filters.reworkStatus} options={["None", "Open", "Closed"]} onChange={(v) => setFilters({ ...filters, reworkStatus: v })} />
          </PopoverContent>
        </Popover>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="mb-4">
        <TabsList>
          <TabsTrigger value="open">Open Orders</TabsTrigger>
          <TabsTrigger value="dispatched">Dispatched</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="all">All Orders</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Table */}
      <div className="rounded-md border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[100px]">Quotation No</TableHead>
              <TableHead className="min-w-[80px]">SO No</TableHead>
              <TableHead className="min-w-[140px]">Order Name</TableHead>
              <TableHead className="min-w-[110px]">Owner</TableHead>
              <TableHead className="min-w-[100px]">Salesperson</TableHead>
              <TableHead className="text-right min-w-[60px]">Windows</TableHead>
              <TableHead className="text-right min-w-[90px]">Order Value</TableHead>
              <TableHead className="text-right min-w-[75px]">Receipt</TableHead>
              <TableHead className="text-right min-w-[75px]">Balance</TableHead>
              <TableHead className="min-w-[80px]">Survey</TableHead>
              <TableHead className="min-w-[80px]">Design</TableHead>
              <TableHead className="min-w-[80px]">Materials</TableHead>
              <TableHead className="min-w-[90px]">Production</TableHead>
              <TableHead className="min-w-[95px]">Dispatch</TableHead>
              <TableHead className="min-w-[95px]">Installation</TableHead>
              <TableHead className="min-w-[70px]">Rework</TableHead>
              <TableHead className="min-w-[100px]">Next Action</TableHead>
              {canEdit && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 18 : 17} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 18 : 17} className="text-center py-8 text-muted-foreground">No orders found</TableCell>
              </TableRow>
            ) : (
              filtered.map((o) => (
                <TableRow key={o.id} className="hover:bg-muted/50">
                  <TableCell className="text-sm">{o.quote_no || "—"}</TableCell>
                  <TableCell className="text-sm">{o.sales_order_no || "—"}</TableCell>
                  <TableCell>
                    <Link to={`/orders/${o.id}`} className="font-medium text-primary hover:underline">{o.order_name}</Link>
                  </TableCell>
                  <TableCell className="text-sm">{o.dealer_name}</TableCell>
                  <TableCell className="text-sm">{o.salesperson || "—"}</TableCell>
                  <TableCell className="text-right">{o.total_windows}</TableCell>
                  <TableCell className="text-right font-medium">₹{Number(o.order_value).toLocaleString()}</TableCell>
                  <TableCell className="text-right">₹{o.receipt.toLocaleString()}</TableCell>
                  <TableCell className="text-right">₹{o.balance.toLocaleString()}</TableCell>
                  <TableCell><Badge variant="outline" className={statusBadgeClass(o.surveyLabel)}>{o.surveyLabel}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className={statusBadgeClass(o.designLabel)}>{o.designLabel}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className={statusBadgeClass(o.materialsLabel)}>{o.materialsLabel}</Badge></TableCell>
                  <TableCell className="text-sm font-medium">{o.productionLabel}</TableCell>
                  <TableCell><Badge variant="outline" className={statusBadgeClass(o.dispatchLabel)}>{o.dispatchLabel}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className={statusBadgeClass(o.installationLabel)}>{o.installationLabel}</Badge></TableCell>
                  <TableCell>
                    {o.reworkLabel === "None" ? (
                      <span className="text-sm text-muted-foreground">—</span>
                    ) : (
                      <Badge variant="outline" className={statusBadgeClass(o.reworkLabel)}>
                        {o.reworkLabel === "Open" ? `${o.reworkOpenCount} Open` : "Closed"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell><Badge variant="outline" className={nextActionBadgeClass(o.nextAction)}>{o.nextAction}</Badge></TableCell>
                  {canEdit && (
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setEditOrder(o); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CreateOrderDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreated={fetchAll} />
      <EditOrderDialog open={!!editOrder} onOpenChange={(v) => { if (!v) setEditOrder(null); }} onUpdated={fetchAll} order={editOrder} />
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
