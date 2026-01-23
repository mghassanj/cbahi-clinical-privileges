/**
 * CBAHI Auth Utilities
 *
 * Helper functions for authentication in server components and API routes
 */

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { UserRole } from "@prisma/client";

import { authOptions, ROLE_HIERARCHY } from "@/lib/auth";

// ============================================================================
// Server Session Helpers
// ============================================================================

/**
 * Get the current session on the server
 * Returns null if not authenticated
 */
export async function getSession() {
  return await getServerSession(authOptions);
}

/**
 * Get the current session or redirect to login
 * Use this in protected pages/layouts
 */
export async function requireSession(locale: string = "en") {
  const session = await getSession();

  if (!session) {
    redirect(`/${locale}/login`);
  }

  return session;
}

/**
 * Require a specific role or higher
 * Redirects to dashboard if insufficient permissions
 */
export async function requireRole(
  minimumRole: UserRole,
  locale: string = "en"
) {
  const session = await requireSession(locale);

  const userLevel = ROLE_HIERARCHY[session.user.role];
  const requiredLevel = ROLE_HIERARCHY[minimumRole];

  if (userLevel < requiredLevel) {
    redirect(`/${locale}/dashboard`);
  }

  return session;
}

/**
 * Require admin role
 * Redirects to dashboard if not admin
 */
export async function requireAdmin(locale: string = "en") {
  return requireRole(UserRole.ADMIN, locale);
}

/**
 * Require approver role (admin, medical director, head of dept/section, committee)
 */
export async function requireApprover(locale: string = "en") {
  const session = await requireSession(locale);

  const approverRoles: UserRole[] = [
    UserRole.ADMIN,
    UserRole.MEDICAL_DIRECTOR,
    UserRole.HEAD_OF_DEPT,
    UserRole.HEAD_OF_SECTION,
    UserRole.COMMITTEE_MEMBER,
  ];

  if (!approverRoles.includes(session.user.role)) {
    redirect(`/${locale}/dashboard`);
  }

  return session;
}

// ============================================================================
// Role Check Helpers
// ============================================================================

/**
 * Check if the current user has a specific role
 */
export async function hasRole(role: UserRole): Promise<boolean> {
  const session = await getSession();
  return session?.user.role === role;
}

/**
 * Check if the current user has minimum role level
 */
export async function hasMinRole(minimumRole: UserRole): Promise<boolean> {
  const session = await getSession();

  if (!session) return false;

  const userLevel = ROLE_HIERARCHY[session.user.role];
  const requiredLevel = ROLE_HIERARCHY[minimumRole];

  return userLevel >= requiredLevel;
}

/**
 * Check if the current user is an admin
 */
export async function isAdmin(): Promise<boolean> {
  return hasRole(UserRole.ADMIN);
}

/**
 * Check if the current user can approve requests
 */
export async function canApprove(): Promise<boolean> {
  const session = await getSession();

  if (!session) return false;

  const approverRoles: UserRole[] = [
    UserRole.ADMIN,
    UserRole.MEDICAL_DIRECTOR,
    UserRole.HEAD_OF_DEPT,
    UserRole.HEAD_OF_SECTION,
    UserRole.COMMITTEE_MEMBER,
  ];

  return approverRoles.includes(session.user.role);
}

// ============================================================================
// User Info Helpers
// ============================================================================

/**
 * Get the current user's ID
 */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.user.id || null;
}

/**
 * Get the current user's email
 */
export async function getCurrentUserEmail(): Promise<string | null> {
  const session = await getSession();
  return session?.user.email || null;
}

/**
 * Get the current user's role
 */
export async function getCurrentUserRole(): Promise<UserRole | null> {
  const session = await getSession();
  return session?.user.role || null;
}

/**
 * Get the current user's department ID
 */
export async function getCurrentUserDepartment(): Promise<number | null> {
  const session = await getSession();
  return session?.user.departmentId || null;
}

// ============================================================================
// Display Helpers
// ============================================================================

/**
 * Get role display name
 */
export function getRoleDisplayName(
  role: UserRole,
  locale: "en" | "ar" = "en"
): string {
  const roleNames: Record<UserRole, { en: string; ar: string }> = {
    [UserRole.ADMIN]: {
      en: "Administrator",
      ar: "مسؤول النظام",
    },
    [UserRole.MEDICAL_DIRECTOR]: {
      en: "Medical Director",
      ar: "المدير الطبي",
    },
    [UserRole.HEAD_OF_DEPT]: {
      en: "Head of Department",
      ar: "رئيس القسم",
    },
    [UserRole.HEAD_OF_SECTION]: {
      en: "Head of Section",
      ar: "رئيس الشعبة",
    },
    [UserRole.COMMITTEE_MEMBER]: {
      en: "Committee Member",
      ar: "عضو اللجنة",
    },
    [UserRole.EMPLOYEE]: {
      en: "Employee",
      ar: "موظف",
    },
  };

  return roleNames[role][locale];
}

/**
 * Get role badge color class
 */
export function getRoleBadgeColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    [UserRole.ADMIN]: "bg-purple-100 text-purple-800",
    [UserRole.MEDICAL_DIRECTOR]: "bg-blue-100 text-blue-800",
    [UserRole.HEAD_OF_DEPT]: "bg-teal-100 text-teal-800",
    [UserRole.HEAD_OF_SECTION]: "bg-green-100 text-green-800",
    [UserRole.COMMITTEE_MEMBER]: "bg-amber-100 text-amber-800",
    [UserRole.EMPLOYEE]: "bg-gray-100 text-gray-800",
  };

  return colors[role];
}
