import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ALL_ROLES = [
  "sales", "finance", "survey", "design", "procurement",
  "stores", "production", "quality", "dispatch", "installation",
  "management", "admin",
];

export default function AdminSettingsPage() {
  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Admin Settings</h1>
        <p className="text-sm text-muted-foreground">System configuration</p>
      </div>

      <div className="space-y-4">
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
