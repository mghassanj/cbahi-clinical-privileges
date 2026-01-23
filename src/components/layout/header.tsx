"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Search, User, LogOut, Settings, ChevronDown, HelpCircle } from "lucide-react";
import { NotificationBell, Notification } from "@/components/custom/notification-bell";
import { LanguageSwitcher } from "@/components/custom/language-switcher";

export interface UserInfo {
  /**
   * User ID
   */
  id: string;
  /**
   * User name in English
   */
  nameEn: string;
  /**
   * User name in Arabic
   */
  nameAr: string;
  /**
   * User email
   */
  email: string;
  /**
   * User avatar URL
   */
  avatar?: string;
  /**
   * User role
   */
  role?: string;
  /**
   * Role in Arabic
   */
  roleAr?: string;
}

export interface HeaderProps {
  /**
   * Application title in English
   */
  titleEn?: string;
  /**
   * Application title in Arabic
   */
  titleAr?: string;
  /**
   * Logo element or URL
   */
  logo?: React.ReactNode | string;
  /**
   * Whether to show search bar
   * @default true
   */
  showSearch?: boolean;
  /**
   * Search placeholder
   */
  searchPlaceholder?: { en: string; ar: string };
  /**
   * Search callback
   */
  onSearch?: (query: string) => void;
  /**
   * Current user info
   */
  user?: UserInfo;
  /**
   * Notifications
   */
  notifications?: Notification[];
  /**
   * Mark notification as read callback
   */
  onMarkNotificationRead?: (id: string) => void;
  /**
   * Mark all notifications as read callback
   */
  onMarkAllNotificationsRead?: () => void;
  /**
   * Notification click callback
   */
  onNotificationClick?: (notification: Notification) => void;
  /**
   * Logout callback
   */
  onLogout?: () => void;
  /**
   * Current locale
   * @default "en"
   */
  locale?: "en" | "ar";
  /**
   * Whether sidebar is collapsed (affects left padding)
   * @default false
   */
  sidebarCollapsed?: boolean;
  /**
   * Additional class name
   */
  className?: string;
}

const LABELS = {
  en: {
    search: "Search...",
    profile: "Profile",
    settings: "Settings",
    help: "Help",
    logout: "Logout",
  },
  ar: {
    search: "بحث...",
    profile: "الملف الشخصي",
    settings: "الإعدادات",
    help: "مساعدة",
    logout: "تسجيل الخروج",
  },
};

/**
 * Get initials from name
 */
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Top header component with logo, search, notifications, and user menu.
 */
const Header: React.FC<HeaderProps> = ({
  titleEn = "CBAHI",
  titleAr = "سباهي",
  logo,
  showSearch = true,
  searchPlaceholder,
  onSearch,
  user,
  notifications = [],
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onNotificationClick,
  onLogout,
  locale = "en",
  sidebarCollapsed = false,
  className,
}) => {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);
  const userMenuRef = React.useRef<HTMLDivElement>(null);

  const isArabic = locale === "ar";
  const labels = LABELS[locale];

  // Close user menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch && searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const renderLogo = () => {
    if (logo) {
      if (typeof logo === "string") {
        return (
          <img
            src={logo}
            alt={isArabic ? titleAr : titleEn}
            className="h-8 w-auto"
          />
        );
      }
      return logo;
    }

    return (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white font-bold">
          C
        </div>
        <span
          className={cn(
            "text-lg font-bold text-neutral-900 dark:text-white hidden sm:block",
            isArabic && "font-arabic"
          )}
        >
          {isArabic ? titleAr : titleEn}
        </span>
      </div>
    );
  };

  const renderUserAvatar = () => {
    if (user?.avatar) {
      return (
        <img
          src={user.avatar}
          alt={isArabic ? user.nameAr : user.nameEn}
          className="w-8 h-8 rounded-full object-cover"
        />
      );
    }

    return (
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center",
          "bg-primary-100 text-primary-700",
          "dark:bg-primary-900/40 dark:text-primary-300",
          "text-sm font-medium"
        )}
      >
        {user ? getInitials(isArabic ? user.nameAr : user.nameEn) : <User size={16} />}
      </div>
    );
  };

  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-20",
        "h-16 px-4 lg:px-6",
        "flex items-center justify-between gap-4",
        "bg-white/80 dark:bg-neutral-900/80 backdrop-blur-[16px]",
        "border-b border-white/50 dark:border-neutral-700/50",
        // Adjust width based on sidebar
        "transition-all duration-300",
        sidebarCollapsed ? "lg:left-16" : "lg:left-64",
        "left-0",
        className
      )}
      dir={isArabic ? "rtl" : "ltr"}
    >
      {/* Left section: Logo (mobile) */}
      <div className="flex items-center gap-4 lg:hidden">
        {/* Space for mobile menu button */}
        <div className="w-10" />
        <Link href="/dashboard">{renderLogo()}</Link>
      </div>

      {/* Center section: Search */}
      {showSearch && (
        <form
          onSubmit={handleSearchSubmit}
          className="hidden sm:flex flex-1 max-w-md mx-4"
        >
          <div className="relative w-full">
            <Search
              size={18}
              className={cn(
                "absolute top-1/2 -translate-y-1/2 text-neutral-400",
                "ltr:left-3 rtl:right-3"
              )}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder={
                searchPlaceholder?.[locale] || labels.search
              }
              className={cn(
                "w-full py-2 rounded-lg",
                "ltr:pl-10 ltr:pr-4 rtl:pr-10 rtl:pl-4",
                "bg-neutral-100 dark:bg-neutral-800",
                "border border-transparent",
                "text-neutral-900 dark:text-neutral-100",
                "placeholder-neutral-400 dark:placeholder-neutral-500",
                "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent",
                "transition-all duration-200",
                isArabic && "font-arabic text-right"
              )}
            />
          </div>
        </form>
      )}

      {/* Right section: Actions */}
      <div className="flex items-center gap-2">
        {/* Language switcher */}
        <LanguageSwitcher variant="icon" size="default" />

        {/* Notifications */}
        {onMarkNotificationRead && (
          <NotificationBell
            notifications={notifications}
            onMarkRead={onMarkNotificationRead}
            onMarkAllRead={onMarkAllNotificationsRead}
            onClick={onNotificationClick}
            locale={locale}
          />
        )}

        {/* User menu */}
        {user && (
          <div ref={userMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className={cn(
                "flex items-center gap-2 p-1.5 rounded-lg",
                "hover:bg-neutral-100 dark:hover:bg-neutral-800",
                "transition-colors duration-200",
                "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
                "dark:focus:ring-offset-neutral-900"
              )}
              aria-expanded={isUserMenuOpen}
              aria-haspopup="true"
            >
              {renderUserAvatar()}
              <span className="hidden md:block text-sm font-medium text-neutral-700 dark:text-neutral-200 max-w-[120px] truncate">
                {isArabic ? user.nameAr : user.nameEn}
              </span>
              <ChevronDown
                size={16}
                className={cn(
                  "hidden md:block text-neutral-400 transition-transform duration-200",
                  isUserMenuOpen && "rotate-180"
                )}
              />
            </button>

            {/* User dropdown menu */}
            {isUserMenuOpen && (
              <div
                className={cn(
                  "absolute top-full mt-2 w-56 rounded-lg",
                  "bg-white dark:bg-neutral-900",
                  "border border-neutral-200 dark:border-neutral-700",
                  "shadow-lg overflow-hidden",
                  "animate-slide-down z-50",
                  "ltr:right-0 rtl:left-0"
                )}
              >
                {/* User info */}
                <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
                  <p
                    className={cn(
                      "text-sm font-medium text-neutral-900 dark:text-neutral-100",
                      isArabic && "font-arabic"
                    )}
                  >
                    {isArabic ? user.nameAr : user.nameEn}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                    {user.email}
                  </p>
                  {user.role && (
                    <p
                      className={cn(
                        "text-xs text-primary-600 dark:text-primary-400 mt-1",
                        isArabic && "font-arabic"
                      )}
                    >
                      {isArabic ? user.roleAr || user.role : user.role}
                    </p>
                  )}
                </div>

                {/* Menu items */}
                <div className="py-1">
                  <Link
                    href="/profile"
                    onClick={() => setIsUserMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2",
                      "text-sm text-neutral-700 dark:text-neutral-200",
                      "hover:bg-neutral-100 dark:hover:bg-neutral-800",
                      "transition-colors duration-150"
                    )}
                  >
                    <User size={16} />
                    <span className={isArabic ? "font-arabic" : ""}>
                      {labels.profile}
                    </span>
                  </Link>

                  <Link
                    href="/settings"
                    onClick={() => setIsUserMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2",
                      "text-sm text-neutral-700 dark:text-neutral-200",
                      "hover:bg-neutral-100 dark:hover:bg-neutral-800",
                      "transition-colors duration-150"
                    )}
                  >
                    <Settings size={16} />
                    <span className={isArabic ? "font-arabic" : ""}>
                      {labels.settings}
                    </span>
                  </Link>

                  <Link
                    href="/help"
                    onClick={() => setIsUserMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2",
                      "text-sm text-neutral-700 dark:text-neutral-200",
                      "hover:bg-neutral-100 dark:hover:bg-neutral-800",
                      "transition-colors duration-150"
                    )}
                  >
                    <HelpCircle size={16} />
                    <span className={isArabic ? "font-arabic" : ""}>
                      {labels.help}
                    </span>
                  </Link>
                </div>

                {/* Logout */}
                <div className="border-t border-neutral-200 dark:border-neutral-700 py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      if (onLogout) onLogout();
                    }}
                    className={cn(
                      "flex items-center gap-3 w-full px-4 py-2",
                      "text-sm text-error-600 dark:text-error-400",
                      "hover:bg-error-50 dark:hover:bg-error-900/20",
                      "transition-colors duration-150"
                    )}
                  >
                    <LogOut size={16} />
                    <span className={isArabic ? "font-arabic" : ""}>
                      {labels.logout}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

Header.displayName = "Header";

export { Header };
