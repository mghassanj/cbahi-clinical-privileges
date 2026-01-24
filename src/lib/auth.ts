/**
 * CBAHI NextAuth Configuration
 *
 * Implements magic link (passwordless) authentication with email provider.
 * Only allows login for users synced from Jisr HR system.
 */

import { PrismaAdapter } from "@auth/prisma-adapter";
import { UserRole, UserStatus } from "@prisma/client";
import type { NextAuthOptions } from "next-auth";
import type { Adapter, AdapterUser } from "next-auth/adapters";
import CredentialsProvider from "next-auth/providers/credentials";
import EmailProvider, { type SendVerificationRequestParams } from "next-auth/providers/email";
import nodemailer from "nodemailer";

import { prisma } from "@/lib/db";

// Check if testing mode is enabled
const TESTING_MODE = process.env.TESTING_MODE === "true";

// ============================================================================
// Custom Email Sending Function
// ============================================================================

/**
 * Custom verification request handler using our email system
 * Sends magic link emails with bilingual support
 */
async function customSendVerificationRequest({
  identifier: email,
  url,
  provider,
}: SendVerificationRequestParams) {
  // Get system settings for email configuration
  const settings = await prisma.systemSettings.findUnique({
    where: { id: "default" },
  });

  // Parse SMTP settings from provider server string or system settings
  let transportConfig: nodemailer.TransportOptions;

  if (settings?.smtpHost && settings?.smtpUser && settings?.smtpPassword) {
    transportConfig = {
      host: settings.smtpHost,
      port: settings.smtpPort || 587,
      secure: settings.smtpPort === 465,
      auth: {
        user: settings.smtpUser,
        pass: settings.smtpPassword,
      },
    } as nodemailer.TransportOptions;
  } else if (provider.server) {
    // Fallback to provider server string
    transportConfig = provider.server as nodemailer.TransportOptions;
  } else {
    throw new Error("Email configuration not found");
  }

  const transport = nodemailer.createTransport(transportConfig);

  // Get user info for personalization (may not exist for first-time verification)
  const user = await prisma.user.findUnique({
    where: { email },
    select: { nameEn: true, nameAr: true },
  });

  const fromEmail = settings?.fromEmail || provider.from;
  const fromName = settings?.fromName || "CBAHI";

  // Bilingual email content
  const result = await transport.sendMail({
    to: email,
    from: `"${fromName}" <${fromEmail}>`,
    subject: `Sign in to CBAHI | تسجيل الدخول إلى المركز السعودي لاعتماد المنشآت الصحية`,
    text: generateTextEmail(url, user?.nameEn, user?.nameAr),
    html: generateHtmlEmail(url, user?.nameEn, user?.nameAr),
  });

  const failed = result.rejected.concat(result.pending).filter(Boolean);
  if (failed.length) {
    throw new Error(`Email could not be sent to ${failed.join(", ")}`);
  }
}

/**
 * Generate plain text email content (bilingual)
 */
function generateTextEmail(
  url: string,
  nameEn?: string | null,
  nameAr?: string | null
): string {
  const greeting = nameEn ? `Hello ${nameEn},` : "Hello,";
  const greetingAr = nameAr ? `مرحباً ${nameAr}،` : "مرحباً،";

  return `
${greeting}
${greetingAr}

Click the link below to sign in to CBAHI Clinical Privileges Management System:
انقر على الرابط أدناه لتسجيل الدخول إلى نظام إدارة الامتيازات السريرية:

${url}

This link will expire in 24 hours.
ستنتهي صلاحية هذا الرابط خلال 24 ساعة.

If you did not request this email, you can safely ignore it.
إذا لم تطلب هذا البريد الإلكتروني، يمكنك تجاهله بأمان.

---
CBAHI Clinical Privileges Management System
نظام إدارة الامتيازات السريرية - المركز السعودي لاعتماد المنشآت الصحية
`.trim();
}

/**
 * Generate HTML email content (bilingual with RTL support)
 */
function generateHtmlEmail(
  url: string,
  nameEn?: string | null,
  nameAr?: string | null
): string {
  const greeting = nameEn ? `Hello ${nameEn},` : "Hello,";
  const greetingAr = nameAr ? `مرحباً ${nameAr}،` : "مرحباً،";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign in to CBAHI</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <tr>
      <td style="background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

        <!-- Logo/Header -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td style="text-align: center; padding-bottom: 30px; border-bottom: 1px solid #e4e4e7;">
              <h1 style="margin: 0; color: #0f766e; font-size: 24px; font-weight: 600;">CBAHI</h1>
              <p style="margin: 5px 0 0 0; color: #71717a; font-size: 14px;">Clinical Privileges Management System</p>
            </td>
          </tr>
        </table>

        <!-- English Content -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 30px;">
          <tr>
            <td style="text-align: left;">
              <p style="margin: 0 0 20px 0; color: #3f3f46; font-size: 16px;">${greeting}</p>
              <p style="margin: 0 0 30px 0; color: #52525b; font-size: 14px; line-height: 1.6;">
                Click the button below to sign in to the CBAHI Clinical Privileges Management System.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="background-color: #0f766e; border-radius: 6px;">
                    <a href="${url}" target="_blank" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600;">
                      Sign In
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 30px 0 0 0; color: #71717a; font-size: 12px;">
                This link will expire in 24 hours. If you did not request this email, you can safely ignore it.
              </p>
            </td>
          </tr>
        </table>

        <!-- Divider -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 30px 0;">
          <tr>
            <td style="border-top: 1px solid #e4e4e7;"></td>
          </tr>
        </table>

        <!-- Arabic Content (RTL) -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" dir="rtl">
          <tr>
            <td style="text-align: right;">
              <p style="margin: 0 0 20px 0; color: #3f3f46; font-size: 16px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">${greetingAr}</p>
              <p style="margin: 0 0 30px 0; color: #52525b; font-size: 14px; line-height: 1.8; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">
                انقر على الزر أدناه لتسجيل الدخول إلى نظام إدارة الامتيازات السريرية.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="background-color: #0f766e; border-radius: 6px;">
                    <a href="${url}" target="_blank" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">
                      تسجيل الدخول
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 30px 0 0 0; color: #71717a; font-size: 12px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">
                ستنتهي صلاحية هذا الرابط خلال 24 ساعة. إذا لم تطلب هذا البريد الإلكتروني، يمكنك تجاهله بأمان.
              </p>
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e4e4e7;">
          <tr>
            <td style="text-align: center;">
              <p style="margin: 0; color: #a1a1aa; font-size: 12px;">
                CBAHI Clinical Privileges Management System<br>
                نظام إدارة الامتيازات السريرية - المركز السعودي لاعتماد المنشآت الصحية
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}

// ============================================================================
// Custom Prisma Adapter
// ============================================================================

/**
 * Custom adapter that links AuthUser to our User model
 */
function CustomPrismaAdapter(): Adapter {
  const baseAdapter = PrismaAdapter(prisma) as Adapter;

  return {
    ...baseAdapter,

    // Override createUser to link with existing User from Jisr
    async createUser(data: Omit<AdapterUser, "id">): Promise<AdapterUser> {
      // Find the User record synced from Jisr
      const jisrUser = await prisma.user.findUnique({
        where: { email: data.email! },
      });

      // Create AuthUser and link to Jisr User if exists
      const authUser = await prisma.authUser.create({
        data: {
          email: data.email,
          name: jisrUser?.nameEn || data.name,
          emailVerified: data.emailVerified,
          image: data.image,
          userId: jisrUser?.id || null,
        },
      });

      // Return in format NextAuth expects (with extended fields)
      return {
        id: authUser.id,
        email: authUser.email!,
        emailVerified: authUser.emailVerified,
        name: authUser.name || jisrUser?.nameEn || "",
        nameAr: jisrUser?.nameAr,
        image: authUser.image || "",
        role: jisrUser?.role || UserRole.EMPLOYEE,
        status: jisrUser?.status || UserStatus.ACTIVE,
        jisrEmployeeId: jisrUser?.jisrEmployeeId || 0,
        isActive: jisrUser?.isActive ?? true,
        departmentId: jisrUser?.departmentId,
        departmentEn: jisrUser?.departmentEn,
        departmentAr: jisrUser?.departmentAr,
        jobTitleEn: jisrUser?.jobTitleEn,
        jobTitleAr: jisrUser?.jobTitleAr,
      };
    },

    // Override getUser to include linked User data
    async getUser(id: string): Promise<AdapterUser | null> {
      const authUser = await prisma.authUser.findUnique({
        where: { id },
        include: { user: true },
      });

      if (!authUser) return null;

      const user = authUser.user;
      return {
        id: authUser.id,
        email: authUser.email!,
        emailVerified: authUser.emailVerified,
        name: authUser.name || user?.nameEn || "",
        nameAr: user?.nameAr,
        image: authUser.image || "",
        role: user?.role || UserRole.EMPLOYEE,
        status: user?.status || UserStatus.ACTIVE,
        jisrEmployeeId: user?.jisrEmployeeId || 0,
        isActive: user?.isActive ?? true,
        departmentId: user?.departmentId,
        departmentEn: user?.departmentEn,
        departmentAr: user?.departmentAr,
        jobTitleEn: user?.jobTitleEn,
        jobTitleAr: user?.jobTitleAr,
      };
    },

    // Override getUserByEmail to include linked User data
    async getUserByEmail(email: string): Promise<AdapterUser | null> {
      const authUser = await prisma.authUser.findUnique({
        where: { email },
        include: { user: true },
      });

      if (!authUser) return null;

      const user = authUser.user;
      return {
        id: authUser.id,
        email: authUser.email!,
        emailVerified: authUser.emailVerified,
        name: authUser.name || user?.nameEn || "",
        nameAr: user?.nameAr,
        image: authUser.image || "",
        role: user?.role || UserRole.EMPLOYEE,
        status: user?.status || UserStatus.ACTIVE,
        jisrEmployeeId: user?.jisrEmployeeId || 0,
        isActive: user?.isActive ?? true,
        departmentId: user?.departmentId,
        departmentEn: user?.departmentEn,
        departmentAr: user?.departmentAr,
        jobTitleEn: user?.jobTitleEn,
        jobTitleAr: user?.jobTitleAr,
      };
    },
  };
}

// ============================================================================
// NextAuth Configuration
// ============================================================================

// Build providers list based on mode
const providers: NextAuthOptions["providers"] = [];

// In testing mode, use Credentials provider (no adapter needed)
// In production mode, use Email provider with adapter
if (TESTING_MODE) {
  // Add Credentials provider for testing mode (no adapter needed)
  providers.push(
    CredentialsProvider({
      id: "test-login",
      name: "Test Login",
      credentials: {
        email: { label: "Email", type: "email" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;

        // Find user in database
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.isActive) return null;

        // Return user object for session
        return {
          id: user.id,
          email: user.email,
          name: user.nameEn,
          nameAr: user.nameAr,
          photoUrl: user.photoUrl,
          role: user.role,
          status: user.status,
          departmentId: user.departmentId,
          departmentEn: user.departmentEn,
          departmentAr: user.departmentAr,
          jobTitleEn: user.jobTitleEn,
          jobTitleAr: user.jobTitleAr,
          jisrEmployeeId: user.jisrEmployeeId,
          isActive: user.isActive,
        };
      },
    })
  );
} else {
  // Add Email provider for production (requires adapter)
  providers.push(
    EmailProvider({
      server: process.env.EMAIL_SERVER || "",
      from: process.env.EMAIL_FROM || "noreply@cbahi.gov.sa",
      maxAge: 24 * 60 * 60, // 24 hours
      sendVerificationRequest: customSendVerificationRequest,
    })
  );
}

export const authOptions: NextAuthOptions = {
  // Only use adapter for non-credentials auth
  adapter: TESTING_MODE ? undefined : CustomPrismaAdapter(),

  providers,

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  pages: {
    signIn: "/login",
    verifyRequest: "/login/verify",
    error: "/login/error",
  },

  callbacks: {
    /**
     * Sign in callback - validates user exists in Jisr-synced Users table
     * and is active
     */
    async signIn({ user, account }) {
      // Skip validation for test credentials provider
      if (TESTING_MODE && account?.provider === "test-login") {
        return true;
      }

      if (!user.email) {
        return false;
      }

      // Check if email exists in Users table (synced from Jisr) and is active
      const jisrUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: {
          id: true,
          isActive: true,
          status: true,
        },
      });

      // Deny access if user doesn't exist in Jisr
      if (!jisrUser) {
        return "/login/error?error=UserNotFound";
      }

      // Deny access if user is not active
      if (!jisrUser.isActive || jisrUser.status !== UserStatus.ACTIVE) {
        return "/login/error?error=UserInactive";
      }

      return true;
    },

    /**
     * JWT callback - adds user data to token
     */
    async jwt({ token, user, trigger }) {
      // On initial sign in or token refresh
      if (user?.email || trigger === "update") {
        const email = user?.email || token.email;

        // Fetch full user data from Jisr-synced Users table
        const jisrUser = await prisma.user.findUnique({
          where: { email: email as string },
          select: {
            id: true,
            email: true,
            nameEn: true,
            nameAr: true,
            photoUrl: true,
            role: true,
            status: true,
            departmentId: true,
            departmentEn: true,
            departmentAr: true,
            jobTitleEn: true,
            jobTitleAr: true,
            jisrEmployeeId: true,
            isActive: true,
          },
        });

        if (jisrUser) {
          token.id = jisrUser.id;
          token.email = jisrUser.email;
          token.name = jisrUser.nameEn;
          token.nameAr = jisrUser.nameAr;
          token.photoUrl = jisrUser.photoUrl;
          token.role = jisrUser.role;
          token.status = jisrUser.status;
          token.departmentId = jisrUser.departmentId;
          token.departmentEn = jisrUser.departmentEn;
          token.departmentAr = jisrUser.departmentAr;
          token.jobTitleEn = jisrUser.jobTitleEn;
          token.jobTitleAr = jisrUser.jobTitleAr;
          token.jisrEmployeeId = jisrUser.jisrEmployeeId;
          token.isActive = jisrUser.isActive;
        }
      }

      return token;
    },

    /**
     * Session callback - exposes user data to client
     */
    async session({ session, token }) {
      if (token) {
        session.user = {
          id: token.id as string,
          email: token.email as string,
          name: token.name as string,
          nameAr: token.nameAr as string | null,
          photoUrl: token.photoUrl as string | null,
          role: token.role as UserRole,
          status: token.status as UserStatus,
          departmentId: token.departmentId as number | null,
          departmentEn: token.departmentEn as string | null,
          departmentAr: token.departmentAr as string | null,
          jobTitleEn: token.jobTitleEn as string | null,
          jobTitleAr: token.jobTitleAr as string | null,
          jisrEmployeeId: token.jisrEmployeeId as number,
          isActive: token.isActive as boolean,
        };
      }

      return session;
    },
  },

  events: {
    /**
     * Log sign in events for audit trail
     */
    async signIn({ user }) {
      if (user.email) {
        const jisrUser = await prisma.user.findUnique({
          where: { email: user.email },
          select: { id: true },
        });

        if (jisrUser) {
          await prisma.auditLog.create({
            data: {
              userId: jisrUser.id,
              action: "LOGIN",
              entityType: "users",
              entityId: jisrUser.id,
              newValues: { email: user.email },
            },
          });
        }
      }
    },

    /**
     * Log sign out events for audit trail
     */
    async signOut(message) {
      if ("token" in message && message.token?.email) {
        const jisrUser = await prisma.user.findUnique({
          where: { email: message.token.email as string },
          select: { id: true },
        });

        if (jisrUser) {
          await prisma.auditLog.create({
            data: {
              userId: jisrUser.id,
              action: "LOGOUT",
              entityType: "users",
              entityId: jisrUser.id,
            },
          });
        }
      }
    },
  },

  debug: process.env.NODE_ENV === "development",
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a user has one of the specified roles
 */
export function hasRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole);
}

/**
 * Check if user is an admin
 */
export function isAdmin(userRole: UserRole): boolean {
  return userRole === UserRole.ADMIN;
}

/**
 * Check if user can approve requests (has approver role)
 */
export function canApprove(userRole: UserRole): boolean {
  const approverRoles: UserRole[] = [
    UserRole.ADMIN,
    UserRole.MEDICAL_DIRECTOR,
    UserRole.HEAD_OF_DEPT,
    UserRole.HEAD_OF_SECTION,
    UserRole.COMMITTEE_MEMBER,
  ];
  return approverRoles.includes(userRole);
}

/**
 * Role hierarchy for access control
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.ADMIN]: 100,
  [UserRole.MEDICAL_DIRECTOR]: 90,
  [UserRole.HEAD_OF_DEPT]: 70,
  [UserRole.HEAD_OF_SECTION]: 60,
  [UserRole.COMMITTEE_MEMBER]: 50,
  [UserRole.EMPLOYEE]: 10,
};

/**
 * Check if user has sufficient role level
 */
export function hasMinimumRole(
  userRole: UserRole,
  minimumRole: UserRole
): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minimumRole];
}
