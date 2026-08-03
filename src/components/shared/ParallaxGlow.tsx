import { useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

export function ParallaxGlow({ className }: { className?: string }) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 40, damping: 20 });
  const sy = useSpring(my, { stiffness: 40, damping: 20 });

  const x1 = useTransform(sx, (v) => v * 24);
  const y1 = useTransform(sy, (v) => v * 24);
  const x2 = useTransform(sx, (v) => v * -18);
  const y2 = useTransform(sy, (v) => v * -18);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      mx.set(nx);
      my.set(ny);
    }
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [mx, my]);

  return (
    <div className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)} aria-hidden>
      <div className="bg-grid absolute inset-0 opacity-30 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_40%,transparent_100%)]" />
      <motion.div
        style={{ x: x1, y: y1 }}
        className="animate-blob absolute -top-32 -left-32 size-[30rem] rounded-full bg-[#6D5EF8]/20 blur-[110px]"
      />
      <motion.div
        style={{ x: x2, y: y2 }}
        className="animate-blob absolute top-1/4 -right-32 size-[26rem] rounded-full bg-[#00E5FF]/14 blur-[110px] [animation-delay:-6s]"
      />
      <div className="animate-blob absolute bottom-0 left-1/3 size-96 rounded-full bg-[#6D5EF8]/12 blur-[110px] [animation-delay:-3s]" />
    </div>
  );
}
