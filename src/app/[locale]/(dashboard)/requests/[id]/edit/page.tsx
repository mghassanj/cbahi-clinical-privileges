"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { PrivilegeRequestWizard } from "@/components/forms/PrivilegeRequestWizard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";

interface RequestData {
  id: string;
  type: string;
  status: string;
  applicant: {
    id: string;
    nameEn: string;
    nameAr: string;
    email: string;
    employeeCode?: string;
    department?: string;
    departmentAr?: string;
    jobTitle?: string;
    jobTitleAr?: string;
    location?: string;
    locationAr?: string;
  };
}

export default function EditRequestPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const params = useParams();
  const isRTL = locale === "ar";

  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [requestData, setRequestData] = React.useState<RequestData | null>(null);

  React.useEffect(() => {
    async function fetchRequest() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/requests/${params.id}`);
        const result = await response.json();

        if (!response.ok) {
          setError(result.message || "Failed to fetch request");
          return;
        }

        // Check if request can be edited (only DRAFT status)
        if (result.data.status !== "DRAFT") {
          setError(
            isRTL
              ? "لا يمكن تعديل هذا الطلب. يمكن تعديل الطلبات المسودة فقط."
              : "This request cannot be edited. Only draft requests can be edited."
          );
          return;
        }

        setRequestData(result.data);
      } catch (err) {
        console.error("Error fetching request:", err);
        setError(isRTL ? "فشل في تحميل الطلب" : "Failed to load request");
      } finally {
        setIsLoading(false);
      }
    }

    if (params.id) {
      fetchRequest();
    }
  }, [params.id, isRTL]);

  if (isLoading) {
    return <EditRequestSkeleton />;
  }

  if (error || !requestData) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-neutral-500 text-center max-w-md">{error || t("common.messages.noData")}</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push(`/${locale}/requests`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0 rtl:rotate-180" />
          {t("common.actions.back")}
        </Button>
      </div>
    );
  }

  // Prepare initial data for the wizard - only personal info fields
  const initialData = {
    nameEn: requestData.applicant.nameEn,
    nameAr: requestData.applicant.nameAr,
    employeeCode: requestData.applicant.employeeCode,
    department: requestData.applicant.department,
    departmentAr: requestData.applicant.departmentAr,
    jobTitle: requestData.applicant.jobTitle,
    jobTitleAr: requestData.applicant.jobTitleAr,
    location: requestData.applicant.location,
    locationAr: requestData.applicant.locationAr,
    email: requestData.applicant.email,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/${locale}/requests`)}
        >
          <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            {isRTL ? "تعديل الطلب" : "Edit Request"}
          </h1>
          <p className="mt-1 text-neutral-500">
            {isRTL ? "تعديل طلب الامتياز المسودة" : "Edit your draft privilege request"}
          </p>
        </div>
      </div>

      {/* Wizard - loads the draft request by ID */}
      <PrivilegeRequestWizard
        draftId={requestData.id}
        initialData={initialData}
        onSubmitSuccess={() => router.push(`/${locale}/requests/${requestData.id}`)}
        onSaveDraft={() => router.push(`/${locale}/requests`)}
      />
    </div>
  );
}

function EditRequestSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
      </div>
      <Skeleton className="h-[600px] w-full" />
    </div>
  );
}
