import { ConfigList } from "./GeneralSettingsPage";

export default function ProductionSettingsPage() {
  return (
    <div className="max-w-3xl space-y-4">
      <ConfigList table="production_units" title="Production Units" />
    </div>
  );
}
