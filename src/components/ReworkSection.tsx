import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { logActivity } from "@/lib/activityLog";

interface ReworkLog {
  id: string;
  order_id: string;
  rework_qty: number;
  rework_issue: string;
  reported_by: string | null;
  reported_at: string;
  resolved: boolean;
  resolved_at: string | null;
}

interface ReworkSectionProps {
  orderId: string;
}

export default function ReworkSection({ orderId }: ReworkSectionProps) {
  const [logs, setLogs] = useState<ReworkLog[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [qty, setQty] = useState("");
  const [issue, setIssue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  const fetchLogs = async () => {
    const { data } = await (supabase.from("rework_logs" as any) as any)
      .select("*")
      .eq("order_id", orderId)
      .order("reported_at", { ascending: false });
    const items = (data || []) as ReworkLog[];
    setLogs(items);

    // Fetch reporter names
    const userIds = [...new Set(items.map((l) => l.reported_by).filter(Boolean))] as string[];
    if (userIds.length > 0) {
      const { data: profs } = await supabase.from("profiles").select("user_id, name").in("user_id", userIds);
      const map: Record<string, string> = {};
      (profs || []).forEach((p: any) => { map[p.user_id] = p.name; });
      setProfiles(map);
    }
  };

  useEffect(() => { fetchLogs(); }, [orderId]);

  const handleAdd = async () => {
    const q = Number(qty) || 0;
    if (q <= 0) return toast.error("Rework Qty must be > 0");
    if (!issue.trim()) return toast.error("Rework Issue is required");

    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await (supabase.from("rework_logs" as any) as any).insert({
      order_id: orderId,
      rework_qty: q,
      rework_issue: issue.trim(),
      reported_by: user?.id || null,
    });
    setSubmitting(false);

    if (error) {
      toast.error(error.message);
    } else {
      await logActivity({
        orderId,
        module: "rework",
        fieldName: "rework_added",
        oldValue: null,
        newValue: `Qty: ${q}, Issue: ${issue.trim()}`,
      });
      toast.success("Rework logged");
      setQty("");
      setIssue("");
      setShowForm(false);
      fetchLogs();
    }
  };

  const toggleResolved = async (log: ReworkLog) => {
    const newResolved = !log.resolved;
    await (supabase.from("rework_logs" as any) as any).update({
      resolved: newResolved,
      resolved_at: newResolved ? new Date().toISOString() : null,
    }).eq("id", log.id);
    await logActivity({
      orderId,
      module: "rework",
      fieldName: "rework_resolved",
      oldValue: String(log.resolved),
      newValue: String(newResolved),
    });
    fetchLogs();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Rework Log ({logs.reduce((s, l) => s + l.rework_qty, 0)} total)</CardTitle>
        <Button size="sm" className="gap-1" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" /> Add Rework
        </Button>
      </CardHeader>
      <CardContent>
        {showForm && (
          <div className="mb-4 p-3 border rounded-md space-y-3 bg-muted/30">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Rework Qty *</Label>
                <Input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Rework Issue *</Label>
              <Textarea value={issue} onChange={(e) => setIssue(e.target.value)} placeholder="Describe the issue..." rows={2} />
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
                <TableHead>Issue</TableHead>
                <TableHead>Reported By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm">{format(new Date(log.reported_at), "dd MMM yyyy")}</TableCell>
                  <TableCell className="text-right">{log.rework_qty}</TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate" title={log.rework_issue}>{log.rework_issue}</TableCell>
                  <TableCell className="text-sm">{log.reported_by ? profiles[log.reported_by] || "—" : "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={log.resolved ? "bg-success/15 text-success border-success/20" : "bg-warning/15 text-warning border-warning/20"}>
                      {log.resolved ? "Resolved" : "Open"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => toggleResolved(log)}>
                      {log.resolved ? "Reopen" : "Resolve"}
                    </Button>
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
