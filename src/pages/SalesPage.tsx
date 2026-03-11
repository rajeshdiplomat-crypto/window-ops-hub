import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Search, Filter, X } from "lucide-react";
import { toast } from "sonner";

interface Order {
  id: string;
  order_name: string;
  quote_no: string | null;
  sales_order_no: string | null;
  dealer_name: string;
  salesperson: string | null;
  product_type: string;
  colour_shade: string | null;
  total_windows: number;
  order_value: number;
  advance_received: number;
  balance_amount: number;
  commercial_status: string;
  dispatch_status: string;
}

interface ReworkInfo {
  totalQty: number;
  latestIssue: string | null;
}

const commercialColor = (status: string) => {
  if (status === "Order Confirmed") return "bg-success/15 text-success border-success/20";
  if (status === "Pipeline" || status === "pending") return "bg-warning/15 text-warning border-warning/20";
  return "bg-muted text-muted-foreground";
};

interface Filters {
  salesperson: string;
  orderOwner: string;
  commercialStatus: string;
}

const emptyFilters: Filters = { salesperson: "", orderOwner: "", commercialStatus: "" };

export default function SalesPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [reworkMap, setReworkMap] = useState<Record<string, ReworkInfo>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [tab, setTab] = useState("open");

  const [salespersons, setSalespersons] = useState<string[]>([]);
  const [owners, setOwners] = useState<string[]>([]);
  const [commercialStatuses, setCommercialStatuses] = useState<string[]>([]);

  const fetchData = async () => {
    const [ordersRes, reworkRes] = await Promise.all([
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      supabase.from("rework_logs").select("order_id, rework_qty, rework_issue, reported_at").order("reported_at", { ascending: false }),
    ]);
    if (ordersRes.error) toast.error("Failed to load orders");
    else setOrders((ordersRes.data as unknown as Order[]) || []);

    const logs = reworkRes.data || [];
    const map: Record<string, ReworkInfo> = {};
    for (const log of logs) {
      if (!map[log.order_id]) {
        map[log.order_id] = { totalQty: 0, latestIssue: log.rework_issue };
      }
      map[log.order_id].totalQty += Number(log.rework_qty);
    }
    setReworkMap(map);
    setLoading(false);
  };

  const fetchFilterOptions = async () => {
    const [sp, cs] = await Promise.all([
      supabase.from("salespersons").select("name").eq("active", true).order("name"),
      supabase.from("commercial_statuses").select("name").eq("active", true).order("name"),
    ]);
    setSalespersons((sp.data || []).map((d: any) => d.name));
    setCommercialStatuses((cs.data || []).map((d: any) => d.name));
    const uniqueOwners = [...new Set(orders.map((o) => o.dealer_name).filter(Boolean))].sort();
    setOwners(uniqueOwners);
  };

  useEffect(() => { fetchData(); }, []);
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
    if (filters.commercialStatus && o.commercial_status !== filters.commercialStatus) return false;
    return true;
  });

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="p-6">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">Sales</h1>
        <p className="text-sm text-muted-foreground">{orders.length} total orders</p>
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
            <FilterSelect label="Commercial Status" value={filters.commercialStatus} options={commercialStatuses} onChange={(v) => setFilters({ ...filters, commercialStatus: v })} />
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
              <TableHead className="min-w-[100px]">Quotation No</TableHead>
              <TableHead className="min-w-[90px]">SO No</TableHead>
              <TableHead className="min-w-[140px]">Order Name</TableHead>
              <TableHead className="min-w-[120px]">Dealer</TableHead>
              <TableHead className="min-w-[100px]">Salesperson</TableHead>
              <TableHead className="min-w-[100px]">Product Type</TableHead>
              <TableHead className="min-w-[90px]">Shade</TableHead>
              <TableHead className="text-right min-w-[70px]">Windows</TableHead>
              <TableHead className="text-right min-w-[90px]">Order Value</TableHead>
              <TableHead className="text-right min-w-[80px]">Advance</TableHead>
              <TableHead className="text-right min-w-[80px]">Balance</TableHead>
              <TableHead className="min-w-[130px]">Commercial Status</TableHead>
              <TableHead className="text-right min-w-[80px]">Rework Qty</TableHead>
              <TableHead className="min-w-[150px]">Latest Rework Issue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={14} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={14} className="text-center py-8 text-muted-foreground">No orders found</TableCell>
              </TableRow>
            ) : (
              filtered.map((order) => {
                const rework = reworkMap[order.id];
                return (
                  <TableRow key={order.id} className="hover:bg-muted/50">
                    <TableCell className="text-sm">{order.quote_no || "—"}</TableCell>
                    <TableCell className="text-sm">{order.sales_order_no || "—"}</TableCell>
                    <TableCell>
                      <Link to={`/orders/${order.id}`} className="font-medium text-primary hover:underline">{order.order_name}</Link>
                    </TableCell>
                    <TableCell className="text-sm">{order.dealer_name}</TableCell>
                    <TableCell className="text-sm">{order.salesperson || "—"}</TableCell>
                    <TableCell className="text-sm">{order.product_type}</TableCell>
                    <TableCell className="text-sm">{order.colour_shade || "—"}</TableCell>
                    <TableCell className="text-right">{order.total_windows}</TableCell>
                    <TableCell className="text-right font-medium">₹{Number(order.order_value).toLocaleString()}</TableCell>
                    <TableCell className="text-right">₹{Number(order.advance_received).toLocaleString()}</TableCell>
                    <TableCell className="text-right">₹{Number(order.balance_amount).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={commercialColor(order.commercial_status)}>
                        {order.commercial_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{rework?.totalQty || 0}</TableCell>
                    <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">{rework?.latestIssue || "—"}</TableCell>
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
