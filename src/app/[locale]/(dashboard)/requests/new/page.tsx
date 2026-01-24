"use client";

import * as React from "react";
import { Suspense } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PrivilegeRequestWizard } from "@/components/forms/PrivilegeRequestWizard";
import {
  LiquidGlassCard,
  LiquidGlassCardContent,
} from "@/components/custom/liquid-glass-card";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UserData {
  nameEn: string;
  nameAr: string;
  employeeCode: string;
  department: string;
  departmentAr: string;
  jobTitle: string;
  jobTitleAr: string;
  location: string;
  locationAr: string;
  email: string;
}

function NewRequestLoading() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
    </div>
  );
}

function NewRequestPageContent() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const isRTL = locale === "ar";

  const draftId = searchParams.get("draft") || undefined;

  const [isLoading, setIsLoading] = React.useState(true);
  const [userData, setUserData] = React.useState<UserData | null>(null);
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [submittedRequestId, setSubmittedRequestId] = React.useState<string | null>(
    null
  );

  // Fetch user profile data
  React.useEffect(() => {
    const fetchUserData = async () => {
      if (!session?.user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/users/${session.user.id}`);
        const result = await response.json();

        if (response.ok && result.data) {
          const user = result.data;
          setUserData({
            nameEn: user.nameEn || session.user.name || "",
            nameAr: user.nameAr || user.nameEn || session.user.name || "",
            employeeCode: user.employeeCode || "",
            department: user.departmentEn || "",
            departmentAr: user.departmentAr || user.departmentEn || "",
            jobTitle: user.jobTitleEn || "",
            jobTitleAr: user.jobTitleAr || user.jobTitleEn || "",
            location: user.locationEn || "",
            locationAr: user.locationAr || user.locationEn || "",
            email: user.email || session.user.email || "",
          });
        }
      } catch (error) {
        console.error("Failed to fetch user data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (status !== "loading") {
      fetchUserData();
    }
  }, [session?.user?.id, session?.user?.name, session?.user?.email, status]);

  const handleSubmitSuccess = (requestId: string) => {
    setSubmittedRequestId(requestId);
    setIsSubmitted(true);
  };

  const handleSaveDraft = () => {
    toast.success(isRTL ? "تم حفظ المسودة" : "Draft saved successfully");
  };

  const handleBackToDashboard = () => {
    router.push(`/${locale}/dashboard`);
  };

  const handleViewRequest = () => {
    if (submittedRequestId) {
      router.push(`/${locale}/requests/${submittedRequestId}`);
    }
  };

  // Loading state
  if (isLoading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
          <p className="mt-4 text-neutral-600 dark:text-neutral-400">
            {t("common.messages.loading")}
          </p>
        </div>
      </div>
    );
  }

  // No user data available
  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">
            {isRTL ? "تعذر تحميل بيانات المستخدم" : "Unable to load user data"}
          </p>
          <Button onClick={handleBackToDashboard}>
            {t("common.actions.back")}
          </Button>
        </div>
      </div>
    );
  }

  // Success state after submission
  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <LiquidGlassCard className="max-w-md w-full text-center">
          <LiquidGlassCardContent className="pt-8 pb-8">
            <div className="flex justify-center mb-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
              {isRTL ? "تم إرسال الطلب بنجاح!" : "Request Submitted Successfully!"}
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6">
              {isRTL
                ? "تم إرسال طلب الامتياز الخاص بك للمراجعة. ستتلقى إشعاراً عند تحديث الحالة."
                : "Your privilege request has been submitted for review. You will receive a notification when the status is updated."}
            </p>
            {submittedRequestId && (
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
                {isRTL ? "رقم الطلب:" : "Request ID:"}{" "}
                <span className="font-mono font-medium">{submittedRequestId}</span>
              </p>
            )}
            <div className="flex flex-col gap-3">
              <Button onClick={handleViewRequest} className="w-full">
                {isRTL ? "عرض الطلب" : "View Request"}
              </Button>
              <Button variant="outline" onClick={handleBackToDashboard} className="w-full">
                {isRTL ? "العودة إلى لوحة التحكم" : "Back to Dashboard"}
              </Button>
            </div>
          </LiquidGlassCardContent>
        </LiquidGlassCard>
      </div>
    );
  }

  return (
    <div
      className={cn("min-h-screen bg-neutral-50 dark:bg-neutral-950", isRTL && "rtl")}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-neutral-200 dark:bg-neutral-900/80 dark:border-neutral-800">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToDashboard}
                className="gap-2"
              >
                <ArrowLeft
                  className={cn("h-4 w-4", isRTL && "rotate-180")}
                />
                {t("common.actions.back")}
              </Button>
              <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-700" />
              <div>
                <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  {t("request.newRequest")}
                </h1>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {isRTL
                    ? "أكمل جميع الخطوات لتقديم طلبك"
                    : "Complete all steps to submit your request"}
                </p>
              </div>
            </div>
            {draftId && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">
                {isRTL ? "استكمال المسودة" : "Resuming Draft"}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <PrivilegeRequestWizard
          draftId={draftId}
          initialData={userData}
          onSubmitSuccess={handleSubmitSuccess}
          onSaveDraft={handleSaveDraft}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <p className="text-xs text-center text-neutral-500 dark:text-neutral-400">
            {isRTL
              ? "يتم حفظ تقدمك تلقائياً. يمكنك العودة لإكمال الطلب في أي وقت."
              : "Your progress is automatically saved. You can return to complete the request at any time."}
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function NewRequestPage() {
  return (
    <Suspense fallback={<NewRequestLoading />}>
      <NewRequestPageContent />
    </Suspense>
  );
}
