"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";

/**
 * Syncs the HTML lang attribute with the current locale from next-intl context.
 * This is needed because the root layout.tsx doesn't have access to the [locale] param.
 */
export function LocaleSync() {
  const locale = useLocale();

  useEffect(() => {
    // Update the HTML lang attribute to match the current locale
    document.documentElement.lang = locale;

    // Update dir attribute for RTL support
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);

  return null;
}
