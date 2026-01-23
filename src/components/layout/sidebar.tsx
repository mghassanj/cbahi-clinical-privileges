"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  FileText,
  Users,
  Settings,
  Shield,
  ClipboardList,
  BarChart3,
  Building2,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  HelpCircle,
} from "lucide-react";

export interface MenuItem {
  /**
   * Unique identifier
   */
  id: string;
  /**
   * Label in English
   */
  labelEn: string;
  /**
   * Label in Arabic
   */
  labelAr: string;
  /**
   * Route path
   */
  href: string;
  /**
   * Icon component
   */
  icon: React.ReactNode;
  /**
   * Required roles to see this item
   */
  roles?: string[];
  /**
   * Sub-menu items
   */
  children?: MenuItem[];
  /**
   * Badge count (e.g., pending items)
   */
  badge?: number;
}

export interface SidebarProps {
  /**
   * Menu items to display
   */
  items?: MenuItem[];
  /**
   * Current user role
   */
  userRole?: string;
  /**
   * Current locale
   * @default "en"
   */
  locale?: "en" | "ar";
  /**
   * Whether sidebar is collapsed by default
   * @default false
   */
  defaultCollapsed?: boolean;
  /**
   * Callback when collapse state changes
   */
  onCollapseChange?: (collapsed: boolean) => void;
  /**
   * Logo element
   */
  logo?: React.ReactNode;
  /**
   * Additional footer content
   */
  footer?: React.ReactNode;
  /**
   * Additional class name
   */
  className?: string;
}

const DEFAULT_MENU_ITEMS: MenuItem[] = [
  {
    id: "dashboard",
    labelEn: "Dashboard",
    labelAr: "لوحة التحكم",
    href: "/dashboard",
    icon: <Home size={20} />,
  },
  {
    id: "requests",
    labelEn: "My Requests",
    labelAr: "طلباتي",
    href: "/requests",
    icon: <FileText size={20} />,
  },
  {
    id: "approvals",
    labelEn: "Approvals",
    labelAr: "الموافقات",
    href: "/approvals",
    icon: <ClipboardList size={20} />,
    roles: ["approver", "admin", "department_head"],
  },
  {
    id: "privileges",
    labelEn: "Privileges",
    labelAr: "الصلاحيات",
    href: "/privileges",
    icon: <Shield size={20} />,
  },
  {
    id: "staff",
    labelEn: "Staff",
    labelAr: "الموظفين",
    href: "/staff",
    icon: <Users size={20} />,
    roles: ["admin", "hr"],
  },
  {
    id: "reports",
    labelEn: "Reports",
    labelAr: "التقارير",
    href: "/reports",
    icon: <BarChart3 size={20} />,
    roles: ["admin", "department_head"],
  },
  {
    id: "organization",
    labelEn: "Organization",
    labelAr: "المنظمة",
    href: "/organization",
    icon: <Building2 size={20} />,
    roles: ["admin"],
  },
  {
    id: "settings",
    labelEn: "Settings",
    labelAr: "الإعدادات",
    href: "/settings",
    icon: <Settings size={20} />,
  },
];

const LABELS = {
  en: {
    collapse: "Collapse sidebar",
    expand: "Expand sidebar",
    menu: "Menu",
    help: "Help",
    logout: "Logout",
  },
  ar: {
    collapse: "طي القائمة الجانبية",
    expand: "توسيع القائمة الجانبية",
    menu: "القائمة",
    help: "مساعدة",
    logout: "تسجيل الخروج",
  },
};

/**
 * Collapsible sidebar navigation component with liquid glass effect.
 * Supports role-based menu items and mobile responsive drawer.
 */
const Sidebar: React.FC<SidebarProps> = ({
  items = DEFAULT_MENU_ITEMS,
  userRole = "user",
  locale = "en",
  defaultCollapsed = false,
  onCollapseChange,
  logo,
  footer,
  className,
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const pathname = usePathname();
  const isArabic = locale === "ar";
  const labels = LABELS[locale];

  // Filter items based on user role
  const filteredItems = React.useMemo(() => {
    return items.filter((item) => {
      if (!item.roles || item.roles.length === 0) return true;
      return item.roles.includes(userRole);
    });
  }, [items, userRole]);

  const handleCollapseToggle = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    if (onCollapseChange) {
      onCollapseChange(newCollapsed);
    }
  };

  const isActiveRoute = (href: string) => {
    return pathname === href || pathname.startsWith(href + "/");
  };

  const renderMenuItem = (item: MenuItem) => {
    const isActive = isActiveRoute(item.href);

    return (
      <Link
        key={item.id}
        href={item.href}
        onClick={() => setIsMobileOpen(false)}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg",
          "transition-all duration-200",
          "group relative",
          isActive
            ? "bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300"
            : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800/50",
          isCollapsed && "justify-center px-2"
        )}
        aria-current={isActive ? "page" : undefined}
      >
        {/* Icon */}
        <span
          className={cn(
            "flex-shrink-0 transition-colors",
            isActive && "text-primary-600 dark:text-primary-400"
          )}
        >
          {item.icon}
        </span>

        {/* Label */}
        {!isCollapsed && (
          <span
            className={cn(
              "flex-1 text-sm font-medium truncate",
              isArabic && "font-arabic"
            )}
          >
            {isArabic ? item.labelAr : item.labelEn}
          </span>
        )}

        {/* Badge */}
        {item.badge && item.badge > 0 && (
          <span
            className={cn(
              "flex-shrink-0 min-w-[20px] h-5 px-1.5",
              "flex items-center justify-center",
              "text-xs font-bold text-white",
              "bg-error-500 rounded-full",
              isCollapsed && "absolute -top-1 -right-1 rtl:-left-1 rtl:right-auto"
            )}
          >
            {item.badge > 99 ? "99+" : item.badge}
          </span>
        )}

        {/* Tooltip for collapsed state */}
        {isCollapsed && (
          <div
            className={cn(
              "absolute z-50 px-2 py-1 rounded-md",
              "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900",
              "text-xs font-medium whitespace-nowrap",
              "opacity-0 invisible group-hover:opacity-100 group-hover:visible",
              "transition-all duration-200",
              "ltr:left-full ltr:ml-2 rtl:right-full rtl:mr-2",
              isArabic && "font-arabic"
            )}
          >
            {isArabic ? item.labelAr : item.labelEn}
          </div>
        )}
      </Link>
    );
  };

  const sidebarContent = (
    <>
      {/* Logo/Header */}
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-5",
          "border-b border-white/20 dark:border-neutral-700/30",
          isCollapsed && "justify-center px-2"
        )}
      >
        {logo || (
          <>
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white font-bold">
              C
            </div>
            {!isCollapsed && (
              <span className={cn("text-lg font-bold text-neutral-900 dark:text-white", isArabic && "font-arabic")}>
                CBAHI
              </span>
            )}
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {filteredItems.map(renderMenuItem)}
      </nav>

      {/* Footer */}
      <div
        className={cn(
          "p-3 border-t border-white/20 dark:border-neutral-700/30",
          "space-y-1"
        )}
      >
        {footer}

        {/* Help link */}
        <Link
          href="/help"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg",
            "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800/50",
            "transition-colors duration-200",
            isCollapsed && "justify-center px-2"
          )}
        >
          <HelpCircle size={20} />
          {!isCollapsed && (
            <span className={cn("text-sm", isArabic && "font-arabic")}>
              {labels.help}
            </span>
          )}
        </Link>

        {/* Collapse toggle (desktop only) */}
        <button
          type="button"
          onClick={handleCollapseToggle}
          className={cn(
            "hidden lg:flex items-center gap-3 w-full px-3 py-2 rounded-lg",
            "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800/50",
            "transition-colors duration-200",
            isCollapsed && "justify-center px-2"
          )}
          aria-label={isCollapsed ? labels.expand : labels.collapse}
        >
          {isArabic ? (
            isCollapsed ? (
              <ChevronLeft size={20} />
            ) : (
              <ChevronRight size={20} />
            )
          ) : isCollapsed ? (
            <ChevronRight size={20} />
          ) : (
            <ChevronLeft size={20} />
          )}
          {!isCollapsed && (
            <span className={cn("text-sm", isArabic && "font-arabic")}>
              {labels.collapse}
            </span>
          )}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        type="button"
        onClick={() => setIsMobileOpen(true)}
        className={cn(
          "lg:hidden fixed top-4 z-40 p-2 rounded-lg",
          "bg-white/80 dark:bg-neutral-900/80 backdrop-blur-lg",
          "border border-neutral-200 dark:border-neutral-700",
          "shadow-soft",
          "ltr:left-4 rtl:right-4"
        )}
        aria-label={labels.menu}
      >
        <Menu size={24} />
      </button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "lg:hidden fixed inset-y-0 z-50 w-64",
          "transform transition-transform duration-300 ease-in-out",
          "ltr:left-0 rtl:right-0",
          isMobileOpen
            ? "translate-x-0"
            : "ltr:-translate-x-full rtl:translate-x-full"
        )}
        dir={isArabic ? "rtl" : "ltr"}
      >
        <div
          className={cn(
            "flex flex-col h-full",
            "bg-white/90 dark:bg-neutral-900/90 backdrop-blur-[16px]",
            "border-r border-white/50 dark:border-neutral-700/50",
            "ltr:border-r rtl:border-r-0 rtl:border-l"
          )}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className={cn(
              "absolute top-4 p-2 rounded-lg",
              "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800",
              "ltr:right-4 rtl:left-4"
            )}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>

          {sidebarContent}
        </div>
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col fixed inset-y-0 z-30",
          "transition-all duration-300 ease-in-out",
          isCollapsed ? "w-16" : "w-64",
          "ltr:left-0 rtl:right-0",
          className
        )}
        dir={isArabic ? "rtl" : "ltr"}
      >
        <div
          className={cn(
            "flex flex-col h-full",
            "bg-white/80 dark:bg-neutral-900/80 backdrop-blur-[16px]",
            "border-white/50 dark:border-neutral-700/50",
            "shadow-soft",
            "ltr:border-r rtl:border-r-0 rtl:border-l"
          )}
        >
          {sidebarContent}
        </div>
      </aside>
    </>
  );
};

Sidebar.displayName = "Sidebar";

export { Sidebar };
