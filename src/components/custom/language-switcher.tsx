"use client";

import * as React from "react";
import { useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Globe, Languages } from "lucide-react";

export interface LanguageSwitcherProps {
  /**
   * Visual variant of the switcher
   * @default "icon"
   */
  variant?: "icon" | "text" | "flag" | "full";
  /**
   * Size of the switcher
   * @default "default"
   */
  size?: "sm" | "default" | "lg";
  /**
   * Additional class names
   */
  className?: string;
  /**
   * Whether to show dropdown menu or just toggle
   * @default false
   */
  showDropdown?: boolean;
}

const LOCALE_STORAGE_KEY = "cbahi-preferred-locale";

const FLAG_MAP = {
  en: "🇺🇸",
  ar: "🇸🇦",
};

const LANGUAGE_NAMES = {
  en: { en: "English", ar: "الإنجليزية" },
  ar: { en: "Arabic", ar: "العربية" },
};

/**
 * Language switcher component for toggling between Arabic and English.
 * Updates URL locale prefix and persists user preference.
 */
const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  variant = "icon",
  size = "default",
  className,
  showDropdown = false,
}) => {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const currentLocale = locale as "en" | "ar";
  const targetLocale = currentLocale === "ar" ? "en" : "ar";

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const switchLocale = (newLocale: "en" | "ar") => {
    // Persist preference
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    }

    // Update URL with new locale
    const pathWithoutLocale = pathname.replace(/^\/(en|ar)/, "") || "/";
    const newPath = `/${newLocale}${pathWithoutLocale}`;

    router.push(newPath);
    setIsOpen(false);
  };

  const handleToggle = () => {
    if (showDropdown) {
      setIsOpen(!isOpen);
    } else {
      switchLocale(targetLocale);
    }
  };

  const sizeClasses = {
    sm: "h-8 px-2 text-sm",
    default: "h-10 px-3 text-base",
    lg: "h-12 px-4 text-lg",
  };

  const iconSizes = {
    sm: 16,
    default: 20,
    lg: 24,
  };

  const renderContent = () => {
    switch (variant) {
      case "flag":
        return (
          <span className="text-lg" role="img" aria-label={currentLocale}>
            {FLAG_MAP[currentLocale]}
          </span>
        );
      case "text":
        return (
          <span className="font-medium">
            {currentLocale === "ar" ? "EN" : "عر"}
          </span>
        );
      case "full":
        return (
          <span className="flex items-center gap-2">
            <span role="img" aria-label={currentLocale}>
              {FLAG_MAP[currentLocale]}
            </span>
            <span className={currentLocale === "ar" ? "font-arabic" : ""}>
              {LANGUAGE_NAMES[currentLocale][currentLocale]}
            </span>
          </span>
        );
      case "icon":
      default:
        return <Globe size={iconSizes[size]} />;
    }
  };

  return (
    <div ref={dropdownRef} className={cn("relative inline-block", className)}>
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg",
          "bg-white/80 backdrop-blur-sm border border-neutral-200",
          "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900",
          "dark:bg-neutral-800/80 dark:border-neutral-700",
          "dark:text-neutral-200 dark:hover:bg-neutral-700",
          "transition-all duration-200 ease-in-out",
          "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
          "dark:focus:ring-offset-neutral-900",
          sizeClasses[size]
        )}
        aria-label={`Switch to ${LANGUAGE_NAMES[targetLocale].en}`}
        aria-expanded={showDropdown ? isOpen : undefined}
        aria-haspopup={showDropdown ? "listbox" : undefined}
      >
        {renderContent()}
        {showDropdown && (
          <Languages
            size={iconSizes[size] - 4}
            className={cn(
              "transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        )}
      </button>

      {/* Dropdown Menu */}
      {showDropdown && isOpen && (
        <div
          className={cn(
            "absolute top-full mt-2 w-48 rounded-lg",
            "bg-white/90 backdrop-blur-lg border border-neutral-200",
            "dark:bg-neutral-800/90 dark:border-neutral-700",
            "shadow-lg z-50",
            "animate-slide-down",
            // RTL support
            "ltr:right-0 rtl:left-0"
          )}
          role="listbox"
          aria-label="Select language"
        >
          {(["en", "ar"] as const).map((lang) => (
            <button
              key={lang}
              type="button"
              role="option"
              aria-selected={currentLocale === lang}
              onClick={() => switchLocale(lang)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3",
                "text-left transition-colors duration-150",
                "first:rounded-t-lg last:rounded-b-lg",
                currentLocale === lang
                  ? "bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                  : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-700/50",
                "rtl:text-right"
              )}
            >
              <span role="img" aria-hidden="true">
                {FLAG_MAP[lang]}
              </span>
              <span
                className={cn(
                  "flex-1",
                  lang === "ar" ? "font-arabic" : "font-sans"
                )}
              >
                {LANGUAGE_NAMES[lang][lang]}
              </span>
              {currentLocale === lang && (
                <span className="text-primary-600 dark:text-primary-400">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Hook to get and persist locale preference
 */
export function useLocalePreference() {
  const [preference, setPreference] = React.useState<"en" | "ar" | null>(null);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
      if (stored === "en" || stored === "ar") {
        setPreference(stored);
      }
    }
  }, []);

  const setLocalePreference = (locale: "en" | "ar") => {
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
      setPreference(locale);
    }
  };

  return { preference, setLocalePreference };
}

export { LanguageSwitcher };
