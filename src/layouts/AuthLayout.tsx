import { Link, Outlet } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, Sparkles, Zap } from "lucide-react";
import { GlowBackground } from "@/components/shared/GlowBackground";

const highlights = [
  { icon: Sparkles, title: "AI-generated test suites", desc: "Hundreds of positive, negative, boundary & security tests in seconds." },
  { icon: ShieldCheck, title: "Security scanning built in", desc: "Catch injection, auth, and validation flaws before they ship." },
  { icon: Zap, title: "Run tests instantly", desc: "Live streaming logs and reports without touching a terminal." },
];

export function AuthLayout() {
  return (
    <div className="relative flex min-h-svh overflow-hidden bg-background">
      <GlowBackground />

      <div className="hidden w-[46%] flex-col justify-between border-r border-white/[0.06] p-12 lg:flex">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#6D5EF8] to-[#00E5FF] shadow-[0_0_20px_rgba(109,94,248,0.5)]">
            <svg viewBox="0 0 24 24" className="size-4.5 text-white" fill="none">
              <path d="M6 12.5L10 16.5L18 7.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-sm font-bold text-foreground">TestPilot AI</span>
        </Link>

        <div className="max-w-md">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-3xl leading-tight font-bold tracking-tight text-foreground"
          >
            Your autonomous <span className="text-gradient">AI QA engineer</span>
          </motion.h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Upload your API spec and let TestPilot design, run, and explain your entire test suite.
          </p>

          <div className="mt-10 space-y-5">
            {highlights.map((h, i) => (
              <motion.div
                key={h.title}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.15 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-start gap-3"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-primary">
                  <h.icon className="size-4.5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{h.title}</p>
                  <p className="text-xs text-muted-foreground">{h.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">© 2026 TestPilot AI. All rights reserved.</p>
      </div>

      <div className="flex flex-1 items-center justify-center p-6 sm:p-10">
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm"
        >
          <Outlet />
        </motion.div>
      </div>
    </div>
  );
}
