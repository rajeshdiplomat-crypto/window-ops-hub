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

const STAGES = ["cutting", "assembly", "glazing", "qc", "packing"] as const;
const STAGE_LABELS: Record<string, string> = {
  cutting: "Cutting", assembly: "Assembly", glazing: "Glazing", qc: "QC", packing: "Packing",
};

const STATUS_FIELDS: StatusField[] = [
  "commercial_status", "finance_status", "survey_status",
  "design_status", "dispatch_status", "installation_status",
];

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
        <TabsList>
          <TabsTrigger value="statuses">Statuses</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="production">Production</TabsTrigger>
          <TabsTrigger value="dispatch">Dispatch</TabsTrigger>
          <TabsTrigger value="installation">Installation</TabsTrigger>
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

        <TabsContent value="materials" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Material Status</CardTitle>
              {!material && (
                <Button size="sm" onClick={async () => {
                  await supabase.from("material_status").insert({ order_id: id });
                  fetchAll();
                }}>Initialize</Button>
              )}
            </CardHeader>
            {material && (
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {["aluminium_status", "glass_status", "hardware_status"].map((f) => (
                    <div key={f} className="space-y-1">
                      <Label className="text-xs text-muted-foreground capitalize">{f.replace(/_/g, " ")}</Label>
                      <Input
                        defaultValue={material[f]}
                        onBlur={async (e) => {
                          if (e.target.value !== material[f]) {
                            await logAuditEntry({ entityType: "material_status", entityId: material.id, field: f, oldValue: material[f], newValue: e.target.value });
                            await supabase.from("material_status").update({ [f]: e.target.value }).eq("id", material.id);
                            fetchAll();
                          }
                        }}
                      />
                    </div>
                  ))}
                  {["aluminium_expected_date", "glass_expected_date", "hardware_expected_date"].map((f) => (
                    <div key={f} className="space-y-1">
                      <Label className="text-xs text-muted-foreground capitalize">{f.replace(/_/g, " ")}</Label>
                      <Input
                        type="date"
                        defaultValue={material[f] || ""}
                        onBlur={async (e) => {
                          await supabase.from("material_status").update({ [f]: e.target.value || null }).eq("id", material.id);
                          fetchAll();
                        }}
                      />
                    </div>
                  ))}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Coating Vendor</Label>
                    <Input
                      defaultValue={material.coating_vendor || ""}
                      onBlur={async (e) => {
                        await supabase.from("material_status").update({ coating_vendor: e.target.value }).eq("id", material.id);
                        fetchAll();
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="production" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Production Status ({order.total_windows} total windows)</CardTitle>
              <AddUnitButton orderId={id!} onAdded={fetchAll} />
            </CardHeader>
            <CardContent>
              {production.length === 0 ? (
                <p className="text-sm text-muted-foreground">No production entries yet. Add a unit to start tracking.</p>
              ) : (
                <div className="space-y-4">
                  {production.map((p) => (
                    <div key={p.id} className="rounded-md border p-4">
                      <p className="font-medium text-sm mb-3">{p.unit || "Unit"}</p>
                      <div className="grid grid-cols-5 gap-3">
                        {STAGES.map((stage) => (
                          <div key={stage} className="space-y-1">
                            <Label className="text-xs text-muted-foreground">{STAGE_LABELS[stage]}</Label>
                            <Input
                              type="number"
                              min={0}
                              max={order.total_windows}
                              defaultValue={p[stage] || 0}
                              onBlur={async (e) => {
                                const newVal = Number(e.target.value) || 0;
                                if (newVal !== p[stage]) {
                                  await logAuditEntry({ entityType: "production_status", entityId: p.id, field: stage, oldValue: String(p[stage]), newValue: String(newVal) });
                                  await supabase.from("production_status").update({ [stage]: newVal }).eq("id", p.id);
                                  fetchAll();
                                }
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dispatch" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Dispatch</CardTitle>
              <Button size="sm" onClick={async () => {
                await supabase.from("dispatch").insert({ order_id: id });
                fetchAll();
              }}>Add Dispatch</Button>
            </CardHeader>
            <CardContent>
              {dispatches.length === 0 ? (
                <p className="text-sm text-muted-foreground">No dispatches yet.</p>
              ) : (
                <div className="space-y-3">
                  {dispatches.map((d) => (
                    <div key={d.id} className="grid grid-cols-2 gap-3 rounded-md border p-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Windows Dispatched</Label>
                        <Input type="number" defaultValue={d.windows_dispatched} onBlur={async (e) => {
                          await supabase.from("dispatch").update({ windows_dispatched: Number(e.target.value) }).eq("id", d.id);
                          fetchAll();
                        }} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Dispatch Date</Label>
                        <Input type="date" defaultValue={d.dispatch_date || ""} onBlur={async (e) => {
                          await supabase.from("dispatch").update({ dispatch_date: e.target.value || null }).eq("id", d.id);
                          fetchAll();
                        }} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Transporter</Label>
                        <Input defaultValue={d.transporter || ""} onBlur={async (e) => {
                          await supabase.from("dispatch").update({ transporter: e.target.value }).eq("id", d.id);
                          fetchAll();
                        }} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Vehicle Details</Label>
                        <Input defaultValue={d.vehicle_details || ""} onBlur={async (e) => {
                          await supabase.from("dispatch").update({ vehicle_details: e.target.value }).eq("id", d.id);
                          fetchAll();
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
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
                      await supabase.from("installation").update({ installation_planned: e.target.value || null }).eq("id", installation.id);
                      fetchAll();
                    }} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Completed Date</Label>
                    <Input type="date" defaultValue={installation.installation_completed || ""} onBlur={async (e) => {
                      await supabase.from("installation").update({ installation_completed: e.target.value || null }).eq("id", installation.id);
                      fetchAll();
                    }} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <Input defaultValue={installation.installation_status} onBlur={async (e) => {
                      await logAuditEntry({ entityType: "installation", entityId: installation.id, field: "installation_status", oldValue: installation.installation_status, newValue: e.target.value });
                      await supabase.from("installation").update({ installation_status: e.target.value }).eq("id", installation.id);
                      fetchAll();
                    }} />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
