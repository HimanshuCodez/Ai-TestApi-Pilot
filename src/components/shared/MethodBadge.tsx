import { cn } from "@/lib/utils";
import type { HttpMethod } from "@/types";

const styles: Record<HttpMethod, string> = {
  GET: "text-[#4F9CFF] bg-[#4F9CFF]/10 border-[#4F9CFF]/30",
  POST: "text-[#2EE6A6] bg-[#2EE6A6]/10 border-[#2EE6A6]/30",
  PUT: "text-[#FFB454] bg-[#FFB454]/10 border-[#FFB454]/30",
  PATCH: "text-[#FFB454] bg-[#FFB454]/10 border-[#FFB454]/30",
  DELETE: "text-[#FF5470] bg-[#FF5470]/10 border-[#FF5470]/30",
};

export function MethodBadge({ method, className }: { method: HttpMethod; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex w-[58px] shrink-0 items-center justify-center rounded-md border px-1.5 py-0.5 font-mono text-[11px] font-bold tracking-wide",
        styles[method],
        className
      )}
    >
      {method}
    </span>
  );
}
