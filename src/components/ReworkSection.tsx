import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { logActivity } from "@/lib/activityLog";

const REWORK_STATUSES = ["Pending", "In Progress", "Solved", "Closed"];

interface ReworkSectionProps {
  orderId: string;
}

export default function ReworkSection({ orderId }: ReworkSectionProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [qty, setQty] = useState("");
  const [issueType, setIssueType] = useState("");
  const [responsible, setResponsible] = useState("");
  const [solution, setSolution] = useState("");
  const [cost, setCost] = useState("");
  const [status, setStatus] = useState("Pending");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchLogs = async () => {
    const { data } = await (supabase.from("rework_logs" as any) as any)
      .select("*")
      .eq("order_id", orderId)
      .order("reported_at", { ascending: false });
    setLogs(data || []);
  };

  useEffect(() => { fetchLogs(); }, [orderId]);

  const handleAdd = async () => {
    const q = Number(qty) || 0;
    if (q <= 0) return toast.error("Qty must be > 0");
    if (!issueType.trim()) return toast.error("Issue Type is required");

    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await (supabase.from("rework_logs" as any) as any).insert({
      order_id: orderId,
      rework_qty: q,
      rework_issue: issueType.trim(),
      issue_type: issueType.trim(),
      responsible_person: responsible || null,
      solution: solution || null,
      cost: Number(cost) || 0,
      status,
      reported_by: user?.id || null,
      reported_date: format(new Date(), "yyyy-MM-dd"),
    });
    setSubmitting(false);

    if (error) {
      toast.error(error.message);
    } else {
      await logActivity({
        orderId,
        module: "Rework",
        fieldName: "rework_added",
        oldValue: null,
        newValue: `Qty: ${q}, Issue: ${issueType.trim()}`,
      });
      toast.success("Rework logged");
      setQty(""); setIssueType(""); setResponsible(""); setSolution(""); setCost(""); setStatus("Pending"); setRemarks("");
      setShowForm(false);
      fetchLogs();
    }
  };

  const updateStatus = async (log: any, newStatus: string) => {
    const oldStatus = log.status;
    await (supabase.from("rework_logs" as any) as any).update({
      status: newStatus,
      resolved: newStatus === "Solved" || newStatus === "Closed",
      resolved_at: (newStatus === "Solved" || newStatus === "Closed") ? new Date().toISOString() : null,
    }).eq("id", log.id);
    await logActivity({
      orderId,
      module: "Rework",
      fieldName: "rework_status",
      oldValue: oldStatus || "Pending",
      newValue: newStatus,
    });
    fetchLogs();
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "Pending": return "bg-warning/15 text-warning border-warning/20";
      case "In Progress": return "bg-blue-500/15 text-blue-600 border-blue-500/20";
      case "Solved": return "bg-green-500/15 text-green-600 border-green-500/20";
      case "Closed": return "bg-muted text-muted-foreground border-muted";
      default: return "";
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Rework Log ({logs.reduce((s: number, l: any) => s + (l.rework_qty || 0), 0)} total qty)</CardTitle>
        <Button size="sm" className="gap-1" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" /> Add Rework Issue
        </Button>
      </CardHeader>
      <CardContent>
        {showForm && (
          <div className="mb-4 p-3 border rounded-md space-y-3 bg-muted/30">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Qty *</Label>
                <Input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Issue Type *</Label>
                <Input value={issueType} onChange={(e) => setIssueType(e.target.value)} placeholder="e.g. glass scratch" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Responsible</Label>
                <Input value={responsible} onChange={(e) => setResponsible(e.target.value)} placeholder="Person / Team" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Solution</Label>
                <Input value={solution} onChange={(e) => setSolution(e.target.value)} placeholder="Corrective action" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cost</Label>
                <Input type="number" min="0" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REWORK_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={submitting}>{submitting ? "Saving…" : "Save"}</Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No rework entries yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Issue Type</TableHead>
                <TableHead>Responsible</TableHead>
                <TableHead>Solution</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm">{log.reported_date || format(new Date(log.reported_at), "dd MMM yyyy")}</TableCell>
                  <TableCell className="text-right">{log.rework_qty}</TableCell>
                  <TableCell className="text-sm max-w-[150px] truncate" title={log.issue_type || log.rework_issue}>{log.issue_type || log.rework_issue}</TableCell>
                  <TableCell className="text-sm">{log.responsible_person || "—"}</TableCell>
                  <TableCell className="text-sm max-w-[150px] truncate">{log.solution || "—"}</TableCell>
                  <TableCell className="text-right">{log.cost ? `₹${Number(log.cost).toLocaleString()}` : "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColor(log.status || (log.resolved ? "Solved" : "Pending"))}>
                      {log.status || (log.resolved ? "Solved" : "Pending")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Select value={log.status || "Pending"} onValueChange={(val) => updateStatus(log, val)}>
                      <SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {REWORK_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
