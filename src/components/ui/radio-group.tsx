"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface RadioGroupContextValue {
  name: string;
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const RadioGroupContext = React.createContext<RadioGroupContextValue | undefined>(
  undefined
);

function useRadioGroup() {
  const context = React.useContext(RadioGroupContext);
  if (!context) {
    throw new Error("useRadioGroup must be used within a RadioGroup");
  }
  return context;
}

export interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  (
    {
      className,
      name,
      value,
      defaultValue,
      onValueChange,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = React.useState(
      value ?? defaultValue ?? ""
    );

    const currentValue = value !== undefined ? value : internalValue;

    const handleChange = React.useCallback(
      (newValue: string) => {
        if (value === undefined) {
          setInternalValue(newValue);
        }
        onValueChange?.(newValue);
      },
      [value, onValueChange]
    );

    React.useEffect(() => {
      if (value !== undefined) {
        setInternalValue(value);
      }
    }, [value]);

    return (
      <RadioGroupContext.Provider
        value={{ name, value: currentValue, onChange: handleChange, disabled }}
      >
        <div
          ref={ref}
          role="radiogroup"
          className={cn("flex flex-col gap-3", className)}
          {...props}
        >
          {children}
        </div>
      </RadioGroupContext.Provider>
    );
  }
);
RadioGroup.displayName = "RadioGroup";

export interface RadioGroupItemProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "name"> {
  value: string;
  label?: string;
  description?: string;
}

const RadioGroupItem = React.forwardRef<HTMLInputElement, RadioGroupItemProps>(
  ({ className, value, label, description, id, disabled, ...props }, ref) => {
    const { name, value: groupValue, onChange, disabled: groupDisabled } = useRadioGroup();
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const isChecked = groupValue === value;
    const isDisabled = disabled || groupDisabled;

    return (
      <div className="flex items-start gap-3">
        <div className="relative flex items-center">
          <input
            type="radio"
            id={inputId}
            ref={ref}
            name={name}
            value={value}
            checked={isChecked}
            onChange={() => onChange(value)}
            disabled={isDisabled}
            className="peer sr-only"
            {...props}
          />
          <div
            className={cn(
              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200",
              "peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500 peer-focus-visible:ring-offset-2",
              "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
              isChecked
                ? "border-primary-600 bg-white dark:bg-neutral-900"
                : "border-neutral-300 bg-white dark:border-neutral-600 dark:bg-neutral-900",
              className
            )}
          >
            {isChecked && (
              <div className="h-2.5 w-2.5 rounded-full bg-primary-600" />
            )}
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
                  isDisabled && "cursor-not-allowed opacity-70"
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
RadioGroupItem.displayName = "RadioGroupItem";

// Card variant for radio items
export interface RadioCardProps extends RadioGroupItemProps {
  icon?: React.ReactNode;
}

const RadioCard = React.forwardRef<HTMLInputElement, RadioCardProps>(
  ({ className, value, label, description, icon, id, disabled, ...props }, ref) => {
    const { name, value: groupValue, onChange, disabled: groupDisabled } = useRadioGroup();
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const isChecked = groupValue === value;
    const isDisabled = disabled || groupDisabled;

    return (
      <div className="relative">
        <input
          type="radio"
          id={inputId}
          ref={ref}
          name={name}
          value={value}
          checked={isChecked}
          onChange={() => onChange(value)}
          disabled={isDisabled}
          className="peer sr-only"
          {...props}
        />
        <label
          htmlFor={inputId}
          className={cn(
            "flex cursor-pointer flex-col gap-2 rounded-xl border-2 p-4 transition-all duration-200",
            "hover:border-primary-300 dark:hover:border-primary-700",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500 peer-focus-visible:ring-offset-2",
            "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
            isChecked
              ? "border-primary-600 bg-primary-50 dark:bg-primary-900/20"
              : "border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900",
            className
          )}
        >
          <div className="flex items-center gap-3">
            {icon && (
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg",
                  isChecked
                    ? "bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400"
                    : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800"
                )}
              >
                {icon}
              </div>
            )}
            <div className="flex-1">
              {label && (
                <div
                  className={cn(
                    "text-sm font-semibold",
                    "text-neutral-900 dark:text-neutral-100"
                  )}
                >
                  {label}
                </div>
              )}
              {description && (
                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                  {description}
                </div>
              )}
            </div>
            <div
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                isChecked
                  ? "border-primary-600"
                  : "border-neutral-300 dark:border-neutral-600"
              )}
            >
              {isChecked && (
                <div className="h-2.5 w-2.5 rounded-full bg-primary-600" />
              )}
            </div>
          </div>
        </label>
      </div>
    );
  }
);
RadioCard.displayName = "RadioCard";

export { RadioGroup, RadioGroupItem, RadioCard };
