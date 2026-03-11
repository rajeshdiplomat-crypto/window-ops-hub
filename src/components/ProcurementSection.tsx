import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { logActivity } from "@/lib/activityLog";

const PO_STATUSES = ["Not Required", "PO Placed", "Delivered"];
const COATING_STATUSES = ["Not Required", "Sent to Coating", "Delivered"];

const PO_FIELDS = [
  { label: "Hardware PO", field: "hardware_po_status", dateField: "hardware_delivery_date", statuses: PO_STATUSES },
  { label: "Extrusion PO", field: "extrusion_po_status", dateField: "extrusion_delivery_date", statuses: PO_STATUSES },
  { label: "Glass PO", field: "glass_po_status", dateField: "glass_delivery_date", statuses: PO_STATUSES },
  { label: "Sent to Coating", field: "coating_status", dateField: "coating_delivery_date", statuses: COATING_STATUSES },
];

interface ProcurementSectionProps {
  orderId: string;
  order: any;
  onRefresh: () => void;
}

export default function ProcurementSection({ orderId, order, onRefresh }: ProcurementSectionProps) {
  const updateField = async (field: string, value: string | null) => {
    const oldValue = order[field];
    if (String(oldValue ?? "") === String(value ?? "")) return;
    
    // Auto-update store availability when procurement marks "Delivered"
    const updates: Record<string, any> = { [field]: value };
    if (value === "Delivered") {
      const storeFieldMap: Record<string, string> = {
        hardware_po_status: "hardware_availability",
        extrusion_po_status: "extrusion_availability",
        glass_po_status: "glass_availability",
        coating_status: "coated_extrusion_availability",
      };
      const storeField = storeFieldMap[field];
      if (storeField && order[storeField] !== "Delivered") {
        updates[storeField] = "Delivered";
        await logActivity({ orderId, module: "Procurement", fieldName: storeField, oldValue: String(order[storeField] ?? ""), newValue: "Delivered" });
      }
    }

    const { error } = await supabase.from("orders").update(updates as any).eq("id", orderId);
    if (error) { toast.error(error.message); return; }
    await logActivity({ orderId, module: "Procurement", fieldName: field, oldValue: String(oldValue ?? ""), newValue: String(value ?? "") });
    toast.success("Updated");
    onRefresh();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Procurement — PO & Delivery Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {PO_FIELDS.map((f) => (
            <div key={f.field} className="space-y-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{f.label}</Label>
                <Select value={order[f.field] || f.statuses[0]} onValueChange={(v) => updateField(f.field, v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {f.statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {(order[f.field] === "PO Placed" || order[f.field] === "Sent to Coating") && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Delivery By</Label>
                  <Input
                    type="date"
                    defaultValue={order[f.dateField] || ""}
                    onBlur={(e) => updateField(f.dateField, e.target.value || null)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Procurement Remarks</Label>
          <Textarea
            defaultValue={order.procurement_remarks || ""}
            rows={2}
            onBlur={(e) => {
              if (e.target.value !== (order.procurement_remarks || "")) updateField("procurement_remarks", e.target.value);
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
