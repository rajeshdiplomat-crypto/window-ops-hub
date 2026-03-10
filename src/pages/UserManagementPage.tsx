import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";

const ALL_ROLES = [
  "sales", "finance", "survey", "design", "procurement",
  "stores", "production", "quality", "dispatch", "installation",
  "management", "admin",
] as const;

interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  active: boolean;
  created_at: string;
}

interface UserRole {
  id: string;
  user_id: string;
  role: string;
}

export default function UserManagementPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [editUserId, setEditUserId] = useState<string | null>(null);

  const fetchData = async () => {
    const [pRes, rRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("*"),
    ]);
    setProfiles((pRes.data as Profile[]) || []);
    setRoles((rRes.data as UserRole[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const getUserRoles = (userId: string) => roles.filter((r) => r.user_id === userId).map((r) => r.role);

  const toggleRole = async (userId: string, role: string) => {
    const existing = roles.find((r) => r.user_id === userId && r.role === role);
    if (existing) {
      await supabase.from("user_roles").delete().eq("id", existing.id);
    } else {
      await supabase.from("user_roles").insert({ user_id: userId, role } as any);
    }
    fetchData();
  };

  const toggleActive = async (profile: Profile) => {
    await supabase.from("profiles").update({ active: !profile.active }).eq("id", profile.id);
    fetchData();
  };

  return (
    <div>
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : profiles.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No users found</TableCell></TableRow>
            ) : (
              profiles.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{p.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {getUserRoles(p.user_id).map((r) => (
                        <Badge key={r} variant="secondary" className="text-xs capitalize">{r}</Badge>
                      ))}
                      {getUserRoles(p.user_id).length === 0 && <span className="text-xs text-muted-foreground">No roles</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch checked={p.active} onCheckedChange={() => toggleActive(p)} />
                  </TableCell>
                  <TableCell>
                    <Dialog open={editUserId === p.user_id} onOpenChange={(open) => setEditUserId(open ? p.user_id : null)}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">Edit Roles</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Roles — {p.name || p.email}</DialogTitle>
                        </DialogHeader>
                        <div className="grid grid-cols-2 gap-3 py-2">
                          {ALL_ROLES.map((role) => (
                            <label key={role} className="flex items-center gap-2 text-sm capitalize">
                              <Checkbox
                                checked={getUserRoles(p.user_id).includes(role)}
                                onCheckedChange={() => toggleRole(p.user_id, role)}
                              />
                              {role}
                            </label>
                          ))}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
