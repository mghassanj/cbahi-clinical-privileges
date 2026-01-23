"use client";

import * as React from "react";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";

export interface BilingualTextProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  /**
   * English text
   */
  en: string;
  /**
   * Arabic text
   */
  ar: string;
  /**
   * Whether to show both languages
   * @default false
   */
  showBoth?: boolean;
  /**
   * Separator when showing both languages
   * @default " / "
   */
  separator?: string;
}

/**
 * Component that displays text in the current locale (Arabic or English).
 * Uses next-intl to determine the current locale.
 * Supports showing both languages side by side if needed.
 */
const BilingualText = React.forwardRef<HTMLSpanElement, BilingualTextProps>(
  (
    { en, ar, showBoth = false, separator = " / ", className, ...props },
    ref
  ) => {
    const locale = useLocale();
    const isArabic = locale === "ar";

    if (showBoth) {
      return (
        <span
          ref={ref}
          className={cn("inline-flex items-center gap-1", className)}
          {...props}
        >
          <span dir="ltr" lang="en" className="font-sans">
            {en}
          </span>
          <span className="text-neutral-400">{separator}</span>
          <span dir="rtl" lang="ar" className="font-arabic">
            {ar}
          </span>
        </span>
      );
    }

    return (
      <span
        ref={ref}
        dir={isArabic ? "rtl" : "ltr"}
        lang={isArabic ? "ar" : "en"}
        className={cn(isArabic ? "font-arabic" : "font-sans", className)}
        {...props}
      >
        {isArabic ? ar : en}
      </span>
    );
  }
);

BilingualText.displayName = "BilingualText";

/**
 * Hook to get the appropriate text based on current locale
 */
export function useBilingualText(en: string, ar: string): string {
  const locale = useLocale();
  return locale === "ar" ? ar : en;
}

/**
 * Utility to get localized text from a bilingual object
 */
export function getLocalizedText(
  text: { en: string; ar: string },
  locale: "en" | "ar"
): string {
  return locale === "ar" ? text.ar : text.en;
}

export { BilingualText };
