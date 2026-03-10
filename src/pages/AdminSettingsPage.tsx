import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

const ALL_ROLES = [
  "sales", "finance", "survey", "design", "procurement",
  "stores", "production", "quality", "dispatch", "installation",
  "management", "admin",
];

interface ProductionUnit {
  id: string;
  name: string;
  active: boolean;
}

export default function AdminSettingsPage() {
  const [units, setUnits] = useState<ProductionUnit[]>([]);
  const [newUnitName, setNewUnitName] = useState("");
  const [loadingUnits, setLoadingUnits] = useState(true);

  const fetchUnits = async () => {
    const { data } = await supabase.from("production_units").select("*").order("created_at");
    setUnits((data as ProductionUnit[]) || []);
    setLoadingUnits(false);
  };

  useEffect(() => { fetchUnits(); }, []);

  const addUnit = async () => {
    const name = newUnitName.trim();
    if (!name) return;
    const { error } = await supabase.from("production_units").insert({ name } as any);
    if (error) toast.error(error.message);
    else { toast.success("Unit added"); setNewUnitName(""); fetchUnits(); }
  };

  const toggleUnit = async (unit: ProductionUnit) => {
    await supabase.from("production_units").update({ active: !unit.active }).eq("id", unit.id);
    fetchUnits();
  };

  const deleteUnit = async (id: string) => {
    const { error } = await supabase.from("production_units").delete().eq("id", id);
    if (error) toast.error(error.message);
    else fetchUnits();
  };

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Admin Settings</h1>
        <p className="text-sm text-muted-foreground">System configuration</p>
      </div>

      <div className="space-y-4">
        {/* Production Units */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Production Units</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mb-3">
              {loadingUnits ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : units.length === 0 ? (
                <p className="text-sm text-muted-foreground">No units configured</p>
              ) : (
                units.map((unit) => (
                  <div key={unit.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <span className={`text-sm ${!unit.active ? "text-muted-foreground line-through" : ""}`}>{unit.name}</span>
                    <div className="flex items-center gap-2">
                      <Switch checked={unit.active} onCheckedChange={() => toggleUnit(unit)} />
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteUnit(unit.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="New unit name..."
                value={newUnitName}
                onChange={(e) => setNewUnitName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addUnit()}
                className="flex-1"
              />
              <Button size="sm" onClick={addUnit} disabled={!newUnitName.trim()}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Roles */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Available Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {ALL_ROLES.map((role) => (
                <Badge key={role} variant="secondary" className="capitalize text-sm">{role}</Badge>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Roles are system-defined. To add or remove roles, contact your administrator.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">System Information</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Version</span>
              <span>1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Environment</span>
              <span>Production</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
