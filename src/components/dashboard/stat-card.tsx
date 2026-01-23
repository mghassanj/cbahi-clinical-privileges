"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  LiquidGlassCard,
  LiquidGlassCardContent,
} from "@/components/custom/liquid-glass-card";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  description?: string;
  variant?: "default" | "primary" | "success" | "warning" | "error";
  className?: string;
  onClick?: () => void;
}

const variantStyles = {
  default: {
    icon: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
  },
  primary: {
    icon: "bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400",
  },
  success: {
    icon: "bg-success-100 text-success-600 dark:bg-success-900 dark:text-success-400",
  },
  warning: {
    icon: "bg-warning-100 text-warning-600 dark:bg-warning-900 dark:text-warning-400",
  },
  error: {
    icon: "bg-error-100 text-error-600 dark:bg-error-900 dark:text-error-400",
  },
};

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  description,
  variant = "default",
  className,
  onClick,
}) => {
  return (
    <LiquidGlassCard
      hover={!!onClick}
      className={cn("h-full", className)}
      onClick={onClick}
    >
      <LiquidGlassCardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              {title}
            </p>
            <p className="mt-2 text-3xl font-semibold text-neutral-900 dark:text-white">
              {value}
            </p>
            {trend && (
              <p
                className={cn(
                  "mt-2 flex items-center gap-1 text-sm",
                  trend.isPositive
                    ? "text-success-600 dark:text-success-400"
                    : "text-error-600 dark:text-error-400"
                )}
              >
                <span>{trend.isPositive ? "+" : ""}{trend.value}%</span>
                <span className="text-neutral-500 dark:text-neutral-400">
                  {description}
                </span>
              </p>
            )}
            {!trend && description && (
              <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                {description}
              </p>
            )}
          </div>
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-xl",
              variantStyles[variant].icon
            )}
          >
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </LiquidGlassCardContent>
    </LiquidGlassCard>
  );
};

export { StatCard };
