import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

// Supported locales
const locales = ["en", "ar"];

interface DashboardLayoutProps {
  children: React.ReactNode;
  params: { locale: string };
}

export default async function DashboardLayout({
  children,
  params: { locale },
}: DashboardLayoutProps) {
  // Validate locale
  if (!locales.includes(locale)) {
    notFound();
  }

  // Fetch messages for the current locale
  const messages = await getMessages();

  // TODO: Add authentication check here
  // const session = await getServerSession(authOptions);
  // if (!session) {
  //   redirect(`/${locale}/login`);
  // }

  // Mock user data - replace with actual session user
  const user = {
    id: "1",
    name: "Dr. Ahmed Al-Rashid",
    nameAr: "د. أحمد الراشد",
    email: "ahmed.rashid@hospital.com",
    role: "admin" as const,
    department: "Dental",
    avatar: undefined,
  };

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <DashboardShell user={user}>{children}</DashboardShell>
    </NextIntlClientProvider>
  );
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}
