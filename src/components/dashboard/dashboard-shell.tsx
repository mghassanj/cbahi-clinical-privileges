"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { LanguageSwitcher } from "@/components/custom/language-switcher";
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  User,
  Settings,
  Users,
  LogOut,
  Menu,
  X,
  Bell,
  ChevronDown,
  Shield,
} from "lucide-react";

export type UserRole = "employee" | "approver" | "admin";

interface DashboardUser {
  id: string;
  name: string;
  nameAr?: string;
  email: string;
  role: UserRole;
  department?: string;
  avatar?: string;
}

interface DashboardShellProps {
  children: React.ReactNode;
  user?: DashboardUser | null;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  children?: NavItem[];
}

const DashboardShell: React.FC<DashboardShellProps> = ({ children, user }) => {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const [pendingApprovalsCount, setPendingApprovalsCount] = React.useState<number | undefined>(undefined);
  const userMenuRef = React.useRef<HTMLDivElement>(null);

  const isRTL = locale === "ar";

  // Fetch pending approvals count for approvers/admins
  React.useEffect(() => {
    if (user?.role === "approver" || user?.role === "admin") {
      fetch("/api/approvals?limit=1")
        .then((res) => res.json())
        .then((data) => {
          setPendingApprovalsCount(data.statistics?.pending || 0);
        })
        .catch(() => {
          setPendingApprovalsCount(0);
        });
    }
  }, [user?.role]);

  // Use authenticated user data - no fallback to mock data
  const currentUser: DashboardUser | null = user || null;

  // Close user menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Show loading state if no user is available (should be handled by auth)
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
          <p className="mt-4 text-neutral-600 dark:text-neutral-400">Loading...</p>
        </div>
      </div>
    );
  }

  const displayName = isRTL && currentUser.nameAr ? currentUser.nameAr : currentUser.name;

  const getNavItems = (): NavItem[] => {
    const baseItems: NavItem[] = [
      {
        href: `/${locale}`,
        label: t("common.navigation.dashboard"),
        icon: LayoutDashboard,
      },
      {
        href: `/${locale}/requests`,
        label: t("common.navigation.requests"),
        icon: FileText,
      },
    ];

    const approverItems: NavItem[] = [
      {
        href: `/${locale}/approvals`,
        label: t("common.navigation.approvals"),
        icon: CheckSquare,
        badge: pendingApprovalsCount && pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
      },
    ];

    const profileItem: NavItem = {
      href: `/${locale}/profile`,
      label: t("common.navigation.profile"),
      icon: User,
    };

    const adminItems: NavItem[] = [
      {
        href: `/${locale}/admin`,
        label: t("common.navigation.admin"),
        icon: Shield,
        children: [
          {
            href: `/${locale}/admin/users`,
            label: t("admin.userManagement.users"),
            icon: Users,
          },
          {
            href: `/${locale}/admin/privileges`,
            label: t("admin.privileges.title") || "Privileges",
            icon: CheckSquare,
          },
          {
            href: `/${locale}/admin/settings`,
            label: t("common.navigation.settings"),
            icon: Settings,
          },
        ],
      },
    ];

    let items = [...baseItems];

    if (currentUser.role === "approver" || currentUser.role === "admin") {
      items = [...items, ...approverItems];
    }

    items.push(profileItem);

    if (currentUser.role === "admin") {
      items = [...items, ...adminItems];
    }

    return items;
  };

  const navItems = getNavItems();

  const isActive = (href: string) => {
    const normalizedPath = pathname.replace(/\/$/, "");
    const normalizedHref = href.replace(/\/$/, "");

    if (normalizedHref === `/${locale}`) {
      return normalizedPath === normalizedHref;
    }
    return normalizedPath.startsWith(normalizedHref);
  };

  return (
    <div className={cn("min-h-screen bg-neutral-50 dark:bg-neutral-950", isRTL && "rtl")}>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 z-50 h-screen w-64 bg-white shadow-lg transition-transform duration-300 dark:bg-neutral-900 lg:translate-x-0",
          isRTL ? "right-0" : "left-0",
          sidebarOpen
            ? "translate-x-0"
            : isRTL
            ? "translate-x-full lg:translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-neutral-200 px-4 dark:border-neutral-800">
          <Link href={`/${locale}`} className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-white">
              <Shield className="h-5 w-5" />
            </div>
            <span className="text-sm font-semibold text-neutral-900 dark:text-white">
              {t("common.appName")}
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {navItems.map((item) => (
            <div key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="h-5 w-5" />
                <span className="flex-1">{item.label}</span>
                {item.badge !== undefined && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-error-500 px-1.5 text-xs font-medium text-white">
                    {item.badge}
                  </span>
                )}
              </Link>
              {item.children && item.children.length > 0 && (
                <div className={cn("mt-1 space-y-1", isRTL ? "pr-4" : "pl-4")}>
                  {item.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                        isActive(child.href)
                          ? "bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                          : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
                      )}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <child.icon className="h-4 w-4" />
                      <span>{child.label}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div className="border-t border-neutral-200 p-4 dark:border-neutral-800">
          <button
            onClick={() => signOut({ callbackUrl: `/${locale}/login` })}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-error-600 transition-colors hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-900/20"
          >
            <LogOut className="h-5 w-5" />
            <span>{t("common.navigation.logout")}</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div
        className={cn(
          "min-h-screen transition-all duration-300 lg:ml-64",
          isRTL && "lg:ml-0 lg:mr-64"
        )}
      >
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-neutral-200 bg-white/80 px-4 backdrop-blur-lg dark:border-neutral-800 dark:bg-neutral-900/80">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Switcher */}
            <LanguageSwitcher variant="icon" size="sm" />

            {/* Notifications */}
            <button className="relative rounded-lg p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800">
              <Bell className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-error-500" />
            </button>

            {/* User menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 rounded-lg p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <Avatar
                  name={currentUser.name}
                  src={currentUser.avatar}
                  size="sm"
                />
                <span className="hidden text-sm font-medium text-neutral-700 dark:text-neutral-300 md:block">
                  {displayName}
                </span>
                <ChevronDown className="h-4 w-4 text-neutral-500" />
              </button>

              {userMenuOpen && (
                <div
                  className={cn(
                    "absolute top-full mt-2 w-56 rounded-lg bg-white shadow-lg ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-800",
                    isRTL ? "left-0" : "right-0"
                  )}
                >
                  <div className="border-b border-neutral-200 p-3 dark:border-neutral-800">
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">
                      {displayName}
                    </p>
                    <p className="text-xs text-neutral-500">{currentUser.email}</p>
                    <span className="mt-1 inline-block rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900 dark:text-primary-300">
                      {currentUser.role}
                    </span>
                  </div>
                  <div className="p-1">
                    <Link
                      href={`/${locale}/profile`}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <User className="h-4 w-4" />
                      {t("common.navigation.profile")}
                    </Link>
                    <button
                      onClick={() => signOut({ callbackUrl: `/${locale}/login` })}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-900/20"
                    >
                      <LogOut className="h-4 w-4" />
                      {t("common.navigation.logout")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
};

export { DashboardShell };
export type { DashboardUser };
