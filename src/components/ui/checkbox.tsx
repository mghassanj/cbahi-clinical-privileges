"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  description?: string;
  error?: boolean;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, error, id, ...props }, ref) => {
    const inputId = id || React.useId();

    return (
      <div className="flex items-start gap-3">
        <div className="relative flex items-center">
          <input
            type="checkbox"
            id={inputId}
            ref={ref}
            className="peer sr-only"
            {...props}
          />
          <div
            className={cn(
              "flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all duration-200",
              "peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500 peer-focus-visible:ring-offset-2",
              "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
              props.checked || props.defaultChecked
                ? "border-primary-600 bg-primary-600 text-white"
                : error
                ? "border-error-500 bg-white dark:bg-neutral-900"
                : "border-neutral-300 bg-white dark:border-neutral-600 dark:bg-neutral-900",
              "peer-checked:border-primary-600 peer-checked:bg-primary-600 peer-checked:text-white",
              className
            )}
          >
            <Check className="h-3 w-3 opacity-0 peer-checked:opacity-100" />
          </div>
          <label
            htmlFor={inputId}
            className="absolute inset-0 cursor-pointer peer-disabled:cursor-not-allowed"
          />
        </div>
        {(label || description) && (
          <div className="flex flex-col gap-0.5">
            {label && (
              <label
                htmlFor={inputId}
                className={cn(
                  "text-sm font-medium leading-none cursor-pointer",
                  "text-neutral-900 dark:text-neutral-100",
                  "peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                )}
              >
                {label}
              </label>
            )}
            {description && (
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                {description}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
