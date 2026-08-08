import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Lock, Mail, Sparkles, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ApiError } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";

const schema = z
  .object({
    name: z.string().min(2, "Enter your full name"),
    email: z.string().min(1, "Email is required").email("Enter a valid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const registerUser = useAuthStore((s) => s.register);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      await registerUser(values.name, values.email, values.password);
      toast.success("Account created", { description: `Welcome to TestPilot AI, ${values.name.split(" ")[0]}.` });
      navigate("/app/dashboard");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Couldn't create your account. Please try again.";
      toast.error("Sign up failed", { description: message });
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
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Create your account</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Start generating AI-powered API tests in minutes.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Full name</Label>
          <div className="relative">
            <User className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="name" placeholder="Jane Doe" className="pl-9.5" aria-invalid={!!errors.name} {...register("name")} />
          </div>
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="email" type="email" placeholder="you@company.com" className="pl-9.5" aria-invalid={!!errors.email} {...register("email")} />
          </div>
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="password" type="password" placeholder="••••••••" className="pl-9.5" aria-invalid={!!errors.password} {...register("password")} />
          </div>
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="confirmPassword" type="password" placeholder="••••••••" className="pl-9.5" aria-invalid={!!errors.confirmPassword} {...register("confirmPassword")} />
          </div>
          {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
        </div>

        <label className="flex cursor-pointer items-start gap-2.5 pt-1">
          <Checkbox defaultChecked className="mt-0.5" />
          <span className="text-sm text-muted-foreground">
            I agree to the <span className="text-foreground underline underline-offset-2">Terms of Service</span> and{" "}
            <span className="text-foreground underline underline-offset-2">Privacy Policy</span>
          </span>
        </label>

        <Button type="submit" className="w-full" size="lg" disabled={submitting}>
          {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {submitting ? "Creating account..." : "Create account"}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
