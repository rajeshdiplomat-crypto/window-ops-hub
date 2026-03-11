import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import StatusDropdown from "@/components/StatusDropdown";
import { STATUS_OPTIONS, STATUS_LABELS, type StatusField } from "@/lib/statusConfig";
import { logAuditEntry } from "@/lib/auditLog";
import { triggerStatusNotification } from "@/lib/notifications";
import { checkMaterialDependency } from "@/lib/nextActions";
import ReworkSection from "@/components/ReworkSection";
import FinanceSection from "@/components/FinanceSection";
import SurveySection from "@/components/SurveySection";
import DesignSection from "@/components/DesignSection";
import StoreSection from "@/components/StoreSection";
import ProcurementSection from "@/components/ProcurementSection";
import ProductionSection from "@/components/ProductionSection";
import DispatchSection from "@/components/DispatchSection";
import { logActivity } from "@/lib/activityLog";

const STATUS_FIELDS: StatusField[] = [
  "commercial_status", "finance_status", "survey_status",
  "design_status", "dispatch_status", "installation_status",
];

const MATERIAL_STATUSES = ["Not Procured", "PO Released", "Received"];
const ALUMINIUM_STATUSES = ["Not Procured", "PO Released", "Received", "Sent for Coating", "Coating Completed"];
const INSTALLATION_STATUSES = ["Pending", "Planned", "Completed"];

function MaterialFields({ material, onRefresh }: { material: any; onRefresh: () => void }) {
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    supabase.from("coating_vendors").select("id, name").eq("active", true).then(({ data }) => setVendors((data as any[]) || []));
  }, []);

  const updateField = async (field: string, value: any) => {
    const oldVal = material[field];
    if (String(oldVal ?? "") === String(value ?? "")) return;
    await logAuditEntry({ entityType: "material_status", entityId: material.id, field, oldValue: oldVal != null ? String(oldVal) : null, newValue: value != null ? String(value) : null });
    await supabase.from("material_status").update({ [field]: value }).eq("id", material.id);
    onRefresh();
  };

  return (
    <div className="space-y-4">
      {/* Material statuses as dropdowns */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Aluminium Status</Label>
          <Select value={material.aluminium_status} onValueChange={(v) => updateField("aluminium_status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ALUMINIUM_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Glass Status</Label>
          <Select value={material.glass_status} onValueChange={(v) => updateField("glass_status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {MATERIAL_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Hardware Status</Label>
          <Select value={material.hardware_status} onValueChange={(v) => updateField("hardware_status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {MATERIAL_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Expected dates */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Aluminium Expected Date", field: "aluminium_expected_date" },
          { label: "Glass Expected Date", field: "glass_expected_date" },
          { label: "Hardware Expected Date", field: "hardware_expected_date" },
        ].map((f) => (
          <div key={f.field} className="space-y-1">
            <Label className="text-xs text-muted-foreground">{f.label}</Label>
            <Input type="date" defaultValue={material[f.field] || ""} onBlur={(e) => updateField(f.field, e.target.value || null)} />
          </div>
        ))}
      </div>

      {/* Coating vendor */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Coating Vendor</Label>
          <Select value={material.coating_vendor || ""} onValueChange={(v) => updateField("coating_vendor", v)}>
            <SelectTrigger><SelectValue placeholder="Select vendor..." /></SelectTrigger>
            <SelectContent>
              {vendors.map((v) => <SelectItem key={v.id} value={v.name}>{v.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

function AddUnitButton({ orderId, onAdded }: { orderId: string; onAdded: () => void }) {
  const [units, setUnits] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    supabase.from("production_units").select("id, name").eq("active", true).then(({ data }) => setUnits((data as any[]) || []));
  }, []);
  return (
    <Select onValueChange={async (unitName) => {
      await supabase.from("production_status").insert({ order_id: orderId, unit: unitName } as any);
      onAdded();
    }}>
      <SelectTrigger className="w-36 h-8 text-xs">
        <SelectValue placeholder="Add unit..." />
      </SelectTrigger>
      <SelectContent>
        {units.map((u) => (
          <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [material, setMaterial] = useState<any>(null);
  const [production, setProduction] = useState<any[]>([]);
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [installation, setInstallation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    if (!id) return;
    const [oRes, mRes, pRes, dRes, iRes] = await Promise.all([
      supabase.from("orders").select("*").eq("id", id).single(),
      supabase.from("material_status").select("*").eq("order_id", id).maybeSingle(),
      supabase.from("production_status").select("*").eq("order_id", id),
      supabase.from("dispatch").select("*").eq("order_id", id),
      supabase.from("installation").select("*").eq("order_id", id).maybeSingle(),
    ]);
    if (oRes.error) { toast.error("Order not found"); return; }
    setOrder(oRes.data);
    setMaterial(mRes.data);
    setProduction(pRes.data || []);
    setDispatches(dRes.data || []);
    setInstallation(iRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [id]);

  const updateOrder = async (field: string, value: any) => {
    const oldValue = order[field];
    const { error } = await supabase.from("orders").update({ [field]: value }).eq("id", id!);
    if (error) toast.error(error.message);
    else {
      await logAuditEntry({
        entityType: "orders",
        entityId: id!,
        field,
        oldValue: oldValue != null ? String(oldValue) : null,
        newValue: value != null ? String(value) : null,
      });
      // Fire in-app notifications for status changes
      if (field.endsWith("_status")) {
        triggerStatusNotification(id!, order.order_name, field, String(value));
      }
      toast.success("Updated");
      fetchAll();
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>;
  if (!order) return <div className="flex items-center justify-center h-full text-muted-foreground">Order not found</div>;

  return (
    <div className="p-6 max-w-5xl">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to Orders
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{order.order_name}</h1>
          <p className="text-sm text-muted-foreground">
            {order.dealer_name} · {order.salesperson || "No salesperson"} · Quote: {order.quote_no || "—"}
          </p>
        </div>
        <Badge variant="outline" className="text-sm">{order.commercial_status}</Badge>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Windows", value: order.total_windows },
          { label: "Sqft", value: Number(order.sqft).toFixed(1) },
          { label: "Order Value", value: `₹${Number(order.order_value).toLocaleString()}` },
          { label: "Balance", value: `₹${Number(order.balance_amount).toLocaleString()}` },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-lg font-semibold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="statuses">
        <TabsList className="flex-wrap">
          <TabsTrigger value="statuses">Statuses</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="survey">Survey</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
          <TabsTrigger value="design">Design</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="production">Production</TabsTrigger>
          <TabsTrigger value="dispatch">Dispatch</TabsTrigger>
          <TabsTrigger value="installation">Installation</TabsTrigger>
          <TabsTrigger value="rework">Rework</TabsTrigger>
        </TabsList>

        <TabsContent value="statuses" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Workflow Statuses</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {STATUS_FIELDS.map((field) => (
                  <StatusDropdown
                    key={field}
                    field={field}
                    value={order[field] || STATUS_OPTIONS[field][0]}
                    onValueChange={(val) => updateOrder(field, val)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Order Details</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Sales Order No", field: "sales_order_no" },
                  { label: "Colour / Shade", field: "colour_shade" },
                  { label: "Windows Released", field: "windows_released" },
                  { label: "Advance Received", field: "advance_received" },
                ].map((f) => (
                  <div key={f.field} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{f.label}</Label>
                    <Input
                      defaultValue={order[f.field] ?? ""}
                      onBlur={(e) => {
                        const val = e.target.value;
                        if (val !== (order[f.field] ?? "").toString()) updateOrder(f.field, val);
                      }}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="survey" className="mt-4">
          <SurveySection orderId={id!} order={order} onRefresh={fetchAll} />
        </TabsContent>

        <TabsContent value="finance" className="mt-4">
          <FinanceSection orderId={id!} order={order} onRefresh={fetchAll} />
        </TabsContent>

        <TabsContent value="design" className="mt-4">
          <DesignSection orderId={id!} order={order} onRefresh={fetchAll} />
        </TabsContent>

        <TabsContent value="materials" className="mt-4 space-y-4">
          <StoreSection orderId={id!} order={order} onRefresh={fetchAll} />
          <ProcurementSection orderId={id!} order={order} onRefresh={fetchAll} />
        </TabsContent>

        <TabsContent value="production" className="mt-4">
          <ProductionSection orderId={id!} order={order} onRefresh={fetchAll} />
        </TabsContent>

        <TabsContent value="dispatch" className="mt-4">
          <DispatchSection orderId={id!} order={order} onRefresh={fetchAll} />
        </TabsContent>

        <TabsContent value="installation" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Installation</CardTitle>
              {!installation && (
                <Button size="sm" onClick={async () => {
                  await supabase.from("installation").insert({ order_id: id });
                  fetchAll();
                }}>Initialize</Button>
              )}
            </CardHeader>
            {installation && (
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Planned Date</Label>
                    <Input type="date" defaultValue={installation.installation_planned || ""} onBlur={async (e) => {
                      await logAuditEntry({ entityType: "installation", entityId: installation.id, field: "installation_planned", oldValue: installation.installation_planned, newValue: e.target.value || null });
                      await supabase.from("installation").update({ installation_planned: e.target.value || null }).eq("id", installation.id);
                      fetchAll();
                    }} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Completed Date</Label>
                    <Input type="date" defaultValue={installation.installation_completed || ""} onBlur={async (e) => {
                      await logAuditEntry({ entityType: "installation", entityId: installation.id, field: "installation_completed", oldValue: installation.installation_completed, newValue: e.target.value || null });
                      await supabase.from("installation").update({ installation_completed: e.target.value || null }).eq("id", installation.id);
                      fetchAll();
                    }} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Installation Status</Label>
                    <Select value={installation.installation_status} onValueChange={async (val) => {
                      await logAuditEntry({ entityType: "installation", entityId: installation.id, field: "installation_status", oldValue: installation.installation_status, newValue: val });
                      await supabase.from("installation").update({ installation_status: val }).eq("id", installation.id);
                      fetchAll();
                    }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Pending", "Planned", "Completed"].map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </TabsContent>
        <TabsContent value="rework" className="mt-4">
          <ReworkSection orderId={id!} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
