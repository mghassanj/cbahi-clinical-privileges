"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

export interface Step {
  /**
   * Unique identifier for the step
   */
  id: string;
  /**
   * Step title in English
   */
  titleEn: string;
  /**
   * Step title in Arabic
   */
  titleAr: string;
  /**
   * Optional description in English
   */
  descriptionEn?: string;
  /**
   * Optional description in Arabic
   */
  descriptionAr?: string;
  /**
   * Optional icon for the step
   */
  icon?: React.ReactNode;
  /**
   * Whether this step is optional
   */
  optional?: boolean;
  /**
   * Validation function for the step
   * Returns true if step is valid, or error message string
   */
  validate?: () => boolean | string | Promise<boolean | string>;
}

export interface StepWizardProps {
  /**
   * Array of step configurations
   */
  steps: Step[];
  /**
   * Currently active step index (0-based)
   */
  currentStep: number;
  /**
   * Callback when step changes
   */
  onStepChange: (step: number) => void;
  /**
   * Callback when wizard completes
   */
  onComplete: () => void;
  /**
   * Current locale for display
   * @default "en"
   */
  locale?: "en" | "ar";
  /**
   * Whether to allow clicking on steps to navigate
   * @default false
   */
  allowStepClick?: boolean;
  /**
   * Custom labels
   */
  labels?: {
    next?: string;
    previous?: string;
    finish?: string;
    optional?: string;
  };
  /**
   * Children to render as step content
   */
  children?: React.ReactNode;
  /**
   * Additional class name
   */
  className?: string;
  /**
   * Variant of progress indicator
   * @default "default"
   */
  variant?: "default" | "compact" | "vertical";
}

/**
 * Multi-step form wizard with progress bar and step navigation.
 * Supports validation before proceeding to next step.
 */
const StepWizard: React.FC<StepWizardProps> = ({
  steps,
  currentStep,
  onStepChange,
  onComplete,
  locale = "en",
  allowStepClick = false,
  labels,
  children,
  className,
  variant = "default",
}) => {
  const [isValidating, setIsValidating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const isArabic = locale === "ar";

  const defaultLabels = {
    next: isArabic ? "التالي" : "Next",
    previous: isArabic ? "السابق" : "Previous",
    finish: isArabic ? "إنهاء" : "Finish",
    optional: isArabic ? "اختياري" : "Optional",
  };

  const mergedLabels = { ...defaultLabels, ...labels };

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  const progressPercentage = ((currentStep + 1) / steps.length) * 100;

  const validateCurrentStep = async (): Promise<boolean> => {
    const step = steps[currentStep];
    if (!step.validate) return true;

    setIsValidating(true);
    setError(null);

    try {
      const result = await step.validate();
      if (result === true) {
        return true;
      }
      setError(typeof result === "string" ? result : "Validation failed");
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Validation error");
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  const handleNext = async () => {
    const isValid = await validateCurrentStep();
    if (!isValid) return;

    if (isLastStep) {
      onComplete();
    } else {
      onStepChange(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setError(null);
      onStepChange(currentStep - 1);
    }
  };

  const handleStepClick = async (index: number) => {
    if (!allowStepClick) return;
    if (index === currentStep) return;

    // Only allow clicking on completed steps or the next step
    if (index < currentStep) {
      setError(null);
      onStepChange(index);
    } else if (index === currentStep + 1) {
      const isValid = await validateCurrentStep();
      if (isValid) {
        onStepChange(index);
      }
    }
  };

  const getStepStatus = (index: number): "completed" | "current" | "upcoming" => {
    if (index < currentStep) return "completed";
    if (index === currentStep) return "current";
    return "upcoming";
  };

  const renderStepIndicator = (step: Step, index: number) => {
    const status = getStepStatus(index);
    const isClickable = allowStepClick && (status === "completed" || index === currentStep + 1);

    return (
      <button
        key={step.id}
        type="button"
        onClick={() => handleStepClick(index)}
        disabled={!isClickable}
        className={cn(
          "flex flex-col items-center gap-2 transition-all duration-200",
          isClickable && "cursor-pointer hover:opacity-80",
          !isClickable && "cursor-default"
        )}
        aria-current={status === "current" ? "step" : undefined}
      >
        {/* Step circle */}
        <div
          className={cn(
            "flex items-center justify-center rounded-full",
            "w-10 h-10 text-sm font-medium transition-all duration-300",
            "border-2",
            status === "completed" && [
              "bg-success-500 border-success-500 text-white",
              "dark:bg-success-600 dark:border-success-600",
            ],
            status === "current" && [
              "bg-primary-500 border-primary-500 text-white",
              "dark:bg-primary-600 dark:border-primary-600",
              "ring-4 ring-primary-100 dark:ring-primary-900/30",
            ],
            status === "upcoming" && [
              "bg-white border-neutral-300 text-neutral-500",
              "dark:bg-neutral-800 dark:border-neutral-600 dark:text-neutral-400",
            ]
          )}
        >
          {status === "completed" ? (
            <Check size={18} />
          ) : step.icon ? (
            step.icon
          ) : (
            index + 1
          )}
        </div>

        {/* Step label */}
        <div className="text-center max-w-[100px]">
          <p
            className={cn(
              "text-xs font-medium truncate",
              status === "current" && "text-primary-700 dark:text-primary-300",
              status === "completed" && "text-success-700 dark:text-success-400",
              status === "upcoming" && "text-neutral-500 dark:text-neutral-400"
            )}
          >
            {isArabic ? step.titleAr : step.titleEn}
          </p>
          {step.optional && (
            <p className="text-2xs text-neutral-400 dark:text-neutral-500">
              ({mergedLabels.optional})
            </p>
          )}
        </div>
      </button>
    );
  };

  const renderProgressBar = () => (
    <div className="relative h-1 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
      <div
        className={cn(
          "absolute inset-y-0 left-0 bg-primary-500 dark:bg-primary-400",
          "transition-all duration-500 ease-out rounded-full",
          isArabic && "left-auto right-0"
        )}
        style={{ width: `${progressPercentage}%` }}
      />
    </div>
  );

  const renderVerticalVariant = () => (
    <div className="flex gap-6">
      {/* Vertical steps */}
      <div className="flex flex-col">
        {steps.map((step, index) => {
          const status = getStepStatus(index);
          const isLast = index === steps.length - 1;

          return (
            <div key={step.id} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                {renderStepIndicator(step, index)}
                {!isLast && (
                  <div
                    className={cn(
                      "w-0.5 h-8 my-2 transition-colors duration-300",
                      status === "completed"
                        ? "bg-success-500 dark:bg-success-400"
                        : "bg-neutral-200 dark:bg-neutral-700"
                    )}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Content area */}
      <div className="flex-1">{children}</div>
    </div>
  );

  if (variant === "vertical") {
    return (
      <div className={cn("w-full", className)} dir={isArabic ? "rtl" : "ltr"}>
        {renderVerticalVariant()}
      </div>
    );
  }

  return (
    <div className={cn("w-full space-y-6", className)} dir={isArabic ? "rtl" : "ltr"}>
      {/* Progress bar */}
      {renderProgressBar()}

      {/* Step indicators */}
      <div
        className={cn(
          "flex justify-between items-start",
          variant === "compact" && "justify-center gap-8"
        )}
      >
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            {renderStepIndicator(step, index)}
            {/* Connector line (not for last item) */}
            {index < steps.length - 1 && variant !== "compact" && (
              <div
                className={cn(
                  "flex-1 h-0.5 mt-5 mx-2",
                  "transition-colors duration-300",
                  getStepStatus(index) === "completed"
                    ? "bg-success-500 dark:bg-success-400"
                    : "bg-neutral-200 dark:bg-neutral-700"
                )}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Current step description */}
      {steps[currentStep]?.descriptionEn && (
        <p className="text-sm text-neutral-600 dark:text-neutral-400 text-center">
          {isArabic
            ? steps[currentStep].descriptionAr || steps[currentStep].descriptionEn
            : steps[currentStep].descriptionEn}
        </p>
      )}

      {/* Error message */}
      {error && (
        <div
          className={cn(
            "p-3 rounded-lg text-sm",
            "bg-error-50 text-error-700 border border-error-200",
            "dark:bg-error-900/30 dark:text-error-300 dark:border-error-800"
          )}
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Step content */}
      <div className="min-h-[200px]">{children}</div>

      {/* Navigation buttons */}
      <div
        className={cn(
          "flex justify-between items-center pt-4",
          "border-t border-neutral-200 dark:border-neutral-700"
        )}
      >
        <button
          type="button"
          onClick={handlePrevious}
          disabled={isFirstStep || isValidating}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-lg",
            "text-sm font-medium transition-colors duration-200",
            "border border-neutral-300 dark:border-neutral-600",
            "text-neutral-700 dark:text-neutral-200",
            "hover:bg-neutral-100 dark:hover:bg-neutral-800",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          <ChevronLeft size={16} className="rtl:rotate-180" />
          {mergedLabels.previous}
        </button>

        <button
          type="button"
          onClick={handleNext}
          disabled={isValidating}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-lg",
            "text-sm font-medium transition-colors duration-200",
            "bg-primary-600 text-white",
            "hover:bg-primary-700",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {isValidating ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              {isArabic ? "جار التحقق..." : "Validating..."}
            </>
          ) : (
            <>
              {isLastStep ? mergedLabels.finish : mergedLabels.next}
              {!isLastStep && <ChevronRight size={16} className="rtl:rotate-180" />}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

StepWizard.displayName = "StepWizard";

export { StepWizard };
