import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Loader2, Lock, Mail, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ApiError } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";

const schema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  remember: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "himanshugaur055@gmail.com", password: "", remember: true },
  });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      await login(values.email, values.password);
      toast.success("Welcome back!", { description: "Signed in successfully." });
      navigate("/app/dashboard");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Couldn't sign in. Please try again.";
      toast.error("Sign in failed", { description: message });
    } finally {
      setSubmitting(false);
    }
  };

  const continueAsGuest = async () => {
    setSubmitting(true);
    try {
      const guestEmail = `guest-${Date.now().toString(36)}@testpilot.ai`;
      await useAuthStore.getState().register("Guest", guestEmail, "guestpass123");
      toast.success("Welcome!", { description: "You're browsing as a guest." });
      navigate("/app/dashboard");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Couldn't start a guest session. Please try again.";
      toast.error("Guest sign-in failed", { description: message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/10">
          <Sparkles className="size-5 text-primary" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome back</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Log in to your TestPilot AI workspace.</p>
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

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="password" type="password" placeholder="••••••••" className="pl-9.5" aria-invalid={!!errors.password} {...register("password")} />
          </div>
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>

        <label className="flex cursor-pointer items-center gap-2.5 pt-1">
          <Checkbox defaultChecked />
          <span className="text-sm text-muted-foreground">Remember me for 30 days</span>
        </label>

        <Button type="submit" className="w-full" size="lg" disabled={submitting}>
          {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {submitting ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">or</span>
        <Separator className="flex-1" />
      </div>

      <motion.div whileHover={{ y: -1 }}>
        <Button variant="outline" className="w-full" size="lg" type="button" disabled={submitting} onClick={continueAsGuest}>
          Continue as guest
        </Button>
      </motion.div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Don't have an account?{" "}
        <Link to="/register" className="font-medium text-primary hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
