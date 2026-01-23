/**
 * CBAHI Auth Layout
 *
 * Layout wrapper for authentication pages (login, verify, error)
 * Provides minimal styling without navigation
 */

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In | CBAHI Clinical Privileges",
  description: "Sign in to CBAHI Clinical Privileges Management System",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
