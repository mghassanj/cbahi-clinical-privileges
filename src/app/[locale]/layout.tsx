import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { locales, type Locale, getDirection } from "@/i18n/config";
import { LocaleSync } from "@/components/providers/locale-sync";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;
  // Validate locale
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const messages = await getMessages({ locale });
  const direction = getDirection(locale as Locale);

  return (
    <div dir={direction} lang={locale} className="min-h-screen">
      <NextIntlClientProvider messages={messages} locale={locale}>
        <LocaleSync />
        {children}
      </NextIntlClientProvider>
    </div>
  );
}
