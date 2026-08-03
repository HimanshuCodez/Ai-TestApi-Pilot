import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CheckCircle2, Loader2, Mail, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sleep } from "@/lib/utils";

const schema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    await sleep(900);
    setSubmitting(false);
    setSent(values.email);
  };

  return (
    <AnimatePresence mode="wait">
      {sent ? (
        <motion.div
          key="sent"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-success/20 to-success/5"
          >
            <div className="absolute inset-0 animate-glow-pulse rounded-2xl bg-success/20 blur-xl" />
            <CheckCircle2 className="relative size-7 text-success" />
          </motion.div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Check your inbox</h1>
          <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
            We sent a password reset link to <span className="text-foreground">{sent}</span>. It'll expire in 15 minutes.
          </p>
          <Button asChild variant="outline" className="mt-8 w-full">
            <Link to="/login">
              <ArrowLeft className="size-4" /> Back to login
            </Link>
          </Button>
        </motion.div>
      ) : (
        <motion.div key="form" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
          <div className="mb-8">
            <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/10">
              <Sparkles className="size-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Forgot your password?</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Enter your email and we'll send you a link to reset it.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="email" placeholder="you@company.com" className="pl-9.5" aria-invalid={!!errors.email} {...register("email")} />
              </div>
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
              {submitting ? "Sending link..." : "Send reset link"}
            </Button>
          </form>

          <Link to="/login" className="mt-8 flex items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-3.5" /> Back to login
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
