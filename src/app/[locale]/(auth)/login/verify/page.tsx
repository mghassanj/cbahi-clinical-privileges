"use client";

/**
 * CBAHI Verify Email Page
 *
 * Displayed after magic link is sent with:
 * - Check email message
 * - Email display
 * - Resend option
 * - Bilingual support
 * - RTL support for Arabic
 */

import { signIn } from "next-auth/react";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useState, useTransition } from "react";

// ============================================================================
// Types
// ============================================================================

type Locale = "en" | "ar";

interface Translations {
  title: string;
  subtitle: string;
  sentTo: string;
  instructions: string;
  checkSpam: string;
  didntReceive: string;
  resendButton: string;
  resendingButton: string;
  resendSuccess: string;
  backToLogin: string;
  switchLanguage: string;
}

// ============================================================================
// Translations
// ============================================================================

const translations: Record<Locale, Translations> = {
  en: {
    title: "Check your email",
    subtitle: "We sent you a magic link",
    sentTo: "We sent an email to",
    instructions:
      "Click the link in the email to sign in. The link will expire in 24 hours.",
    checkSpam:
      "If you do not see the email in your inbox, please check your spam or junk folder.",
    didntReceive: "Didn't receive the email?",
    resendButton: "Resend email",
    resendingButton: "Sending...",
    resendSuccess: "Email sent! Please check your inbox.",
    backToLogin: "Back to login",
    switchLanguage: "العربية",
  },
  ar: {
    title: "تحقق من بريدك الإلكتروني",
    subtitle: "أرسلنا لك رابط الدخول",
    sentTo: "أرسلنا بريدًا إلكترونيًا إلى",
    instructions:
      "انقر على الرابط في البريد الإلكتروني لتسجيل الدخول. ستنتهي صلاحية الرابط خلال 24 ساعة.",
    checkSpam:
      "إذا لم تجد البريد الإلكتروني في صندوق الوارد، يرجى التحقق من مجلد البريد المزعج.",
    didntReceive: "لم تستلم البريد الإلكتروني؟",
    resendButton: "إعادة إرسال البريد",
    resendingButton: "جاري الإرسال...",
    resendSuccess: "تم الإرسال! يرجى التحقق من صندوق الوارد.",
    backToLogin: "العودة لتسجيل الدخول",
    switchLanguage: "English",
  },
};

// ============================================================================
// Components
// ============================================================================

function LanguageSwitcher({
  locale,
  email,
  t,
}: {
  locale: Locale;
  email: string;
  t: Translations;
}) {
  const targetLocale = locale === "en" ? "ar" : "en";

  return (
    <a
      href={`/${targetLocale}/login/verify?email=${encodeURIComponent(email)}`}
      className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
    >
      {t.switchLanguage}
    </a>
  );
}

function EmailIcon() {
  return (
    <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto">
      <svg
        className="w-10 h-10 text-teal-600"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    </div>
  );
}

function SuccessAlert({ message }: { message: string }) {
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <svg
          className="w-5 h-5 text-green-500 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
        <p className="text-sm text-green-700">{message}</p>
      </div>
    </div>
  );
}

// ============================================================================
// Loading Component
// ============================================================================

function VerifyLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-teal-600 border-t-transparent rounded-full" />
    </div>
  );
}

// ============================================================================
// Main Content Component
// ============================================================================

function VerifyPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();

  const locale = (params.locale as Locale) || "en";
  const isRTL = locale === "ar";
  const t = translations[locale];

  const email = searchParams.get("email") || "";
  const [resendSuccess, setResendSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Handle resend
  const handleResend = () => {
    if (!email) return;

    setResendSuccess(false);
    startTransition(async () => {
      try {
        await signIn("email", {
          email,
          redirect: false,
        });
        setResendSuccess(true);
      } catch {
        // Silently fail - user can try again
      }
    });
  };

  // Mask email for display
  const maskEmail = (email: string): string => {
    if (!email) return "";
    const [localPart, domain] = email.split("@");
    if (!localPart || !domain) return email;

    const visibleChars = Math.min(3, localPart.length);
    const masked =
      localPart.substring(0, visibleChars) +
      "*".repeat(Math.max(0, localPart.length - visibleChars));
    return `${masked}@${domain}`;
  };

  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col ${isRTL ? "rtl" : "ltr"}`}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Language Switcher */}
      <div className="absolute top-6 end-6">
        <LanguageSwitcher locale={locale} email={email} t={t} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 space-y-8">
            {/* Header */}
            <div className="text-center space-y-6">
              <EmailIcon />
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
                <p className="text-gray-500">{t.subtitle}</p>
              </div>
            </div>

            {/* Email Info */}
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">{t.sentTo}</p>
              <p className="font-medium text-gray-900">{maskEmail(email)}</p>
            </div>

            {/* Instructions */}
            <div className="space-y-4">
              <p className="text-sm text-gray-600 text-center">
                {t.instructions}
              </p>
              <p className="text-sm text-gray-500 text-center">{t.checkSpam}</p>
            </div>

            {/* Resend Section */}
            <div className="space-y-4 pt-4 border-t border-gray-200">
              {resendSuccess && <SuccessAlert message={t.resendSuccess} />}

              <div className="text-center">
                <p className="text-sm text-gray-600 mb-3">{t.didntReceive}</p>
                <button
                  onClick={handleResend}
                  disabled={isPending || !email}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors disabled:text-gray-400 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                >
                  {isPending ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      {t.resendingButton}
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      {t.resendButton}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Back to Login */}
            <div className="text-center">
              <a
                href={`/${locale}/login`}
                className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg
                  className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                {t.backToLogin}
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Branding */}
      <div className="text-center py-6 text-gray-400 text-sm">
        <p>CBAHI Clinical Privileges Management System</p>
        <p className="mt-1">
          نظام إدارة الامتيازات السريرية - المركز السعودي لاعتماد المنشآت الصحية
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Export with Suspense
// ============================================================================

export default function VerifyPage() {
  return (
    <Suspense fallback={<VerifyLoading />}>
      <VerifyPageContent />
    </Suspense>
  );
}
