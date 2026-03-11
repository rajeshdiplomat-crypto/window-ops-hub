import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface SettingsItem {
  id: string;
  name: string;
  active: boolean;
}

interface CreateOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export default function CreateOrderDialog({ open, onOpenChange, onCreated }: CreateOrderDialogProps) {
  const [orderType, setOrderType] = useState<"Retail" | "Project">("Retail");
  const [orderName, setOrderName] = useState("");
  const [orderOwner, setOrderOwner] = useState("");
  const [soNo, setSoNo] = useState("");
  const [colourShade, setColourShade] = useState("");
  const [salesperson, setSalesperson] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [qty, setQty] = useState("");
  const [sqft, setSqft] = useState("");
  const [orderValue, setOrderValue] = useState("");
  const [advanceReceived, setAdvanceReceived] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Settings data
  const [projectNames, setProjectNames] = useState<SettingsItem[]>([]);
  const [dealers, setDealers] = useState<SettingsItem[]>([]);
  const [projectClients, setProjectClients] = useState<SettingsItem[]>([]);
  const [colourShades, setColourShades] = useState<SettingsItem[]>([]);
  const [salespersons, setSalespersons] = useState<SettingsItem[]>([]);
  const [products, setProducts] = useState<SettingsItem[]>([]);

  useEffect(() => {
    if (!open) return;
    const fetchAll = async () => {
      const [pn, dl, pc, cs, sp, opt] = await Promise.all([
        supabase.from("project_names" as any).select("*").eq("active", true).order("name") as any,
        supabase.from("dealers").select("*").eq("active", true).order("name"),
        supabase.from("project_client_names" as any).select("*").eq("active", true).order("name") as any,
        supabase.from("colour_shades").select("*").eq("active", true).order("name"),
        supabase.from("salespersons").select("*").eq("active", true).order("name"),
        supabase.from("other_product_types" as any).select("*").eq("active", true).order("name") as any,
      ]);
      setProjectNames((pn.data as SettingsItem[]) || []);
      setDealers((dl.data as SettingsItem[]) || []);
      setProjectClients((pc.data as SettingsItem[]) || []);
      setColourShades((cs.data as SettingsItem[]) || []);
      setSalespersons((sp.data as SettingsItem[]) || []);
      setProducts((opt.data as SettingsItem[]) || []);
    };
    fetchAll();
  }, [open]);

  const ownerOptions = [
    ...dealers.map((d) => ({ label: `${d.name} (Dealer)`, value: d.name })),
    ...projectClients.map((c) => ({ label: `${c.name} (Client)`, value: c.name })),
  ];

  const resetForm = () => {
    setOrderType("Retail");
    setOrderName("");
    setOrderOwner("");
    setSoNo("");
    setColourShade("");
    setSalesperson("");
    setSelectedProducts([]);
    setQty("");
    setSqft("");
    setOrderValue("");
    setAdvanceReceived(false);
    setAdvanceAmount("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    if (!orderName.trim()) return toast.error("Order Name is required");
    if (selectedProducts.length === 0) return toast.error("Select at least one product");
    if (advanceReceived && Number(advanceAmount) > Number(orderValue)) return toast.error("Advance cannot exceed Order Value");

    // Quotation number uniqueness check
    if (soNo.trim()) {
      const { data: existing } = await supabase
        .from("orders")
        .select("id")
        .eq("quote_no", soNo.trim())
        .maybeSingle();
      if (existing) return toast.error("Quotation Number already exists");
    }

    setSubmitting(true);
    const payload: Record<string, any> = {
      order_type: orderType,
      order_name: orderName.trim(),
      dealer_name: orderOwner,
      quote_no: soNo.trim() || null,
      colour_shade: colourShade || null,
      salesperson: salesperson || null,
      product_type: selectedProducts.join(", "),
      other_product_type: null,
      total_windows: Number(qty) || 0,
      sqft: Number(sqft) || 0,
      order_value: Number(orderValue) || 0,
      advance_received: advanceReceived ? Number(advanceAmount) || 0 : 0,
    };

    const { error } = await supabase.from("orders").insert(payload);
    setSubmitting(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Order created");
      resetForm();
      onOpenChange(false);
      onCreated();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Order</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            {/* LEFT COLUMN - Order Identity */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Order Type</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={orderType === "Retail"}
                      onCheckedChange={() => { setOrderType("Retail"); setOrderName(""); }}
                    />
                    <span className="text-sm">Retail</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={orderType === "Project"}
                      onCheckedChange={() => { setOrderType("Project"); setOrderName(""); }}
                    />
                    <span className="text-sm">Project</span>
                  </label>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Order Name *</Label>
                {orderType === "Retail" ? (
                  <Input
                    value={orderName}
                    onChange={(e) => setOrderName(e.target.value)}
                    placeholder="Enter order name"
                    required
                  />
                ) : (
                  <Select value={orderName} onValueChange={setOrderName}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projectNames.map((p) => (
                        <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Order Owner</Label>
                <Select value={orderOwner} onValueChange={setOrderOwner}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select owner" />
                  </SelectTrigger>
                  <SelectContent>
                    {ownerOptions.map((o) => (
                      <SelectItem key={o.value + o.label} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Quotation No</Label>
                <Input
                  value={soNo}
                  onChange={(e) => setSoNo(e.target.value)}
                  placeholder="Quotation number"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Colour Shade</Label>
                <Select value={colourShade} onValueChange={setColourShade}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select shade" />
                  </SelectTrigger>
                  <SelectContent>
                    {colourShades.map((c) => (
                      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Salesperson</Label>
                <Select value={salesperson} onValueChange={setSalesperson}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select salesperson" />
                  </SelectTrigger>
                  <SelectContent>
                    {salespersons.map((s) => (
                      <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* RIGHT COLUMN - Commercial Data */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Products *</Label>
                <div className="flex flex-wrap gap-3">
                  {products.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={selectedProducts.includes(p.name)}
                        onCheckedChange={(checked) => {
                          setSelectedProducts((prev) =>
                            checked ? [...prev, p.name] : prev.filter((n) => n !== p.name)
                          );
                        }}
                      />
                      <span className="text-sm">{p.name}</span>
                    </label>
                  ))}
                  {products.length === 0 && (
                    <span className="text-sm text-muted-foreground">No products configured in Settings</span>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Qty</Label>
                <Input
                  type="number"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  placeholder="0"
                  min="0"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Sqft</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={sqft}
                  onChange={(e) => setSqft(e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Order Value (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={orderValue}
                  onChange={(e) => setOrderValue(e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={advanceReceived}
                    onCheckedChange={(v) => {
                      setAdvanceReceived(!!v);
                      if (!v) setAdvanceAmount("");
                    }}
                  />
                  <span className="text-sm">Advance Received?</span>
                </label>
                {advanceReceived && (
                  <div className="space-y-1.5">
                    <Label className="text-sm">Advance Amount (₹)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={advanceAmount}
                      onChange={(e) => setAdvanceAmount(e.target.value)}
                      placeholder="0"
                      max={orderValue || undefined}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Creating…" : "Create Order"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
