/**
 * CBAHI Route Protection Middleware
 *
 * Protects authenticated routes and handles:
 * - Authentication checks
 * - Role-based access control
 * - Locale routing
 * - Redirect logic
 */

import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

import { UserRole } from "@prisma/client";

// Get the secret - explicitly read from process.env for Edge Runtime
const secret = process.env.NEXTAUTH_SECRET;

// ============================================================================
// Configuration
// ============================================================================

const LOCALES = ["en", "ar"] as const;
const DEFAULT_LOCALE = "en";

// Routes that require authentication
const PROTECTED_ROUTES = ["/", "/admin", "/requests", "/approvals", "/profile"];

// Routes that require admin role
const ADMIN_ROUTES = ["/admin"];

// Routes that require approver role
const APPROVER_ROUTES = ["/approvals"];

// Approver roles
const APPROVER_ROLES: UserRole[] = [
  "ADMIN",
  "MEDICAL_DIRECTOR",
  "HEAD_OF_DEPT",
  "HEAD_OF_SECTION",
  "COMMITTEE_MEMBER",
];

// Public routes (no auth required)
const PUBLIC_ROUTES = ["/login", "/login/verify", "/login/error", "/api/auth"];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract locale from pathname
 */
function getLocaleFromPath(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const firstSegment = segments[0];

  if (firstSegment && LOCALES.includes(firstSegment as (typeof LOCALES)[number])) {
    return firstSegment;
  }

  return DEFAULT_LOCALE;
}

/**
 * Remove locale prefix from pathname
 */
function removeLocaleFromPath(pathname: string): string {
  const locale = getLocaleFromPath(pathname);
  if (pathname.startsWith(`/${locale}`)) {
    return pathname.slice(locale.length + 1) || "/";
  }
  return pathname;
}

/**
 * Check if path matches any of the routes
 */
function matchesRoute(pathname: string, routes: string[]): boolean {
  const pathWithoutLocale = removeLocaleFromPath(pathname);
  return routes.some(
    (route) =>
      pathWithoutLocale === route || pathWithoutLocale.startsWith(`${route}/`)
  );
}

/**
 * Check if path is a public route
 */
function isPublicRoute(pathname: string): boolean {
  // API routes
  if (pathname.startsWith("/api/")) {
    return true;
  }

  // Static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".")
  ) {
    return true;
  }

  return matchesRoute(pathname, PUBLIC_ROUTES);
}

/**
 * Check if path requires authentication
 */
function requiresAuth(pathname: string): boolean {
  if (isPublicRoute(pathname)) {
    return false;
  }

  return matchesRoute(pathname, PROTECTED_ROUTES);
}

/**
 * Check if path requires admin role
 */
function requiresAdmin(pathname: string): boolean {
  return matchesRoute(pathname, ADMIN_ROUTES);
}

/**
 * Check if path requires approver role
 */
function requiresApprover(pathname: string): boolean {
  return matchesRoute(pathname, APPROVER_ROUTES);
}

/**
 * Build redirect URL with locale
 */
function buildRedirectUrl(
  request: NextRequest,
  path: string,
  locale: string
): URL {
  const url = new URL(request.url);
  url.pathname = `/${locale}${path}`;
  return url;
}

// ============================================================================
// Middleware
// ============================================================================

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and API routes (except auth)
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.startsWith("/favicon") ||
    (pathname.includes(".") && !pathname.includes("/api/"))
  ) {
    return NextResponse.next();
  }

  // Get locale from path or cookie
  const locale = getLocaleFromPath(pathname);
  const pathWithoutLocale = removeLocaleFromPath(pathname);

  // Add locale to path if missing (except for API routes)
  if (
    !pathname.startsWith("/api/") &&
    !LOCALES.includes(pathname.split("/")[1] as (typeof LOCALES)[number])
  ) {
    const url = new URL(request.url);
    url.pathname = `/${locale}${pathname}`;
    return NextResponse.redirect(url);
  }

  // Skip auth check for public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Get session token
  // Try both cookie names since Railway proxy might cause issues
  const secureCookieName = "__Secure-next-auth.session-token";
  const regularCookieName = "next-auth.session-token";

  // Check which cookie exists
  const hasSecureCookie = request.cookies.has(secureCookieName);
  const hasRegularCookie = request.cookies.has(regularCookieName);
  const cookieName = hasSecureCookie ? secureCookieName : regularCookieName;

  // Log cookie info for debugging
  console.log("[Middleware] Secure cookie exists:", hasSecureCookie);
  console.log("[Middleware] Regular cookie exists:", hasRegularCookie);
  console.log("[Middleware] Using cookie name:", cookieName);
  console.log("[Middleware] All cookies:", request.cookies.getAll().map(c => c.name));

  const token = await getToken({
    req: request,
    secret: secret,
    cookieName: cookieName,
  });

  console.log("[Middleware] Token decoded:", !!token);

  // Redirect to login if not authenticated and accessing protected route
  if (requiresAuth(pathname) && !token) {
    const loginUrl = buildRedirectUrl(request, "/login", locale);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check if user is active
  if (token && !token.isActive) {
    const errorUrl = buildRedirectUrl(request, "/login/error", locale);
    errorUrl.searchParams.set("error", "UserInactive");
    return NextResponse.redirect(errorUrl);
  }

  // Check admin role for admin routes
  if (requiresAdmin(pathname) && token) {
    if (token.role !== "ADMIN") {
      const homeUrl = buildRedirectUrl(request, "/", locale);
      return NextResponse.redirect(homeUrl);
    }
  }

  // Check approver role for approval routes
  if (requiresApprover(pathname) && token) {
    if (!APPROVER_ROLES.includes(token.role as UserRole)) {
      const homeUrl = buildRedirectUrl(request, "/", locale);
      return NextResponse.redirect(homeUrl);
    }
  }

  // Redirect authenticated users away from login page
  if (token && pathWithoutLocale.startsWith("/login")) {
    const homeUrl = buildRedirectUrl(request, "/", locale);
    return NextResponse.redirect(homeUrl);
  }

  // Add user info to headers for server components
  const response = NextResponse.next();

  if (token) {
    response.headers.set("x-user-id", token.id as string);
    response.headers.set("x-user-role", token.role as string);
    response.headers.set("x-user-locale", locale);
  }

  return response;
}

// ============================================================================
// Matcher Configuration
// ============================================================================

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
