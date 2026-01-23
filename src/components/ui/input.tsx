"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, icon, iconPosition = "left", ...props }, ref) => {
    return (
      <div className="relative">
        {icon && iconPosition === "left" && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
            {icon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            "flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm",
            "placeholder:text-neutral-400",
            "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "dark:bg-neutral-900 dark:text-neutral-100",
            error
              ? "border-error-500 focus:ring-error-500"
              : "border-neutral-300 dark:border-neutral-700",
            icon && iconPosition === "left" && "pl-10",
            icon && iconPosition === "right" && "pr-10",
            "rtl:text-right",
            className
          )}
          ref={ref}
          {...props}
        />
        {icon && iconPosition === "right" && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">
            {icon}
          </div>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
