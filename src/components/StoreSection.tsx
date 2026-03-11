import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { logActivity } from "@/lib/activityLog";

const AVAILABILITY_VALUES = ["No", "Yes", "Partially Available", "Delivered"];

const FIELDS = [
  { label: "Hardware Availability", field: "hardware_availability" },
  { label: "Extrusion Availability", field: "extrusion_availability" },
  { label: "Glass Availability", field: "glass_availability" },
  { label: "Coated Extrusion Availability", field: "coated_extrusion_availability" },
];

interface StoreSectionProps {
  orderId: string;
  order: any;
  onRefresh: () => void;
}

export default function StoreSection({ orderId, order, onRefresh }: StoreSectionProps) {
  const updateField = async (field: string, value: string) => {
    const oldValue = order[field];
    if (String(oldValue ?? "") === String(value ?? "")) return;
    const { error } = await supabase.from("orders").update({ [field]: value } as any).eq("id", orderId);
    if (error) { toast.error(error.message); return; }
    await logActivity({ orderId, module: "Store", fieldName: field, oldValue: String(oldValue ?? ""), newValue: value });
    toast.success("Updated");
    onRefresh();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Store — Material Availability</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {FIELDS.map((f) => (
            <div key={f.field} className="space-y-1">
              <Label className="text-xs text-muted-foreground">{f.label}</Label>
              <Select value={order[f.field] || "No"} onValueChange={(v) => updateField(f.field, v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AVAILABILITY_VALUES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Store Remarks</Label>
          <Textarea
            defaultValue={order.store_remarks || ""}
            rows={2}
            onBlur={(e) => {
              if (e.target.value !== (order.store_remarks || "")) updateField("store_remarks", e.target.value);
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
