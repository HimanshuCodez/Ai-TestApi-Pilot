import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { AnimatedCounter } from "./AnimatedCounter";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  icon: LucideIcon;
  trend?: number;
  accent?: "primary" | "accent" | "success" | "warning" | "critical";
  delay?: number;
  className?: string;
}

const accentMap = {
  primary: "from-primary/20 to-primary/5 text-primary",
  accent: "from-accent/20 to-accent/5 text-accent",
  success: "from-success/20 to-success/5 text-success",
  warning: "from-warning/20 to-warning/5 text-warning",
  critical: "from-critical/20 to-critical/5 text-critical",
};

export function StatCard({
  label,
  value,
  suffix = "",
  prefix = "",
  decimals = 0,
  icon: Icon,
  trend,
  accent = "primary",
  delay = 0,
  className,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3 }}
      className={className}
    >
      <Card className="gap-3 py-5 transition-shadow hover:shadow-[0_1px_0_0_rgba(255,255,255,0.08)_inset,0_24px_48px_-20px_rgba(109,94,248,0.35)]">
        <div className="flex items-center justify-between px-5">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          <div className={cn("flex size-8 items-center justify-center rounded-lg bg-gradient-to-br", accentMap[accent])}>
            <Icon className="size-4" />
          </div>
        </div>
        <div className="flex items-end justify-between px-5">
          <span className="text-3xl font-bold tabular-nums text-foreground">
            <AnimatedCounter value={value} suffix={suffix} prefix={prefix} decimals={decimals} />
          </span>
          {trend !== undefined && (
            <span
              className={cn(
                "flex items-center gap-0.5 text-xs font-semibold",
                trend >= 0 ? "text-success" : "text-critical"
              )}
            >
              {trend >= 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
              {Math.abs(trend)}%
            </span>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
