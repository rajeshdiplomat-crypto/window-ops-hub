import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { logActivity } from "@/lib/activityLog";
import { format } from "date-fns";

interface Payment {
  id: string;
  amount: number;
  payment_date: string | null;
  payment_mode: string | null;
  created_at: string;
}

const APPROVAL_OPTIONS = ["Pending", "Approved", "Hold"];

export default function FinanceSection({ orderId, order, onRefresh }: {
  orderId: string;
  order: any;
  onRefresh: () => void;
}) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentMode, setPaymentMode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchPayments = async () => {
    const { data } = await (supabase.from("payment_logs" as any) as any)
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });
    setPayments((data || []) as Payment[]);
  };

  useEffect(() => { fetchPayments(); }, [orderId]);

  const totalReceipt = payments.reduce((s, p) => s + Number(p.amount), 0);
  const balance = Number(order.order_value) - totalReceipt;

  const handleAddPayment = async () => {
    if (!amount || Number(amount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    await (supabase.from("payment_logs" as any) as any).insert({
      order_id: orderId,
      amount: Number(amount),
      payment_date: paymentDate || null,
      payment_mode: paymentMode || null,
      entered_by: user?.id || null,
    });
    await logActivity({
      orderId,
      module: "Finance",
      fieldName: "payment",
      oldValue: null,
      newValue: `₹${Number(amount).toLocaleString()} via ${paymentMode || "N/A"}`,
    });
    toast.success("Payment recorded");
    setAmount("");
    setPaymentDate("");
    setPaymentMode("");
    setAddOpen(false);
    setSubmitting(false);
    fetchPayments();
    onRefresh();
  };

  const updateApproval = async (field: string, value: string) => {
    const oldVal = order[field];
    if (oldVal === value) return;
    await supabase.from("orders").update({ [field]: value }).eq("id", orderId);
    await logActivity({
      orderId,
      module: "Finance",
      fieldName: field,
      oldValue: oldVal,
      newValue: value,
    });
    toast.success("Updated");
    onRefresh();
  };

  const updateRemarks = async (value: string) => {
    const oldVal = order.finance_remarks;
    if (oldVal === value) return;
    await supabase.from("orders").update({ finance_remarks: value } as any).eq("id", orderId);
    await logActivity({
      orderId,
      module: "Finance",
      fieldName: "finance_remarks",
      oldValue: oldVal,
      newValue: value,
    });
    toast.success("Remarks updated");
    onRefresh();
  };

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Order Value</p>
            <p className="text-lg font-semibold">₹{Number(order.order_value).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Total Receipt</p>
            <p className="text-lg font-semibold text-success">₹{totalReceipt.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Balance</p>
            <p className="text-lg font-semibold">{balance < 0 ? "-" : ""}₹{Math.abs(balance).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Payments</p>
            <p className="text-lg font-semibold">{payments.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Approvals and Remarks */}
      <Card>
        <CardHeader><CardTitle className="text-base">Approvals & Remarks</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Approval for Production</Label>
              <Select value={order.approval_for_production || "Pending"} onValueChange={(v) => updateApproval("approval_for_production", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {APPROVAL_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Approval for Dispatch</Label>
              <Select value={order.approval_for_dispatch || "Pending"} onValueChange={(v) => updateApproval("approval_for_dispatch", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {APPROVAL_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 col-span-2 md:col-span-1">
              <Label className="text-xs text-muted-foreground">Remarks</Label>
              <Textarea
                className="min-h-[60px]"
                defaultValue={order.finance_remarks || ""}
                onBlur={(e) => updateRemarks(e.target.value)}
                placeholder="Finance notes..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Payment History</CardTitle>
          <Button size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add Payment
          </Button>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Recorded At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.payment_date || "—"}</TableCell>
                    <TableCell className="text-right font-medium">₹{Number(p.amount).toLocaleString()}</TableCell>
                    <TableCell>{p.payment_mode || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(p.created_at), "dd MMM yyyy, HH:mm")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Payment Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Payment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Amount</Label>
              <Input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter amount" />
            </div>
            <div className="space-y-1">
              <Label>Payment Date</Label>
              <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Payment Mode</Label>
              <Select value={paymentMode} onValueChange={setPaymentMode}>
                <SelectTrigger><SelectValue placeholder="Select mode..." /></SelectTrigger>
                <SelectContent>
                  {["Cash", "Bank Transfer", "Cheque", "UPI", "Other"].map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddPayment} disabled={submitting}>
              {submitting ? "Saving..." : "Save Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
