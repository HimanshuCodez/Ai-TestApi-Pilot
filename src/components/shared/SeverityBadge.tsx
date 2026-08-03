import { AlertTriangle, ShieldAlert, Info, AlertOctagon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Severity } from "@/types";

const config: Record<Severity, { label: string; className: string; icon: React.ElementType }> = {
  critical: { label: "Critical", className: "text-critical bg-critical/10 border-critical/30", icon: AlertOctagon },
  high: { label: "High", className: "text-warning bg-warning/10 border-warning/30", icon: ShieldAlert },
  medium: { label: "Medium", className: "text-warning bg-warning/10 border-warning/25", icon: AlertTriangle },
  low: { label: "Low", className: "text-info bg-info/10 border-info/30", icon: Info },
};

export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  const { label, className: styles, icon: Icon } = config[severity];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold", styles, className)}>
      <Icon className="size-3.5" />
      {label}
    </span>
  );
}
