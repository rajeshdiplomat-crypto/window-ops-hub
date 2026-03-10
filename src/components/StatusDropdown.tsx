import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUS_OPTIONS, STATUS_LABELS, type StatusField } from "@/lib/statusConfig";

interface StatusDropdownProps {
  field: StatusField;
  value: string;
  onValueChange: (value: string) => void;
  showLabel?: boolean;
}

export default function StatusDropdown({ field, value, onValueChange, showLabel = true }: StatusDropdownProps) {
  const options = STATUS_OPTIONS[field];

  return (
    <div className="space-y-1">
      {showLabel && (
        <Label className="text-xs text-muted-foreground">{STATUS_LABELS[field]} Status</Label>
      )}
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
