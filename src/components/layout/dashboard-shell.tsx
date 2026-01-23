"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Sidebar, MenuItem } from "./sidebar";
import { Header, UserInfo } from "./header";
import { Notification } from "@/components/custom/notification-bell";

export interface DashboardShellProps {
  /**
   * Main content to render
   */
  children: React.ReactNode;
  /**
   * Sidebar menu items
   */
  menuItems?: MenuItem[];
  /**
   * Current user information
   */
  user?: UserInfo;
  /**
   * User role for menu filtering
   */
  userRole?: string;
  /**
   * Current locale
   * @default "en"
   */
  locale?: "en" | "ar";
  /**
   * Notifications for the notification bell
   */
  notifications?: Notification[];
  /**
   * Callback when a notification is marked as read
   */
  onMarkNotificationRead?: (id: string) => void;
  /**
   * Callback when all notifications are marked as read
   */
  onMarkAllNotificationsRead?: () => void;
  /**
   * Callback when a notification is clicked
   */
  onNotificationClick?: (notification: Notification) => void;
  /**
   * Logout callback
   */
  onLogout?: () => void;
  /**
   * Search callback
   */
  onSearch?: (query: string) => void;
  /**
   * Whether to show search in header
   * @default true
   */
  showSearch?: boolean;
  /**
   * Application title
   */
  title?: { en: string; ar: string };
  /**
   * Logo element
   */
  logo?: React.ReactNode;
  /**
   * Page title for the current route
   */
  pageTitle?: { en: string; ar: string };
  /**
   * Breadcrumb items
   */
  breadcrumbs?: Array<{
    labelEn: string;
    labelAr: string;
    href?: string;
  }>;
  /**
   * Additional header content (actions, etc.)
   */
  headerActions?: React.ReactNode;
  /**
   * Additional class name for the main content area
   */
  className?: string;
}

/**
 * Dashboard layout wrapper that combines sidebar, header, and main content area.
 * Handles mobile responsive layout with collapsible sidebar.
 */
const DashboardShell: React.FC<DashboardShellProps> = ({
  children,
  menuItems,
  user,
  userRole,
  locale = "en",
  notifications = [],
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onNotificationClick,
  onLogout,
  onSearch,
  showSearch = true,
  title = { en: "CBAHI", ar: "سباهي" },
  logo,
  pageTitle,
  breadcrumbs,
  headerActions,
  className,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const isArabic = locale === "ar";

  // Persist sidebar state in localStorage
  React.useEffect(() => {
    const saved = localStorage.getItem("cbahi-sidebar-collapsed");
    if (saved !== null) {
      setSidebarCollapsed(saved === "true");
    }
  }, []);

  const handleSidebarCollapseChange = (collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
    localStorage.setItem("cbahi-sidebar-collapsed", String(collapsed));
  };

  return (
    <div
      className={cn(
        "min-h-screen bg-neutral-50 dark:bg-neutral-950",
        isArabic && "font-arabic"
      )}
      dir={isArabic ? "rtl" : "ltr"}
    >
      {/* Sidebar */}
      <Sidebar
        items={menuItems}
        userRole={userRole}
        locale={locale}
        defaultCollapsed={sidebarCollapsed}
        onCollapseChange={handleSidebarCollapseChange}
        logo={logo}
      />

      {/* Header */}
      <Header
        titleEn={title.en}
        titleAr={title.ar}
        logo={logo}
        showSearch={showSearch}
        onSearch={onSearch}
        user={user}
        notifications={notifications}
        onMarkNotificationRead={onMarkNotificationRead}
        onMarkAllNotificationsRead={onMarkAllNotificationsRead}
        onNotificationClick={onNotificationClick}
        onLogout={onLogout}
        locale={locale}
        sidebarCollapsed={sidebarCollapsed}
      />

      {/* Main content area */}
      <main
        className={cn(
          "pt-16 min-h-screen",
          "transition-all duration-300",
          sidebarCollapsed ? "lg:pl-16" : "lg:pl-64",
          isArabic && (sidebarCollapsed ? "lg:pr-16 lg:pl-0" : "lg:pr-64 lg:pl-0"),
          className
        )}
      >
        <div className="p-4 lg:p-6 max-w-7xl mx-auto">
          {/* Page header */}
          {(pageTitle || breadcrumbs || headerActions) && (
            <div className="mb-6">
              {/* Breadcrumbs */}
              {breadcrumbs && breadcrumbs.length > 0 && (
                <nav
                  className="mb-2"
                  aria-label={isArabic ? "مسار التنقل" : "Breadcrumb"}
                >
                  <ol className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
                    {breadcrumbs.map((crumb, index) => (
                      <li key={index} className="flex items-center gap-2">
                        {index > 0 && (
                          <span className="text-neutral-300 dark:text-neutral-600">
                            {isArabic ? "←" : "→"}
                          </span>
                        )}
                        {crumb.href ? (
                          <a
                            href={crumb.href}
                            className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                          >
                            {isArabic ? crumb.labelAr : crumb.labelEn}
                          </a>
                        ) : (
                          <span className="text-neutral-700 dark:text-neutral-300">
                            {isArabic ? crumb.labelAr : crumb.labelEn}
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                </nav>
              )}

              {/* Title and actions row */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                {pageTitle && (
                  <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    {isArabic ? pageTitle.ar : pageTitle.en}
                  </h1>
                )}
                {headerActions && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {headerActions}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Page content */}
          {children}
        </div>
      </main>
    </div>
  );
};

DashboardShell.displayName = "DashboardShell";

export { DashboardShell };
