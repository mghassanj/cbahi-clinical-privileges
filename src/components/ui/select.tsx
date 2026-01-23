"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, error, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          className={cn(
            "flex h-10 w-full appearance-none rounded-lg border bg-white px-3 py-2 pr-10 text-sm",
            "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "dark:bg-neutral-900 dark:text-neutral-100",
            error
              ? "border-error-500 focus:ring-error-500"
              : "border-neutral-300 dark:border-neutral-700",
            "rtl:text-right rtl:pr-3 rtl:pl-10",
            className
          )}
          ref={ref}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 rtl:right-auto rtl:left-3" />
      </div>
    );
  }
);
Select.displayName = "Select";

export { Select };
