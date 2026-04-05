import { Badge } from "@/components/ui/badge";
import type { Novel } from "@/types/novel";

const statusLabels: Record<Novel["status"], string> = {
  planning: "Planning",
  writing:  "Writing",
  editing:  "Editing",
  complete: "Complete",
};

const statusClasses: Record<Novel["status"], string> = {
  planning: "border-[var(--status-planning)] text-[var(--status-planning)]",
  writing:  "border-[var(--status-writing)]  text-[var(--status-writing)]",
  editing:  "border-[var(--status-editing)]  text-[var(--status-editing)]",
  complete: "border-[var(--status-complete)] text-[var(--status-complete)]",
};

interface StatusBadgeProps {
  status: Novel["status"];
  variant?: "outline" | "filled";
}

export function StatusBadge({ status, variant = "outline" }: StatusBadgeProps) {
  if (variant === "filled") {
    return (
      <Badge
        variant="secondary"
        className="border-0 shrink-0"
        style={{
          backgroundColor: `var(--status-${status}-bg)`,
          color: `var(--status-${status})`,
        }}
      >
        {statusLabels[status]}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={statusClasses[status]}>
      {statusLabels[status]}
    </Badge>
  );
}
