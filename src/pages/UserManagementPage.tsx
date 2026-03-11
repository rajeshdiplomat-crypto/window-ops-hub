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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserPlus, Pencil } from "lucide-react";

const ALL_ROLES = [
  "sales", "finance", "survey", "design", "procurement",
  "stores", "production", "dispatch", "installation",
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

type ModalMode = "add" | "edit" | null;

export default function UserManagementPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRoles, setFormRoles] = useState<string[]>([]);
  const [formActive, setFormActive] = useState(true);

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

  const getUserRoles = (userId: string) =>
    roles.filter((r) => r.user_id === userId).map((r) => r.role);

  const openAddModal = () => {
    setFormName("");
    setFormEmail("");
    setFormRoles([]);
    setFormActive(true);
    setEditUserId(null);
    setModalMode("add");
  };

  const openEditModal = (profile: Profile) => {
    setFormName(profile.name);
    setFormEmail(profile.email);
    setFormRoles(getUserRoles(profile.user_id));
    setFormActive(profile.active);
    setEditUserId(profile.user_id);
    setModalMode("edit");
  };

  const toggleFormRole = (role: string) => {
    setFormRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSave = async () => {
    if (modalMode === "add") {
      if (!formEmail.trim()) {
        toast.error("Email is required");
        return;
      }
      setSaving(true);
      try {
        const { data, error } = await supabase.functions.invoke("invite-user", {
          body: { email: formEmail.trim(), name: formName.trim(), roles: formRoles },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        toast.success(data?.message || "User added");
      } catch (err: any) {
        toast.error(err.message || "Failed to add user");
        setSaving(false);
        return;
      }
    } else if (modalMode === "edit" && editUserId) {
      setSaving(true);
      try {
        // Update active status
        await supabase
          .from("profiles")
          .update({ active: formActive, name: formName.trim() })
          .eq("user_id", editUserId);

        // Sync roles
        await supabase.from("user_roles").delete().eq("user_id", editUserId);
        if (formRoles.length > 0) {
          await supabase.from("user_roles").insert(
            formRoles.map((role) => ({ user_id: editUserId, role }) as any)
          );
        }
        toast.success("User updated");
      } catch (err: any) {
        toast.error(err.message || "Failed to update user");
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setModalMode(null);
    fetchData();
  };

  const getStatusBadge = (profile: Profile) => {
    if (!profile.active) {
      return <Badge variant="secondary" className="bg-muted text-muted-foreground">Disabled</Badge>;
    }
    if (!profile.name && profile.active) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Invited</Badge>;
    }
    return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Active</Badge>;
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={openAddModal}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : profiles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              profiles.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{p.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {getUserRoles(p.user_id).length > 0
                        ? getUserRoles(p.user_id).map((r) => (
                            <Badge key={r} variant="secondary" className="text-xs capitalize">
                              {r}
                            </Badge>
                          ))
                        : <span className="text-xs text-muted-foreground">No roles</span>}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(p)}</TableCell>
                  <TableCell>
                    <Switch
                      checked={p.active}
                      onCheckedChange={async () => {
                        await supabase.from("profiles").update({ active: !p.active }).eq("id", p.id);
                        fetchData();
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => openEditModal(p)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add / Edit User Modal */}
      <Dialog open={modalMode !== null} onOpenChange={(open) => !open && setModalMode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{modalMode === "add" ? "Add User" : "Edit User"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Full name"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="user@example.com"
                disabled={modalMode === "edit"}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Roles</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {ALL_ROLES.map((role) => (
                  <label key={role} className="flex items-center gap-2 text-sm capitalize cursor-pointer">
                    <Checkbox
                      checked={formRoles.includes(role)}
                      onCheckedChange={() => toggleFormRole(role)}
                    />
                    {role}
                  </label>
                ))}
              </div>
            </div>
            {modalMode === "edit" && (
              <div className="flex items-center gap-2">
                <Label>Active</Label>
                <Switch checked={formActive} onCheckedChange={setFormActive} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalMode(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : modalMode === "add" ? "Add User" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
