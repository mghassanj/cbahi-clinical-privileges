"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  showLabel?: boolean;
  size?: "sm" | "default" | "lg";
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  (
    { className, value = 0, max = 100, showLabel = false, size = "default", ...props },
    ref
  ) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    const sizeClasses = {
      sm: "h-1.5",
      default: "h-2.5",
      lg: "h-4",
    };

    return (
      <div className={cn("w-full", className)} ref={ref} {...props}>
        <div
          className={cn(
            "w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700",
            sizeClasses[size]
          )}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        >
          <div
            className={cn(
              "h-full rounded-full bg-primary-600 transition-all duration-300 ease-out",
              "dark:bg-primary-500"
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {showLabel && (
          <div className="mt-1 text-right text-xs text-neutral-500 dark:text-neutral-400">
            {Math.round(percentage)}%
          </div>
        )}
      </div>
    );
  }
);
Progress.displayName = "Progress";

// Step Progress for wizards
export interface StepProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  steps: { label: string; labelAr?: string }[];
  currentStep: number;
  locale?: "en" | "ar";
}

const StepProgress = React.forwardRef<HTMLDivElement, StepProgressProps>(
  ({ className, steps, currentStep, locale = "en", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("w-full", className)}
        dir={locale === "ar" ? "rtl" : "ltr"}
        {...props}
      >
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;
            const isLast = index === steps.length - 1;

            return (
              <React.Fragment key={index}>
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all duration-200",
                      isCompleted
                        ? "border-primary-600 bg-primary-600 text-white"
                        : isCurrent
                        ? "border-primary-600 bg-white text-primary-600 dark:bg-neutral-900"
                        : "border-neutral-300 bg-white text-neutral-400 dark:border-neutral-600 dark:bg-neutral-900"
                    )}
                  >
                    {isCompleted ? (
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span
                    className={cn(
                      "mt-2 text-xs font-medium text-center max-w-[80px]",
                      isCurrent
                        ? "text-primary-600 dark:text-primary-400"
                        : isCompleted
                        ? "text-neutral-700 dark:text-neutral-300"
                        : "text-neutral-400"
                    )}
                  >
                    {locale === "ar" && step.labelAr ? step.labelAr : step.label}
                  </span>
                </div>
                {!isLast && (
                  <div
                    className={cn(
                      "flex-1 h-0.5 mx-2 transition-all duration-200",
                      index < currentStep
                        ? "bg-primary-600"
                        : "bg-neutral-200 dark:bg-neutral-700"
                    )}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  }
);
StepProgress.displayName = "StepProgress";

export { Progress, StepProgress };
