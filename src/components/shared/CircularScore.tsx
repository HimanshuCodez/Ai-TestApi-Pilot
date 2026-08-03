import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { AnimatedCounter } from "./AnimatedCounter";
import { cn } from "@/lib/utils";

interface CircularScoreProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  className?: string;
}

function scoreColor(value: number) {
  if (value >= 85) return { stroke: "#2EE6A6", glow: "rgba(46,230,166,0.55)" };
  if (value >= 60) return { stroke: "#FFB454", glow: "rgba(255,180,84,0.5)" };
  return { stroke: "#FF5470", glow: "rgba(255,84,112,0.5)" };
}

export function CircularScore({ value, size = 220, strokeWidth = 14, label = "API Health", className }: CircularScoreProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10%" });
  const [progress, setProgress] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const { stroke, glow } = scoreColor(value);

  useEffect(() => {
    if (inView) {
      const t = setTimeout(() => setProgress(value), 200);
      return () => clearTimeout(t);
    }
  }, [inView, value]);

  return (
    <div ref={ref} className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <div
        className="absolute inset-4 rounded-full transition-opacity duration-1000"
        style={{ background: glow, filter: "blur(32px)", opacity: inView ? 0.55 : 0 }}
      />
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - (progress / 100) * circumference }}
          transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
          style={{ filter: `drop-shadow(0 0 8px ${glow})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold tabular-nums text-foreground">
          <AnimatedCounter value={value} suffix="%" duration={1.6} />
        </span>
        <span className="mt-1 text-xs font-medium text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}
