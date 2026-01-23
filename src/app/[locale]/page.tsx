import { redirect } from "next/navigation";

export default function LocaleHomePage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  // Redirect to dashboard or login based on authentication status
  // For now, redirect to login
  redirect(`/${locale}/login`);
}
