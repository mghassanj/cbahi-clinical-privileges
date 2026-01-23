"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300",
        secondary:
          "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
        success:
          "bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-300",
        warning:
          "bg-warning-100 text-warning-700 dark:bg-warning-900 dark:text-warning-300",
        error:
          "bg-error-100 text-error-700 dark:bg-error-900 dark:text-error-300",
        outline:
          "border border-neutral-300 text-neutral-700 dark:border-neutral-700 dark:text-neutral-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
