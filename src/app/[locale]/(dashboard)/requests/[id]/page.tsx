"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  LiquidGlassCard,
  LiquidGlassCardContent,
  LiquidGlassCardHeader,
  LiquidGlassCardTitle,
} from "@/components/custom/liquid-glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  FileText,
  Download,
  User,
  Building,
  Mail,
  Phone,
  Calendar,
  Shield,
} from "lucide-react";

type RequestStatus = "DRAFT" | "PENDING" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "CANCELLED";

interface ApprovalStep {
  id: string;
  level: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  comments?: string;
  decidedAt?: string;
  approver?: {
    id: string;
    nameEn: string;
    nameAr: string;
    email: string;
    role: string;
    jobTitleEn?: string;
    jobTitleAr?: string;
  };
}

interface Attachment {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  type: string;
  driveFileUrl?: string;
  uploadedAt: string;
}

interface RequestDetails {
  id: string;
  type: string;
  requestType: string;
  status: RequestStatus;
  submittedAt: string | null;
  createdAt: string;
  applicant: {
    id: string;
    nameEn: string;
    nameAr: string;
    email: string;
    employeeCode: string;
    departmentEn: string;
    departmentAr: string;
    jobTitleEn: string;
    jobTitleAr: string;
    scfhsNo: string;
    joiningDate: string;
    nationalityEn?: string;
    nationalityAr?: string;
    locationEn?: string;
    locationAr?: string;
  };
  requestedPrivileges: Array<{
    privilege: {
      id: string;
      code: string;
      nameEn: string;
      nameAr: string;
      category: string;
      description?: string;
    };
  }>;
  approvals: ApprovalStep[];
  attachments: Attachment[];
  canEdit: boolean;
  canApprove: boolean;
}

const statusConfig: Record<RequestStatus, { icon: typeof CheckCircle; color: string; bg: string }> = {
  DRAFT: { icon: FileText, color: "text-neutral-600", bg: "bg-neutral-100" },
  PENDING: { icon: Clock, color: "text-warning-600", bg: "bg-warning-100" },
  IN_REVIEW: { icon: AlertTriangle, color: "text-primary-600", bg: "bg-primary-100" },
  APPROVED: { icon: CheckCircle, color: "text-success-600", bg: "bg-success-100" },
  REJECTED: { icon: XCircle, color: "text-error-600", bg: "bg-error-100" },
  CANCELLED: { icon: XCircle, color: "text-neutral-600", bg: "bg-neutral-100" },
};

const statusVariants: Record<RequestStatus, "default" | "secondary" | "success" | "warning" | "error"> = {
  DRAFT: "secondary",
  PENDING: "warning",
  IN_REVIEW: "default",
  APPROVED: "success",
  REJECTED: "error",
  CANCELLED: "secondary",
};

const levelLabels: Record<string, { en: string; ar: string }> = {
  HEAD_OF_SECTION: { en: "Head of Section", ar: "رئيس القسم" },
  HEAD_OF_DEPT: { en: "Department Head", ar: "رئيس الإدارة" },
  COMMITTEE: { en: "Committee", ar: "اللجنة" },
  MEDICAL_DIRECTOR: { en: "Medical Director", ar: "المدير الطبي" },
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function RequestDetailsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const params = useParams();
  const isRTL = locale === "ar";

  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [request, setRequest] = React.useState<RequestDetails | null>(null);

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

        setRequest(result.data);
      } catch (err) {
        console.error("Error fetching request:", err);
        setError("Failed to load request details");
      } finally {
        setIsLoading(false);
      }
    }

    if (params.id) {
      fetchRequest();
    }
  }, [params.id]);

  const getTypeLabel = (type: string) => {
    const labels: Record<string, { en: string; ar: string }> = {
      NEW: { en: "Initial Privileging", ar: "امتياز أولي" },
      RENEWAL: { en: "Renewal", ar: "تجديد" },
      ADDITION: { en: "Expansion of Privileges", ar: "توسيع الامتيازات" },
      TEMPORARY: { en: "Temporary Privileges", ar: "امتيازات مؤقتة" },
    };
    return isRTL ? labels[type]?.ar || type : labels[type]?.en || type;
  };

  if (isLoading) {
    return <RequestDetailsSkeleton />;
  }

  if (error || !request) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-neutral-500">{error || t("common.messages.noData")}</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push(`/${locale}/requests`)}
        >
          {t("common.actions.back")}
        </Button>
      </div>
    );
  }

  const StatusIcon = statusConfig[request.status]?.icon || Clock;
  const currentStep = request.approvals.findIndex((step) => step.status === "PENDING");

  return (
    <div className="space-y-6">
      {/* Back Button and Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/${locale}/requests`)}
        >
          <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
              {request.id.substring(0, 8).toUpperCase()}
            </h1>
            <Badge variant={statusVariants[request.status] || "secondary"}>
              {t(`common.status.${request.status.toLowerCase()}`)}
            </Badge>
          </div>
          <p className="mt-1 text-neutral-500">
            {getTypeLabel(request.type)} • {isRTL ? "تم الإنشاء" : "Created"}{" "}
            {formatDate(new Date(request.createdAt), locale)}
          </p>
        </div>
        {request.status === "PENDING" && (
          <Button variant="outline" className="text-error-600 hover:bg-error-50">
            {isRTL ? "سحب الطلب" : "Withdraw Request"}
          </Button>
        )}
      </div>

      {/* Status Banner */}
      <LiquidGlassCard
        className={`border-l-4 ${
          request.status === "APPROVED"
            ? "border-l-success-500"
            : request.status === "REJECTED"
            ? "border-l-error-500"
            : request.status === "PENDING" || request.status === "IN_REVIEW"
            ? "border-l-warning-500"
            : "border-l-neutral-300"
        }`}
      >
        <LiquidGlassCardContent className="flex items-center gap-4 p-4">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-full ${statusConfig[request.status]?.bg || "bg-neutral-100"}`}
          >
            <StatusIcon className={`h-6 w-6 ${statusConfig[request.status]?.color || "text-neutral-600"}`} />
          </div>
          <div>
            <p className="font-medium text-neutral-900 dark:text-white">
              {request.status === "IN_REVIEW" && currentStep >= 0
                ? isRTL
                  ? `قيد المراجعة من قبل ${levelLabels[request.approvals[currentStep]?.level]?.ar || request.approvals[currentStep]?.level}`
                  : `Under review by ${levelLabels[request.approvals[currentStep]?.level]?.en || request.approvals[currentStep]?.level}`
                : t(`common.status.${request.status.toLowerCase()}`)}
            </p>
            {request.submittedAt && (
              <p className="text-sm text-neutral-500">
                {isRTL ? "تم الإرسال" : "Submitted"} {formatDate(new Date(request.submittedAt), locale)}
              </p>
            )}
          </div>
        </LiquidGlassCardContent>
      </LiquidGlassCard>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Main Info */}
        <div className="space-y-6 lg:col-span-2">
          {/* Applicant Info */}
          <LiquidGlassCard>
            <LiquidGlassCardHeader>
              <LiquidGlassCardTitle>
                {t("approvals.details.applicantInfo")}
              </LiquidGlassCardTitle>
            </LiquidGlassCardHeader>
            <LiquidGlassCardContent>
              <div className="flex items-start gap-4">
                <Avatar name={request.applicant.nameEn} size="lg" />
                <div className="flex-1 grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-neutral-400" />
                    <div>
                      <p className="text-sm text-neutral-500">{t("request.form.personalInfo.fullName")}</p>
                      <p className="font-medium">
                        {isRTL ? request.applicant.nameAr : request.applicant.nameEn}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-neutral-400" />
                    <div>
                      <p className="text-sm text-neutral-500">{t("request.form.personalInfo.department")}</p>
                      <p className="font-medium">
                        {isRTL ? request.applicant.departmentAr : request.applicant.departmentEn}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-neutral-400" />
                    <div>
                      <p className="text-sm text-neutral-500">{t("request.form.personalInfo.email")}</p>
                      <p className="font-medium">{request.applicant.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-neutral-400" />
                    <div>
                      <p className="text-sm text-neutral-500">{isRTL ? "المسمى الوظيفي" : "Job Title"}</p>
                      <p className="font-medium">
                        {isRTL ? request.applicant.jobTitleAr : request.applicant.jobTitleEn}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-neutral-400" />
                    <div>
                      <p className="text-sm text-neutral-500">{t("request.form.personalInfo.scfhsNumber")}</p>
                      <p className="font-medium">{request.applicant.scfhsNo || "-"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-neutral-400" />
                    <div>
                      <p className="text-sm text-neutral-500">{isRTL ? "الرقم الوظيفي" : "Employee Code"}</p>
                      <p className="font-medium">{request.applicant.employeeCode}</p>
                    </div>
                  </div>
                </div>
              </div>
            </LiquidGlassCardContent>
          </LiquidGlassCard>

          {/* Requested Privileges */}
          <LiquidGlassCard>
            <LiquidGlassCardHeader>
              <LiquidGlassCardTitle>
                {t("approvals.details.requestedPrivileges")} ({request.requestedPrivileges.length})
              </LiquidGlassCardTitle>
            </LiquidGlassCardHeader>
            <LiquidGlassCardContent className="p-0">
              {request.requestedPrivileges.length === 0 ? (
                <div className="p-8 text-center text-neutral-500">
                  {isRTL ? "لم يتم تحديد امتيازات" : "No privileges selected"}
                </div>
              ) : (
                <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {request.requestedPrivileges.map(({ privilege }) => (
                    <div
                      key={privilege.id}
                      className="flex items-center justify-between p-4"
                    >
                      <div>
                        <p className="font-medium text-neutral-900 dark:text-white">
                          {isRTL ? privilege.nameAr : privilege.nameEn}
                        </p>
                        <p className="text-sm text-neutral-500">
                          {privilege.code} • {privilege.category}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </LiquidGlassCardContent>
          </LiquidGlassCard>

          {/* Documents */}
          <LiquidGlassCard>
            <LiquidGlassCardHeader>
              <LiquidGlassCardTitle>
                {t("approvals.details.supportingDocuments")} ({request.attachments.length})
              </LiquidGlassCardTitle>
            </LiquidGlassCardHeader>
            <LiquidGlassCardContent className="p-0">
              {request.attachments.length === 0 ? (
                <div className="p-8 text-center text-neutral-500">
                  {isRTL ? "لا توجد مستندات مرفقة" : "No documents attached"}
                </div>
              ) : (
                <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {request.attachments.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-neutral-900 dark:text-white">
                            {doc.fileName}
                          </p>
                          <p className="text-sm text-neutral-500">
                            {doc.type} • {formatFileSize(doc.fileSize)}
                          </p>
                        </div>
                      </div>
                      {doc.driveFileUrl && (
                        <a href={doc.driveFileUrl} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon">
                            <Download className="h-4 w-4" />
                          </Button>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </LiquidGlassCardContent>
          </LiquidGlassCard>
        </div>

        {/* Right Column - Approval Timeline */}
        <div className="space-y-6">
          <LiquidGlassCard>
            <LiquidGlassCardHeader>
              <LiquidGlassCardTitle>
                {t("approvals.details.approvalWorkflow")}
              </LiquidGlassCardTitle>
            </LiquidGlassCardHeader>
            <LiquidGlassCardContent>
              {request.approvals.length === 0 ? (
                <div className="text-center text-neutral-500 py-4">
                  {isRTL ? "لم يتم بدء سير العمل بعد" : "Workflow not started yet"}
                </div>
              ) : (
                <div className="relative">
                  {request.approvals.map((step, index) => (
                    <div key={step.id} className="relative pb-8 last:pb-0">
                      {/* Connector line */}
                      {index < request.approvals.length - 1 && (
                        <div
                          className={`absolute top-8 h-full w-0.5 ${
                            step.status === "APPROVED"
                              ? "bg-success-500"
                              : "bg-neutral-200 dark:bg-neutral-700"
                          }`}
                          style={{ left: isRTL ? "auto" : "15px", right: isRTL ? "15px" : "auto" }}
                        />
                      )}

                      <div className="flex gap-4">
                        {/* Status Icon */}
                        <div
                          className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                            step.status === "APPROVED"
                              ? "bg-success-100 text-success-600"
                              : step.status === "REJECTED"
                              ? "bg-error-100 text-error-600"
                              : step.status === "PENDING" && index === currentStep
                              ? "bg-warning-100 text-warning-600"
                              : "bg-neutral-100 text-neutral-400"
                          }`}
                        >
                          {step.status === "APPROVED" ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : step.status === "REJECTED" ? (
                            <XCircle className="h-4 w-4" />
                          ) : (
                            <Clock className="h-4 w-4" />
                          )}
                        </div>

                        {/* Step Content */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-neutral-900 dark:text-white">
                            {isRTL ? levelLabels[step.level]?.ar || step.level : levelLabels[step.level]?.en || step.level}
                          </p>
                          {step.approver ? (
                            <p className="text-sm text-neutral-500">
                              {isRTL ? step.approver.nameAr : step.approver.nameEn}
                            </p>
                          ) : (
                            <p className="text-sm text-neutral-400 italic">
                              {isRTL ? "لم يتم التعيين بعد" : "Not yet assigned"}
                            </p>
                          )}
                          {step.decidedAt && (
                            <p className="mt-1 text-xs text-neutral-400">
                              {formatDate(new Date(step.decidedAt), locale)}
                            </p>
                          )}
                          {step.comments && (
                            <div className="mt-2 rounded-lg bg-neutral-50 p-2 text-sm text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                              {step.comments}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </LiquidGlassCardContent>
          </LiquidGlassCard>
        </div>
      </div>
    </div>
  );
}

function RequestDetailsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="flex-1">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
      </div>
      <Skeleton className="h-20 w-full" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    </div>
  );
}
