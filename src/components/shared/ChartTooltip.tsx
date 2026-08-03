import type { TooltipContentProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";

export function ChartTooltip({ active, payload, label }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong rounded-xl px-3.5 py-2.5 text-xs shadow-2xl">
      {label !== undefined && <p className="mb-1.5 font-semibold text-foreground">{label}</p>}
      <div className="flex flex-col gap-1">
        {payload.map((p) => (
          <div key={p.dataKey as string} className="flex items-center gap-2">
            <span className="size-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-muted-foreground">{p.name}</span>
            <span className="ml-auto font-semibold tabular-nums text-foreground">{p.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
