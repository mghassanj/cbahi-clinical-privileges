import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { DashboardShell, type UserRole } from "@/components/dashboard/dashboard-shell";
import { authOptions } from "@/lib/auth";

// Supported locales
const locales = ["en", "ar"];

interface DashboardLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function DashboardLayout({
  children,
  params,
}: DashboardLayoutProps) {
  const { locale } = await params;
  // Validate locale
  if (!locales.includes(locale)) {
    notFound();
  }

  // Get actual session
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  // Map Prisma role to dashboard role type
  const mapRole = (role: string): UserRole => {
    if (role === "ADMIN") return "admin";
    if (["MEDICAL_DIRECTOR", "HEAD_OF_DEPT", "HEAD_OF_SECTION", "COMMITTEE_MEMBER"].includes(role)) {
      return "approver";
    }
    return "employee";
  };

  // Use actual session user data
  const user = {
    id: session.user.id,
    name: session.user.name || "",
    nameAr: session.user.nameAr || session.user.name || "",
    email: session.user.email,
    role: mapRole(session.user.role),
    department: session.user.departmentEn || undefined,
    avatar: session.user.photoUrl || undefined,
  };

  return <DashboardShell user={user}>{children}</DashboardShell>;
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}
