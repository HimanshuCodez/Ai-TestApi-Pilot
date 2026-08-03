import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-[#6D5EF8] to-[#8B7CFA] text-white shadow-[0_0_0_1px_rgba(109,94,248,0.4),0_8px_24px_-8px_rgba(109,94,248,0.6)] hover:shadow-[0_0_0_1px_rgba(109,94,248,0.6),0_12px_32px_-8px_rgba(109,94,248,0.8)] hover:brightness-110",
        accent:
          "bg-gradient-to-r from-[#00E5FF] to-[#4FF0FF] text-[#05050a] shadow-[0_0_0_1px_rgba(0,229,255,0.4),0_8px_24px_-8px_rgba(0,229,255,0.6)] hover:shadow-[0_0_0_1px_rgba(0,229,255,0.6),0_12px_32px_-8px_rgba(0,229,255,0.8)] hover:brightness-110",
        destructive:
          "bg-destructive text-white shadow-[0_0_0_1px_rgba(255,84,112,0.4)] hover:brightness-110",
        outline:
          "border border-border bg-white/[0.02] text-foreground hover:bg-white/[0.06] hover:border-white/20",
        secondary: "bg-secondary text-secondary-foreground hover:bg-white/10",
        ghost: "text-foreground hover:bg-white/[0.06]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3.5",
        sm: "h-8 rounded-lg px-3 text-xs has-[>svg]:px-2.5",
        lg: "h-12 rounded-xl px-7 text-base has-[>svg]:px-5",
        icon: "size-10 rounded-xl",
        "icon-sm": "size-8 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
