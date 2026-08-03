import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
  FlaskConical,
  TerminalSquare,
  BarChart3,
  MessagesSquare,
  ScanSearch,
  Star,
  Loader2,
  UploadCloud,
  Workflow,
  Rocket,
} from "lucide-react";
import { Github, Twitter, Linkedin } from "@/components/shared/SocialIcons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { GlowBackground } from "@/components/shared/GlowBackground";
import { AnimatedCounter } from "@/components/shared/AnimatedCounter";
import { CircularScore } from "@/components/shared/CircularScore";
import { analysisSteps } from "@/services/mockData";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
];

const stats = [
  { label: "Tests generated", value: 128400, suffix: "+" },
  { label: "Vulnerabilities caught", value: 3210, suffix: "+" },
  { label: "Avg. scan time", value: 3.2, suffix: "s", decimals: 1 },
  { label: "Detection accuracy", value: 98.4, suffix: "%", decimals: 1 },
];

const features = [
  {
    icon: ScanSearch,
    title: "AI Analysis Engine",
    desc: "Point TestPilot at your Swagger, Postman, or raw API and watch it read, understand, and map every endpoint automatically.",
    accent: "from-primary/25 to-primary/5 text-primary",
  },
  {
    icon: FlaskConical,
    title: "Auto Test Generation",
    desc: "Hundreds of positive, negative, boundary, and security test cases synthesized in seconds — no test writing required.",
    accent: "from-accent/25 to-accent/5 text-accent",
  },
  {
    icon: ShieldCheck,
    title: "Security Scanning",
    desc: "Catches SQL injection, broken auth, IDOR, and missing rate limits with plain-English explanations and fixes.",
    accent: "from-success/25 to-success/5 text-success",
  },
  {
    icon: TerminalSquare,
    title: "Live Test Runs",
    desc: "Stream real-time console output as your generated suite executes against your API, right in the browser.",
    accent: "from-warning/25 to-warning/5 text-warning",
  },
  {
    icon: BarChart3,
    title: "Reports & Insights",
    desc: "Pass rate trends, coverage, response times, and bug distribution — visualized and always up to date.",
    accent: "from-info/25 to-info/5 text-info",
  },
  {
    icon: MessagesSquare,
    title: "AI Chat Copilot",
    desc: "Ask why a test failed or how to fix a vulnerability and get a Cursor-style explanation with code, instantly.",
    accent: "from-critical/25 to-critical/5 text-critical",
  },
];

const steps = [
  { icon: UploadCloud, title: "Upload your API", desc: "Drop a Swagger file, paste a URL, or import a Postman collection." },
  { icon: Sparkles, title: "AI analyzes everything", desc: "TestPilot maps endpoints, auth, and dependencies, then scores API health." },
  { icon: Workflow, title: "Tests are generated", desc: "Positive, negative, boundary & security tests are written automatically." },
  { icon: Rocket, title: "Run & ship with confidence", desc: "Execute the suite, review reports, and fix issues with AI guidance." },
];

const testimonials = [
  {
    quote: "TestPilot found an IDOR vulnerability in our user deletion endpoint that three code reviews had missed. It explained the fix in plain English with a working patch.",
    name: "Priya Nair",
    role: "Staff Engineer, Fintech",
  },
  {
    quote: "We went from zero API tests to 400+ generated test cases in an afternoon. The security scan alone paid for the whole quarter.",
    name: "Marcus Webb",
    role: "Head of Platform, Logistics SaaS",
  },
  {
    quote: "It feels like Cursor for QA. The AI chat actually understands why a test failed instead of just showing me a stack trace.",
    name: "Elena Torres",
    role: "Engineering Manager, DevTools",
  },
];

const pricingTiers = [
  { name: "Starter", price: "$0", desc: "For side projects & small APIs", features: ["1 project", "50 AI test runs / mo", "Community support"] },
  { name: "Pro", price: "$49", desc: "For growing teams shipping fast", features: ["Unlimited projects", "Unlimited AI test runs", "Security scanning", "Priority support"], highlighted: true },
  { name: "Team", price: "Custom", desc: "For orgs with compliance needs", features: ["SSO & audit logs", "Dedicated infra", "SLA & onboarding"] },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-svh overflow-x-clip bg-background">
      <PublicNav />
      <Hero />
      <StatsBar />
      <Features />
      <HowItWorks />
      <Testimonials />
      <Pricing />
      <FinalCta />
      <Footer />
    </div>
  );
}

function PublicNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#050509]/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#6D5EF8] to-[#00E5FF] shadow-[0_0_20px_rgba(109,94,248,0.5)]">
            <svg viewBox="0 0 24 24" className="size-4.5 text-white" fill="none">
              <path d="M6 12.5L10 16.5L18 7.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-sm font-bold text-foreground">TestPilot AI</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/login">Log in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/register">
              Get started <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative px-4 pt-20 pb-24 sm:px-6 lg:px-8 lg:pt-28">
      <GlowBackground />
      <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-2 lg:gap-10">
        <div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Badge variant="default" className="mb-5 py-1.5 pl-1.5">
              <span className="mr-1 flex size-4 items-center justify-center rounded-full bg-primary/30">
                <Sparkles className="size-2.5" />
              </span>
              Now scanning with GPT-class reasoning
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
            className="text-4xl leading-[1.08] font-bold tracking-tight text-foreground sm:text-5xl lg:text-[3.4rem]"
          >
            Your autonomous <span className="text-gradient">AI QA engineer</span> for every API
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg"
          >
            Upload a Swagger file or API URL. TestPilot reads it, understands it, generates hundreds of
            tests, finds security holes, and explains every bug like a senior engineer sitting next to you.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Button size="lg" asChild>
              <Link to="/register">
                Start scanning free <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/app/dashboard">See a live demo</Link>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-8 flex items-center gap-4 text-xs text-muted-foreground"
          >
            <div className="flex -space-x-2">
              {["HG", "PN", "MW", "ET"].map((i) => (
                <div key={i} className="flex size-7 items-center justify-center rounded-full border-2 border-background bg-gradient-to-br from-primary/60 to-accent/40 text-[10px] font-bold text-white">
                  {i}
                </div>
              ))}
            </div>
            No credit card required · Free tier forever
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <LiveScanCard />
        </motion.div>
      </div>
    </section>
  );
}

function LiveScanCard() {
  const [visible, setVisible] = useState(1);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    if (visible >= analysisSteps.length) {
      const reset = setTimeout(() => {
        setVisible(1);
        setCycle((c) => c + 1);
      }, 1800);
      return () => clearTimeout(reset);
    }
    const t = setTimeout(() => setVisible((v) => v + 1), 550);
    return () => clearTimeout(t);
  }, [visible]);

  const health = Math.min(95, 40 + visible * 6);

  return (
    <div className="glow-border relative rounded-2xl">
      <Card className="gap-0 overflow-hidden py-0 shadow-[0_1px_0_0_rgba(255,255,255,0.08)_inset,0_40px_80px_-30px_rgba(109,94,248,0.5)]">
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
          <span className="size-2.5 rounded-full bg-critical/70" />
          <span className="size-2.5 rounded-full bg-warning/70" />
          <span className="size-2.5 rounded-full bg-success/70" />
          <span className="ml-2 font-mono text-[11px] text-muted-foreground">testpilot — analyzing atlas-gateway.yaml</span>
        </div>

        <div className="grid grid-cols-1 gap-0 sm:grid-cols-[1fr_auto]">
          <div className="space-y-2.5 p-5 font-mono text-[12.5px]">
            {analysisSteps.slice(0, visible).map((s, i) => {
              const isLast = i === visible - 1 && visible < analysisSteps.length;
              return (
                <motion.div
                  key={`${cycle}-${s.id}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-start gap-2.5"
                >
                  {isLast ? (
                    <Loader2 className="mt-0.5 size-3.5 shrink-0 animate-spin text-primary" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" />
                  )}
                  <div>
                    <p className={isLast ? "text-foreground" : "text-muted-foreground"}>{s.label}</p>
                    {isLast && <p className="text-[11px] text-muted-foreground/70">{s.detail}</p>}
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="flex flex-col items-center justify-center gap-2 border-t border-white/[0.06] p-6 sm:border-t-0 sm:border-l">
            <CircularScore value={health} size={128} strokeWidth={9} label="API Health" />
            <Badge variant={health >= 85 ? "success" : "warning"} className="mt-1">
              {visible >= analysisSteps.length ? "Scan complete" : "Scanning..."}
            </Badge>
          </div>
        </div>
      </Card>
    </div>
  );
}

function StatsBar() {
  return (
    <section className="border-y border-white/[0.06] bg-white/[0.015] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="text-center"
          >
            <div className="text-3xl font-bold tabular-nums text-foreground sm:text-4xl">
              <AnimatedCounter value={s.value} suffix={s.suffix} decimals={s.decimals ?? 0} />
            </div>
            <p className="mt-1 text-xs font-medium text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Platform"
        title="Everything a QA team does, automated"
        desc="TestPilot doesn't just run tests — it reads your API like an engineer, thinks about what could break, and tells you why it matters."
      />

      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.45, delay: (i % 3) * 0.08, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -4 }}
          >
            <Card className="h-full gap-4 p-6 py-0 transition-shadow hover:shadow-[0_1px_0_0_rgba(255,255,255,0.08)_inset,0_24px_48px_-20px_rgba(109,94,248,0.35)]">
              <div className={`flex size-11 items-center justify-center rounded-xl bg-gradient-to-br ${f.accent}`}>
                <f.icon className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <SectionHeading eyebrow="Workflow" title="From spec to shipped in four steps" desc="No test-writing, no config files, no boilerplate." />

      <div className="relative mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="absolute top-9 right-0 left-0 hidden h-px bg-gradient-to-r from-transparent via-white/15 to-transparent lg:block" />
        {steps.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.45, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex flex-col items-start"
          >
            <div className="relative z-10 mb-4 flex size-[72px] items-center justify-center rounded-2xl border border-white/10 bg-[#0c0c14] shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/15 to-accent/5" />
              <s.icon className="relative size-6 text-primary" />
              <span className="absolute -top-2.5 -right-2.5 flex size-6 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-[11px] font-bold text-white shadow-lg">
                {i + 1}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-foreground">{s.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{s.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="border-y border-white/[0.06] bg-white/[0.015] px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading eyebrow="Loved by engineers" title="Teams ship with more confidence" />

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: i * 0.1 }}
            >
              <Card className="h-full gap-4 p-6 py-0">
                <div className="flex gap-0.5 text-warning">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Star key={idx} className="size-3.5 fill-current" />
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-foreground">"{t.quote}"</p>
                <div className="mt-auto flex items-center gap-3 pt-2">
                  <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-xs font-bold text-white">
                    {t.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <SectionHeading eyebrow="Pricing" title="Simple plans, coming soon" desc="TestPilot is currently in early access. Pricing below is indicative — join the waitlist to lock in early-adopter rates." />

      <div className="mt-14 grid gap-5 lg:grid-cols-3">
        {pricingTiers.map((tier, i) => (
          <motion.div
            key={tier.name}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.45, delay: i * 0.1 }}
          >
            <Card
              className={`relative h-full gap-5 overflow-hidden p-7 py-0 ${
                tier.highlighted ? "border-primary/40 shadow-[0_0_0_1px_rgba(109,94,248,0.3),0_30px_60px_-30px_rgba(109,94,248,0.5)]" : ""
              }`}
            >
              {tier.highlighted && (
                <Badge className="absolute top-5 right-5">Most popular</Badge>
              )}
              <Badge variant="secondary" className="w-fit">Coming soon</Badge>
              <div>
                <h3 className="text-base font-semibold text-foreground">{tier.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{tier.desc}</p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-foreground">{tier.price}</span>
                {tier.price !== "Custom" && <span className="text-sm text-muted-foreground">/mo</span>}
              </div>
              <ul className="space-y-2.5">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="size-4 shrink-0 text-success" /> {f}
                  </li>
                ))}
              </ul>
              <Button variant={tier.highlighted ? "default" : "outline"} className="mt-2 mb-7 w-full" disabled>
                Join waitlist
              </Button>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#100e1f] to-[#0a0a12] px-8 py-16 text-center sm:px-16"
      >
        <div className="animate-glow-pulse pointer-events-none absolute -top-24 left-1/2 size-96 -translate-x-1/2 rounded-full bg-primary/30 blur-[100px]" />
        <div className="relative">
          <Zap className="mx-auto mb-5 size-8 text-accent" />
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Stop writing tests. Start shipping.
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground sm:text-base">
            Connect your first API and let TestPilot generate a complete, AI-reasoned test suite in under a minute.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" asChild>
              <Link to="/register">
                Get started free <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/login">Log in</Link>
            </Button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/[0.06] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 sm:flex-row">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#6D5EF8] to-[#00E5FF]">
            <svg viewBox="0 0 24 24" className="size-4 text-white" fill="none">
              <path d="M6 12.5L10 16.5L18 7.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-foreground">TestPilot AI</span>
        </div>

        <p className="text-xs text-muted-foreground">© 2026 TestPilot AI. All rights reserved.</p>

        <div className="flex items-center gap-3 text-muted-foreground">
          <a href="#" className="transition-colors hover:text-foreground" aria-label="GitHub"><Github className="size-4.5" /></a>
          <a href="#" className="transition-colors hover:text-foreground" aria-label="Twitter"><Twitter className="size-4.5" /></a>
          <a href="#" className="transition-colors hover:text-foreground" aria-label="LinkedIn"><Linkedin className="size-4.5" /></a>
        </div>
      </div>
    </footer>
  );
}

function SectionHeading({ eyebrow, title, desc }: { eyebrow: string; title: string; desc?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="mx-auto max-w-2xl text-center"
    >
      <p className="mb-2 text-xs font-semibold tracking-wider text-primary uppercase">{eyebrow}</p>
      <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h2>
      {desc && <p className="mt-3 text-sm text-muted-foreground sm:text-base">{desc}</p>}
    </motion.div>
  );
}
