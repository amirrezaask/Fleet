import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils.ts";

export const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border border-transparent px-2 py-0.5 text-micro font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        neutral: "border-border bg-muted text-muted-foreground",
        backlog: "bg-st-backlog-bg text-st-backlog-ink",
        inprogress: "bg-st-progress-bg text-st-progress-ink",
        blocked: "bg-st-blocked-bg text-st-blocked-ink",
        done: "bg-st-done-bg text-st-done-ink",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

interface BadgeProps extends ComponentProps<"span">, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
