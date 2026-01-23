"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface LiquidGlassCardProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Whether to apply hover effects
   * @default false
   */
  hover?: boolean;
  /**
   * Children elements to render inside the card
   */
  children: React.ReactNode;
}

/**
 * Glass morphism card component with blur effect and semi-transparent background.
 * Supports both light and dark modes with proper contrast.
 */
const LiquidGlassCard = React.forwardRef<HTMLDivElement, LiquidGlassCardProps>(
  ({ className, hover = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Base glass effect
          "relative rounded-xl border",
          // Light mode
          "bg-white/80 backdrop-blur-[16px]",
          "border-white/50 shadow-soft",
          // Dark mode
          "dark:bg-neutral-900/80 dark:border-neutral-700/50",
          "dark:shadow-[0_2px_15px_-3px_rgba(0,0,0,0.3)]",
          // Transition for smooth effects
          "transition-all duration-300 ease-in-out",
          // Hover effects when enabled
          hover && [
            "hover:shadow-lg hover:scale-[1.01]",
            "hover:bg-white/90 dark:hover:bg-neutral-900/90",
            "hover:border-primary-200/50 dark:hover:border-primary-700/50",
            "cursor-pointer",
          ],
          // RTL support
          "rtl:text-right",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

LiquidGlassCard.displayName = "LiquidGlassCard";

/**
 * Header section for the glass card
 */
const LiquidGlassCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col space-y-1.5 p-6",
      "border-b border-white/20 dark:border-neutral-700/30",
      className
    )}
    {...props}
  />
));
LiquidGlassCardHeader.displayName = "LiquidGlassCardHeader";

/**
 * Title element for the glass card header
 */
const LiquidGlassCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      "text-neutral-900 dark:text-neutral-50",
      className
    )}
    {...props}
  />
));
LiquidGlassCardTitle.displayName = "LiquidGlassCardTitle";

/**
 * Description element for the glass card header
 */
const LiquidGlassCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-neutral-500 dark:text-neutral-400", className)}
    {...props}
  />
));
LiquidGlassCardDescription.displayName = "LiquidGlassCardDescription";

/**
 * Content section for the glass card
 */
const LiquidGlassCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
LiquidGlassCardContent.displayName = "LiquidGlassCardContent";

/**
 * Footer section for the glass card
 */
const LiquidGlassCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center p-6 pt-0",
      "border-t border-white/20 dark:border-neutral-700/30 mt-4 pt-4",
      className
    )}
    {...props}
  />
));
LiquidGlassCardFooter.displayName = "LiquidGlassCardFooter";

export {
  LiquidGlassCard,
  LiquidGlassCardHeader,
  LiquidGlassCardTitle,
  LiquidGlassCardDescription,
  LiquidGlassCardContent,
  LiquidGlassCardFooter,
};
