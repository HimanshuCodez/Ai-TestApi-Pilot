import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

function Progress({
  className,
  value,
  indicatorClassName,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & { indicatorClassName?: string }) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-white/[0.06]", className)}
      {...props}
    >
      <motion.div
        className={cn(
          "h-full rounded-full bg-gradient-to-r from-[#6D5EF8] to-[#00E5FF]",
          indicatorClassName
        )}
        initial={{ width: 0 }}
        animate={{ width: `${value ?? 0}%` }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
