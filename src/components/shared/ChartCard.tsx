import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  delay?: number;
  className?: string;
  children: React.ReactNode;
}

export function ChartCard({ title, description, actions, delay = 0, className, children }: ChartCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      <Card className="gap-5 py-5">
        <div className="flex items-start justify-between px-6">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          {actions}
        </div>
        <div className={cn("px-2")}>{children}</div>
      </Card>
    </motion.div>
  );
}
