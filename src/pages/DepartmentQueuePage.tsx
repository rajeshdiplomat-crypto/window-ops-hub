import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getNextAction } from "@/lib/nextActions";
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
  advance_received: number;
  finance_status: string;
  survey_status: string;
  design_status: string;
  dispatch_status: string;
  installation_status: string;
  commercial_status: string;
  created_at: string;
}

export interface DepartmentConfig {
  key: string;
  label: string;
  description: string;
  /** Role used for next-action logic */
  role: string;
  /** Status field shown in the badge column */
  statusField: string;
  /** Custom filter function */
  filter: (order: any, materials: any, production: any[]) => boolean;
}

export const DEPARTMENTS: DepartmentConfig[] = [
  {
    key: "sales",
    label: "Sales",
    description: "Pipeline and confirmed orders",
    role: "sales",
    statusField: "commercial_status",
    filter: () => true, // show all orders
  },
  {
    key: "survey",
    label: "Survey",
    description: "Orders awaiting site survey",
    role: "survey",
    statusField: "survey_status",
    filter: (o) => o.survey_status === "Pending",
  },
  {
    key: "finance",
    label: "Finance",
    description: "Orders awaiting payment approval",
    role: "finance",
    statusField: "finance_status",
    filter: (o) => o.finance_status === "Pending Approval",
  },
  {
    key: "design",
    label: "Design",
    description: "Orders with survey completed, awaiting design release",
    role: "design",
    statusField: "design_status",
    filter: (o) => o.survey_status === "Completed" && o.design_status === "Pending",
  },
  {
    key: "procurement",
    label: "Procurement",
    description: "Orders where materials are not yet fully received",
    role: "procurement",
    statusField: "design_status",
    filter: (o, mat) => {
      if (o.design_status !== "Released") return false;
      if (!mat) return true;
      return (
        mat.aluminium_status !== "Coating Completed" ||
        mat.glass_status !== "Received" ||
        mat.hardware_status !== "Received"
      );
    },
  },
  {
    key: "quality",
    label: "Quality",
    description: "Orders awaiting quality inspection",
    role: "quality",
    statusField: "design_status",
    filter: (o, _mat, prod) => {
      if (!prod || prod.length === 0) return false;
      const totalAssembly = prod.reduce((s: number, p: any) => s + (p.assembly || 0), 0);
      const totalQc = prod.reduce((s: number, p: any) => s + (p.qc || 0), 0);
      return totalAssembly > 0 && totalQc < o.total_windows;
    },
  },
  {
    key: "dispatch",
    label: "Dispatch",
    description: "Orders packed but not fully dispatched",
    role: "dispatch",
    statusField: "dispatch_status",
    filter: (o, _mat, prod) => {
      if (o.dispatch_status === "Fully Dispatched") return false;
      if (!prod || prod.length === 0) return false;
      const totalPacking = prod.reduce((s: number, p: any) => s + (p.packing || 0), 0);
      return totalPacking > 0;
    },
  },
  {
    key: "installation",
    label: "Installation",
    description: "Dispatched orders awaiting installation",
    role: "installation",
    statusField: "installation_status",
    filter: (o) =>
      (o.dispatch_status === "Partially Dispatched" || o.dispatch_status === "Fully Dispatched") &&
      o.installation_status !== "Completed",
  },
];

interface DepartmentQueuePageProps {
  departmentKey: string;
}

export default function DepartmentQueuePage({ departmentKey }: DepartmentQueuePageProps) {
  const dept = DEPARTMENTS.find((d) => d.key === departmentKey);
  const [orders, setOrders] = useState<Order[]>([]);
  const [materialMap, setMaterialMap] = useState<Record<string, any>>({});
  const [productionMap, setProductionMap] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dept) { setLoading(false); return; }

    const fetchOrders = async () => {
      setLoading(true);
      const [ordersRes, matRes, prodRes] = await Promise.all([
        supabase.from("orders").select("*").order("created_at", { ascending: false }),
        supabase.from("material_status").select("*"),
        supabase.from("production_status").select("*"),
      ]);

      if (ordersRes.error) { toast.error("Failed to load orders"); setLoading(false); return; }

      const allOrders = (ordersRes.data || []) as any[];
      const materials = (matRes.data || []) as any[];
      const productions = (prodRes.data || []) as any[];

      const matMap: Record<string, any> = {};
      materials.forEach((m) => { matMap[m.order_id] = m; });
      setMaterialMap(matMap);

      const prodMap: Record<string, any[]> = {};
      productions.forEach((p) => {
        if (!prodMap[p.order_id]) prodMap[p.order_id] = [];
        prodMap[p.order_id].push(p);
      });
      setProductionMap(prodMap);

      const filtered = allOrders.filter((o) =>
        dept.filter(o, matMap[o.id] || null, prodMap[o.id] || [])
      );

      setOrders(filtered as Order[]);
      setLoading(false);
    };

    fetchOrders();
  }, [departmentKey]);

  if (!dept) {
    return <div className="p-6 text-muted-foreground">Department not found.</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{dept.label}</h1>
        <p className="text-sm text-muted-foreground">{dept.description} — {orders.length} orders</p>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order Name</TableHead>
              <TableHead>Dealer</TableHead>
              <TableHead>Windows</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Next Action</TableHead>
              <TableHead className="text-right">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No orders in this queue</TableCell>
              </TableRow>
            ) : (
              orders.map((order) => {
                const statusValue = (order as any)[dept.statusField] as string;
                const nextAction = getNextAction(
                  dept.role as any,
                  order,
                  materialMap[order.id] || null,
                  productionMap[order.id] || null,
                );
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
                    <TableCell className="text-sm text-muted-foreground max-w-[200px]">
                      {nextAction}
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
