import { cn } from "@/lib/utils";

export function GlowBackground({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)} aria-hidden>
      <div className="bg-grid absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_40%,transparent_100%)]" />
      <div className="animate-blob absolute -top-40 -left-40 size-[32rem] rounded-full bg-[#6D5EF8]/25 blur-[100px]" />
      <div className="animate-blob absolute top-1/3 -right-32 size-[28rem] rounded-full bg-[#00E5FF]/15 blur-[100px] [animation-delay:-6s]" />
      <div className="animate-blob absolute bottom-0 left-1/4 size-96 rounded-full bg-[#6D5EF8]/15 blur-[110px] [animation-delay:-3s]" />
    </div>
  );
}
