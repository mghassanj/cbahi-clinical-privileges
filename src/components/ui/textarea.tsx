"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-lg border bg-white px-3 py-2 text-sm",
          "placeholder:text-neutral-400",
          "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "dark:bg-neutral-900 dark:text-neutral-100",
          error
            ? "border-error-500 focus:ring-error-500"
            : "border-neutral-300 dark:border-neutral-700",
          "rtl:text-right",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
