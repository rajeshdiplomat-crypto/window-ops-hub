import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save } from "lucide-react";

interface AppSetting {
  id: string;
  key: string;
  value: string;
}

const WORKFLOW_KEYS = [
  { key: "material_dependency_cutting", label: "Material Rule: Cutting" },
  { key: "material_dependency_assembly", label: "Material Rule: Assembly" },
  { key: "material_dependency_glazing", label: "Material Rule: Glazing" },
];

export default function WorkflowRulesPage() {
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
    else toast.success("Rule saved");
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>;

  return (
    <div className="max-w-3xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Material Dependency Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {WORKFLOW_KEYS.map(({ key, label }) => {
            const setting = settings.find((s) => s.key === key);
            if (!setting) return null;
            return (
              <div key={key} className="space-y-1">
                <Label className="text-xs text-muted-foreground">{label}</Label>
                <div className="flex gap-2">
                  <Input
                    value={editValues[key] || ""}
                    onChange={(e) => setEditValues({ ...editValues, [key]: e.target.value })}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => save(key)}
                    disabled={editValues[key] === setting.value}
                  >
                    <Save className="h-3.5 w-3.5 mr-1" /> Save
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
