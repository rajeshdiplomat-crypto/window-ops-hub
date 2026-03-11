import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Save } from "lucide-react";

interface ConfigItem {
  id: string;
  name: string;
  active: boolean;
}

function ConfigList({ table, title }: { table: string; title: string }) {
  const [items, setItems] = useState<ConfigItem[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    const { data } = await (supabase.from(table as any).select("*") as any).order("created_at");
    setItems((data as ConfigItem[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const add = async () => {
    const name = newName.trim();
    if (!name) return;
    const { error } = await (supabase.from(table as any) as any).insert({ name });
    if (error) toast.error(error.message);
    else { toast.success(`${title} added`); setNewName(""); fetchItems(); }
  };

  const toggle = async (item: ConfigItem) => {
    await (supabase.from(table as any) as any).update({ active: !item.active }).eq("id", item.id);
    fetchItems();
  };

  const remove = async (id: string) => {
    const { error } = await (supabase.from(table as any) as any).delete().eq("id", id);
    if (error) toast.error(error.message);
    else fetchItems();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 mb-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">None configured</p>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                <span className={`text-sm ${!item.active ? "text-muted-foreground line-through" : ""}`}>{item.name}</span>
                <div className="flex items-center gap-2">
                  <Switch checked={item.active} onCheckedChange={() => toggle(item)} />
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(item.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder={`New ${title.toLowerCase().replace(/s$/, "")} name...`}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            className="flex-1"
          />
          <Button size="sm" onClick={add} disabled={!newName.trim()}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export { ConfigList };

interface AppSetting {
  id: string;
  key: string;
  value: string;
}

const ALL_ROLES = [
  "sales", "finance", "survey", "design", "procurement",
  "stores", "production", "quality", "dispatch", "installation",
  "management", "admin",
];

export default function GeneralSettingsPage() {
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const fetchSettings = async () => {
    const { data } = await (supabase.from("app_settings" as any).select("*") as any);
    const items = (data as AppSetting[]) || [];
    setSettings(items);
    const vals: Record<string, string> = {};
    items.forEach((s) => { vals[s.key] = s.value; });
    setEditValues(vals);
    setLoading(false);
  };

  useEffect(() => { fetchSettings(); }, []);

  const save = async (key: string) => {
    const setting = settings.find((s) => s.key === key);
    if (!setting) return;
    const { error } = await (supabase.from("app_settings" as any) as any)
      .update({ value: editValues[key], updated_at: new Date().toISOString() })
      .eq("id", setting.id);
    if (error) toast.error(error.message);
    else toast.success("Setting saved");
  };

  const minAdvance = settings.find((s) => s.key === "min_advance_percentage");

  return (
    <div className="max-w-3xl space-y-4">
      {/* Minimum Advance Payment */}
      {minAdvance && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Minimum Advance Payment (%)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                value={editValues["min_advance_percentage"] || ""}
                onChange={(e) => setEditValues({ ...editValues, min_advance_percentage: e.target.value })}
                className="flex-1"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => save("min_advance_percentage")}
                disabled={editValues["min_advance_percentage"] === minAdvance.value}
              >
                <Save className="h-3.5 w-3.5 mr-1" /> Save
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Commercial Statuses */}
      <ConfigList table="commercial_statuses" title="Commercial Statuses" />

      {/* Available Roles */}
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
          <p className="mt-3 text-xs text-muted-foreground">Roles are system-defined.</p>
        </CardContent>
      </Card>

      {/* System Information */}
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
  );
}
