import { Badge } from "@/components/ui/badge";
import { statusStyle } from "@/lib/itil/constants";

export function StatusBadge({ value, label }: { value: string; label: string }) {
  return (
    <Badge variant="outline" className={statusStyle(value)}>
      {label}
    </Badge>
  );
}
