import type { ComponentProps } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "../../lib/utils.ts";

interface CardProps extends ComponentProps<"div"> {
  readonly asChild?: boolean;
}

export function Card({ className, asChild = false, ...props }: CardProps) {
  const Component = asChild ? Slot : "div";

  return (
    <Component
      data-slot="card"
      className={cn(
        "rounded-xl border border-border bg-card text-foreground shadow-card",
        className,
      )}
      {...props}
    />
  );
}
