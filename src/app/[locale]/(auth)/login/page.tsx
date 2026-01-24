"use client";

/**
 * CBAHI Login Page
 *
 * Magic link (passwordless) authentication page with:
 * - Email input
 * - Loading states
 * - Error handling
 * - Bilingual support (English/Arabic)
 * - RTL support for Arabic
 */

import { signIn } from "next-auth/react";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, useTransition } from "react";

// ============================================================================
// Types
// ============================================================================

type Locale = "en" | "ar";

interface Translations {
  title: string;
  subtitle: string;
  emailLabel: string;
  emailPlaceholder: string;
  submitButton: string;
  loadingButton: string;
  errorInvalidEmail: string;
  errorGeneric: string;
  errorUserNotFound: string;
  errorUserInactive: string;
  switchLanguage: string;
  footerText: string;
}

// ============================================================================
// Translations
// ============================================================================

const translations: Record<Locale, Translations> = {
  en: {
    title: "Sign in to CBAHI",
    subtitle: "Clinical Privileges Management System",
    emailLabel: "Email Address",
    emailPlaceholder: "Enter your work email",
    submitButton: "Send Magic Link",
    loadingButton: "Sending...",
    errorInvalidEmail: "Please enter a valid email address",
    errorGeneric: "An error occurred. Please try again.",
    errorUserNotFound:
      "This email is not registered in our system. Please contact your administrator.",
    errorUserInactive:
      "Your account is inactive. Please contact your administrator.",
    switchLanguage: "العربية",
    footerText:
      "By signing in, you agree to our terms of service and privacy policy.",
  },
  ar: {
    title: "تسجيل الدخول إلى المركز السعودي",
    subtitle: "نظام إدارة الامتيازات السريرية",
    emailLabel: "البريد الإلكتروني",
    emailPlaceholder: "أدخل بريدك الإلكتروني",
    submitButton: "إرسال رابط الدخول",
    loadingButton: "جاري الإرسال...",
    errorInvalidEmail: "يرجى إدخال بريد إلكتروني صحيح",
    errorGeneric: "حدث خطأ. يرجى المحاولة مرة أخرى.",
    errorUserNotFound:
      "هذا البريد الإلكتروني غير مسجل في نظامنا. يرجى الاتصال بالمسؤول.",
    errorUserInactive: "حسابك غير نشط. يرجى الاتصال بالمسؤول.",
    switchLanguage: "English",
    footerText:
      "بتسجيل الدخول، فإنك توافق على شروط الخدمة وسياسة الخصوصية الخاصة بنا.",
  },
};

// ============================================================================
// Components
// ============================================================================

function LanguageSwitcher({
  locale,
  t,
}: {
  locale: Locale;
  t: Translations;
}) {
  const targetLocale = locale === "en" ? "ar" : "en";

  return (
    <a
      href={`/${targetLocale}/login`}
      className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
    >
      {t.switchLanguage}
    </a>
  );
}

function Logo() {
  return (
    <div className="flex flex-col items-center">
      <div className="w-16 h-16 bg-teal-600 rounded-xl flex items-center justify-center shadow-lg">
        <span className="text-2xl font-bold text-white">C</span>
      </div>
    </div>
  );
}

function ErrorAlert({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <div className="flex items-center gap-3">
        <svg
          className="w-5 h-5 text-red-500 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-sm text-red-700">{message}</p>
      </div>
    </div>
  );
}

// ============================================================================
// Loading Component
// ============================================================================

function LoginLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-teal-600 border-t-transparent rounded-full" />
    </div>
  );
}

// ============================================================================
// Main Content Component
// ============================================================================

function LoginPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();

  const locale = (params.locale as Locale) || "en";
  const isRTL = locale === "ar";
  const t = translations[locale];

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [testingMode, setTestingMode] = useState(false);

  // Fetch testing mode from API (since NEXT_PUBLIC_ vars are only available at build time)
  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => setTestingMode(data.testingMode))
      .catch(() => setTestingMode(false));
  }, []);

  // Check for error from URL params
  const urlError = searchParams.get("error");
  const errorMessage = urlError
    ? urlError === "UserNotFound"
      ? t.errorUserNotFound
      : urlError === "UserInactive"
        ? t.errorUserInactive
        : t.errorGeneric
    : null;

  // Email validation
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate email
    if (!isValidEmail(email)) {
      setError(t.errorInvalidEmail);
      return;
    }

    startTransition(async () => {
      try {
        const callbackUrl = searchParams.get("callbackUrl") || `/${locale}`;

        const result = await signIn("email", {
          email,
          callbackUrl,
          redirect: false,
        });

        if (result?.error) {
          if (result.error === "UserNotFound") {
            setError(t.errorUserNotFound);
          } else if (result.error === "UserInactive") {
            setError(t.errorUserInactive);
          } else {
            setError(t.errorGeneric);
          }
        } else if (result?.ok) {
          // Redirect to verify page
          window.location.href = `/${locale}/login/verify?email=${encodeURIComponent(email)}`;
        }
      } catch {
        setError(t.errorGeneric);
      }
    });
  };

  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col ${isRTL ? "rtl" : "ltr"}`}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Language Switcher */}
      <div className="absolute top-6 end-6">
        <LanguageSwitcher locale={locale} t={t} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
              <Logo />
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
                <p className="text-gray-500">{t.subtitle}</p>
              </div>
            </div>

            {/* Error Display */}
            {(error || errorMessage) && (
              <ErrorAlert message={error || errorMessage!} />
            )}

            {/* Email Input - shared by both forms */}
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                {t.emailLabel}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.emailPlaceholder}
                disabled={isPending}
                autoComplete="email"
                autoFocus
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-900 placeholder-gray-400"
              />
            </div>

            {/* Testing Mode: Show test login button */}
            {testingMode ? (
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-700 font-medium">
                    Testing Mode Enabled
                  </p>
                  <p className="text-xs text-yellow-600 mt-1">
                    Click below to login directly without email verification
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (!email || !isValidEmail(email)) {
                      setError(t.errorInvalidEmail);
                      return;
                    }
                    setError(null);
                    startTransition(async () => {
                      try {
                        const callbackUrl = searchParams.get("callbackUrl") || `/${locale}`;
                        const result = await signIn("test-login", {
                          email,
                          callbackUrl,
                          redirect: false,
                        });
                        if (result?.error) {
                          if (result.error === "CredentialsSignin") {
                            setError(t.errorUserNotFound);
                          } else {
                            setError(t.errorGeneric);
                          }
                        } else if (result?.ok) {
                          window.location.href = callbackUrl;
                        }
                      } catch {
                        setError(t.errorGeneric);
                      }
                    });
                  }}
                  disabled={isPending || !email}
                  className="w-full py-3 px-4 bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-lg transition-colors disabled:bg-yellow-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isPending ? t.loadingButton : "Test Login (Bypass Email)"}
                </button>
              </div>
            ) : (
              /* Production Mode: Show magic link form */
              <form onSubmit={handleSubmit} className="space-y-6">
                <button
                  type="submit"
                  disabled={isPending || !email}
                  className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg transition-colors disabled:bg-teal-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                {isPending ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5"
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
                    {t.loadingButton}
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5"
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
                    {t.submitButton}
                  </>
                )}
              </button>
              </form>
            )}

            {/* Footer */}
            <p className="text-center text-xs text-gray-500">{t.footerText}</p>
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

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginPageContent />
    </Suspense>
  );
}
