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

const ALL_ROLES = [
  "sales", "finance", "survey", "design", "procurement",
  "stores", "production", "quality", "dispatch", "installation",
  "management", "admin",
];

interface ConfigItem {
  id: string;
  name: string;
  active: boolean;
}

function ConfigList({ table, title }: { table: string; title: string }) {
  const [items, setItems] = useState<ConfigItem[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    const { data } = await (supabase.from(table as any).select("*") as any).order("created_at");
    setItems((data as ConfigItem[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const add = async () => {
    const name = newName.trim();
    if (!name) return;
    const { error } = await (supabase.from(table as any) as any).insert({ name });
    if (error) toast.error(error.message);
    else { toast.success(`${title} added`); setNewName(""); fetch(); }
  };

  const toggle = async (item: ConfigItem) => {
    await (supabase.from(table as any) as any).update({ active: !item.active }).eq("id", item.id);
    fetch();
  };

  const remove = async (id: string) => {
    const { error } = await (supabase.from(table as any) as any).delete().eq("id", id);
    if (error) toast.error(error.message);
    else fetch();
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

interface AppSetting {
  id: string;
  key: string;
  value: string;
}

function AppSettingsEditor() {
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

  const SETTING_LABELS: Record<string, string> = {
    min_advance_percentage: "Minimum Advance Payment (%)",
    material_dependency_cutting: "Material Rule: Cutting",
    material_dependency_glazing: "Material Rule: Glazing",
    material_dependency_assembly: "Material Rule: Assembly",
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading settings...</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Business Rules</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {settings.map((s) => (
          <div key={s.id} className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              {SETTING_LABELS[s.key] || s.key}
            </Label>
            <div className="flex gap-2">
              <Input
                value={editValues[s.key] || ""}
                onChange={(e) => setEditValues({ ...editValues, [s.key]: e.target.value })}
                className="flex-1"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => save(s.key)}
                disabled={editValues[s.key] === s.value}
              >
                <Save className="h-3.5 w-3.5 mr-1" /> Save
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function AdminSettingsPage() {
  return (
    <div className="max-w-3xl">
      <div className="space-y-4">
        <ConfigList table="salespersons" title="Salespersons" />
        <ConfigList table="dealers" title="Dealer Names" />
        <ConfigList table="project_names" title="Project Names" />
        <ConfigList table="project_client_names" title="Project Client Names" />
        <ConfigList table="colour_shades" title="Colour Shades" />
        <ConfigList table="other_product_types" title="Other Product Types" />
        <ConfigList table="coating_vendors" title="Coating Vendors" />
        <ConfigList table="production_units" title="Production Units" />

        <AppSettingsEditor />

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
              Roles are system-defined.
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
