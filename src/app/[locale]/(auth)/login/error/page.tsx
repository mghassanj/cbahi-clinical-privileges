"use client";

/**
 * CBAHI Login Error Page
 *
 * Displays authentication errors with:
 * - Error-specific messages
 * - Support contact info
 * - Bilingual support
 * - RTL support for Arabic
 */

import { useParams, useSearchParams } from "next/navigation";

// ============================================================================
// Types
// ============================================================================

type Locale = "en" | "ar";

type ErrorCode =
  | "UserNotFound"
  | "UserInactive"
  | "Verification"
  | "Configuration"
  | "AccessDenied"
  | "Default";

interface ErrorInfo {
  title: string;
  message: string;
  suggestion: string;
}

interface Translations {
  pageTitle: string;
  errors: Record<ErrorCode, ErrorInfo>;
  supportTitle: string;
  supportMessage: string;
  supportEmail: string;
  backToLogin: string;
  switchLanguage: string;
}

// ============================================================================
// Translations
// ============================================================================

const translations: Record<Locale, Translations> = {
  en: {
    pageTitle: "Sign In Error",
    errors: {
      UserNotFound: {
        title: "Account Not Found",
        message:
          "The email address you entered is not registered in our system. Only employees synced from the HR system can access this application.",
        suggestion:
          "If you believe this is an error, please contact your HR department or system administrator.",
      },
      UserInactive: {
        title: "Account Inactive",
        message:
          "Your account has been deactivated or suspended. You cannot sign in until your account is reactivated.",
        suggestion:
          "Please contact your HR department or system administrator to resolve this issue.",
      },
      Verification: {
        title: "Verification Failed",
        message:
          "The magic link you used has expired or is invalid. Magic links are only valid for 24 hours.",
        suggestion: "Please request a new magic link from the login page.",
      },
      Configuration: {
        title: "Configuration Error",
        message:
          "There is a problem with the authentication system configuration.",
        suggestion:
          "Please contact the system administrator to resolve this issue.",
      },
      AccessDenied: {
        title: "Access Denied",
        message:
          "You do not have permission to access this resource or perform this action.",
        suggestion:
          "If you need access, please contact your supervisor or system administrator.",
      },
      Default: {
        title: "Something Went Wrong",
        message:
          "An unexpected error occurred during the sign-in process. Please try again.",
        suggestion:
          "If the problem persists, please contact the system administrator.",
      },
    },
    supportTitle: "Need Help?",
    supportMessage: "Contact IT Support:",
    supportEmail: "support@cbahi.gov.sa",
    backToLogin: "Back to Login",
    switchLanguage: "العربية",
  },
  ar: {
    pageTitle: "خطأ في تسجيل الدخول",
    errors: {
      UserNotFound: {
        title: "الحساب غير موجود",
        message:
          "البريد الإلكتروني الذي أدخلته غير مسجل في نظامنا. يمكن فقط للموظفين المسجلين في نظام الموارد البشرية الوصول إلى هذا التطبيق.",
        suggestion:
          "إذا كنت تعتقد أن هذا خطأ، يرجى الاتصال بقسم الموارد البشرية أو مسؤول النظام.",
      },
      UserInactive: {
        title: "الحساب غير نشط",
        message:
          "تم إلغاء تنشيط حسابك أو تعليقه. لا يمكنك تسجيل الدخول حتى يتم إعادة تنشيط حسابك.",
        suggestion:
          "يرجى الاتصال بقسم الموارد البشرية أو مسؤول النظام لحل هذه المشكلة.",
      },
      Verification: {
        title: "فشل التحقق",
        message:
          "انتهت صلاحية رابط الدخول الذي استخدمته أو أنه غير صالح. روابط الدخول صالحة لمدة 24 ساعة فقط.",
        suggestion: "يرجى طلب رابط دخول جديد من صفحة تسجيل الدخول.",
      },
      Configuration: {
        title: "خطأ في الإعدادات",
        message: "هناك مشكلة في إعدادات نظام المصادقة.",
        suggestion: "يرجى الاتصال بمسؤول النظام لحل هذه المشكلة.",
      },
      AccessDenied: {
        title: "تم رفض الوصول",
        message: "ليس لديك إذن للوصول إلى هذا المورد أو تنفيذ هذا الإجراء.",
        suggestion:
          "إذا كنت بحاجة إلى الوصول، يرجى الاتصال بمديرك أو مسؤول النظام.",
      },
      Default: {
        title: "حدث خطأ ما",
        message:
          "حدث خطأ غير متوقع أثناء عملية تسجيل الدخول. يرجى المحاولة مرة أخرى.",
        suggestion: "إذا استمرت المشكلة، يرجى الاتصال بمسؤول النظام.",
      },
    },
    supportTitle: "تحتاج مساعدة؟",
    supportMessage: "اتصل بالدعم الفني:",
    supportEmail: "support@cbahi.gov.sa",
    backToLogin: "العودة لتسجيل الدخول",
    switchLanguage: "English",
  },
};

// ============================================================================
// Components
// ============================================================================

function LanguageSwitcher({
  locale,
  error,
  t,
}: {
  locale: Locale;
  error: string;
  t: Translations;
}) {
  const targetLocale = locale === "en" ? "ar" : "en";

  return (
    <a
      href={`/${targetLocale}/login/error?error=${encodeURIComponent(error)}`}
      className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
    >
      {t.switchLanguage}
    </a>
  );
}

function ErrorIcon() {
  return (
    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
      <svg
        className="w-10 h-10 text-red-600"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function ErrorPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const locale = (params.locale as Locale) || "en";
  const isRTL = locale === "ar";
  const t = translations[locale];

  // Get error code from URL
  const errorParam = searchParams.get("error") || "Default";

  // Map NextAuth error codes to our error codes
  const mapErrorCode = (error: string): ErrorCode => {
    switch (error) {
      case "UserNotFound":
        return "UserNotFound";
      case "UserInactive":
        return "UserInactive";
      case "Verification":
        return "Verification";
      case "Configuration":
        return "Configuration";
      case "AccessDenied":
        return "AccessDenied";
      default:
        return "Default";
    }
  };

  const errorCode = mapErrorCode(errorParam);
  const errorInfo = t.errors[errorCode];

  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col ${isRTL ? "rtl" : "ltr"}`}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Language Switcher */}
      <div className="absolute top-6 end-6">
        <LanguageSwitcher locale={locale} error={errorParam} t={t} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 space-y-8">
            {/* Header */}
            <div className="text-center space-y-6">
              <ErrorIcon />
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-gray-900">
                  {errorInfo.title}
                </h1>
                <p className="text-gray-500">{t.pageTitle}</p>
              </div>
            </div>

            {/* Error Message */}
            <div className="bg-red-50 border border-red-100 rounded-lg p-4 space-y-3">
              <p className="text-sm text-red-800">{errorInfo.message}</p>
              <p className="text-sm text-red-600">{errorInfo.suggestion}</p>
            </div>

            {/* Support Section */}
            <div className="bg-gray-50 rounded-lg p-4 text-center space-y-2">
              <p className="font-medium text-gray-900">{t.supportTitle}</p>
              <p className="text-sm text-gray-600">{t.supportMessage}</p>
              <a
                href={`mailto:${t.supportEmail}`}
                className="text-sm text-teal-600 hover:text-teal-700 font-medium"
              >
                {t.supportEmail}
              </a>
            </div>

            {/* Back to Login */}
            <div className="text-center">
              <a
                href={`/${locale}/login`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg transition-colors"
              >
                <svg
                  className={`w-5 h-5 ${isRTL ? "rotate-180" : ""}`}
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
