import type { Metadata } from "next";
import { Inter, Tajawal } from "next/font/google";
import { SessionProvider } from "@/components/providers/session-provider";
import { NotificationProvider } from "@/components/providers/NotificationProvider";
import { Toaster } from "sonner";
import "./globals.css";

// Inter font for English
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Tajawal font for Arabic
const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["200", "300", "400", "500", "700", "800", "900"],
  variable: "--font-tajawal",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "CBAHI Clinical Privileges Management System",
    template: "%s | CBAHI",
  },
  description:
    "Clinical Privileges Management System for the Central Board for Accreditation of Healthcare Institutions",
  keywords: [
    "CBAHI",
    "clinical privileges",
    "healthcare",
    "accreditation",
    "medical staff",
    "privileging",
  ],
  authors: [{ name: "CBAHI" }],
  creator: "CBAHI",
  publisher: "CBAHI",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ),
  openGraph: {
    type: "website",
    locale: "en_US",
    alternateLocale: "ar_SA",
    siteName: "CBAHI Clinical Privileges",
    title: "CBAHI Clinical Privileges Management System",
    description:
      "Clinical Privileges Management System for the Central Board for Accreditation of Healthcare Institutions",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${tajawal.variable} font-sans antialiased min-h-screen`}
      >
        <SessionProvider>
          <NotificationProvider>{children}</NotificationProvider>
        </SessionProvider>
        <Toaster
          position="top-center"
          richColors
          closeButton
          toastOptions={{
            duration: 4000,
          }}
        />
      </body>
    </html>
  );
}
