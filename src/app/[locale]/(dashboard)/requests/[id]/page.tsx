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

type RequestStatus = "draft" | "pending" | "in_review" | "approved" | "rejected" | "cancelled";

interface ApprovalStep {
  id: string;
  role: string;
  roleAr: string;
  approver?: {
    name: string;
    nameAr: string;
    email: string;
  };
  status: "pending" | "approved" | "rejected" | "skipped";
  comments?: string;
  date?: Date;
}

interface Document {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadedAt: Date;
}

interface RequestDetails {
  id: string;
  type: "initial" | "renewal" | "expansion" | "temporary";
  status: RequestStatus;
  submittedDate: Date | null;
  createdDate: Date;
  applicant: {
    name: string;
    nameAr: string;
    email: string;
    phone: string;
    department: string;
    departmentAr: string;
    employeeCode: string;
    scfhsNumber: string;
    scfhsExpiry: Date;
  };
  privileges: Array<{
    id: string;
    code: string;
    nameEn: string;
    nameAr: string;
    category: string;
  }>;
  approvalChain: ApprovalStep[];
  documents: Document[];
}

// Mock data - replace with API call
const mockRequest: RequestDetails = {
  id: "REQ-2024-002",
  type: "renewal",
  status: "in_review",
  submittedDate: new Date(2024, 1, 20),
  createdDate: new Date(2024, 1, 18),
  applicant: {
    name: "Dr. Ahmed Al-Rashid",
    nameAr: "د. أحمد الراشد",
    email: "ahmed.rashid@hospital.com",
    phone: "+966 50 123 4567",
    department: "Dental Department",
    departmentAr: "قسم طب الأسنان",
    employeeCode: "EMP-001",
    scfhsNumber: "SCFHS-12345",
    scfhsExpiry: new Date(2025, 5, 30),
  },
  privileges: [
    { id: "1", code: "CORE-001", nameEn: "Comprehensive Oral Examination", nameAr: "الفحص الفموي الشامل", category: "Core" },
    { id: "2", code: "CORE-002", nameEn: "Dental Diagnosis and Treatment Planning", nameAr: "التشخيص وتخطيط العلاج السني", category: "Core" },
    { id: "3", code: "REST-001", nameEn: "Amalgam Restoration - Simple", nameAr: "حشوة الأملغم - بسيطة", category: "Restorative" },
    { id: "4", code: "REST-003", nameEn: "Composite Restoration - Anterior", nameAr: "حشوة الكمبوزيت - أمامية", category: "Restorative" },
    { id: "5", code: "ENDO-003", nameEn: "Root Canal Treatment - Anterior", nameAr: "علاج قناة الجذر - أمامي", category: "Endodontics" },
  ],
  approvalChain: [
    {
      id: "1",
      role: "Department Head",
      roleAr: "رئيس القسم",
      approver: { name: "Dr. Abdullah Hassan", nameAr: "د. عبدالله حسن", email: "abdullah@hospital.com" },
      status: "approved",
      comments: "Approved. Excellent track record.",
      date: new Date(2024, 1, 22),
    },
    {
      id: "2",
      role: "Medical Director",
      roleAr: "المدير الطبي",
      approver: { name: "Dr. Fatima Omar", nameAr: "د. فاطمة عمر", email: "fatima@hospital.com" },
      status: "pending",
    },
    {
      id: "3",
      role: "HR Manager",
      roleAr: "مدير الموارد البشرية",
      status: "pending",
    },
  ],
  documents: [
    { id: "1", name: "SCFHS_License.pdf", type: "PDF", size: "1.2 MB", uploadedAt: new Date(2024, 1, 18) },
    { id: "2", name: "Board_Certificate.pdf", type: "PDF", size: "2.5 MB", uploadedAt: new Date(2024, 1, 18) },
    { id: "3", name: "Experience_Letter.pdf", type: "PDF", size: "0.8 MB", uploadedAt: new Date(2024, 1, 18) },
  ],
};

const statusConfig: Record<RequestStatus, { icon: typeof CheckCircle; color: string; bg: string }> = {
  draft: { icon: FileText, color: "text-neutral-600", bg: "bg-neutral-100" },
  pending: { icon: Clock, color: "text-warning-600", bg: "bg-warning-100" },
  in_review: { icon: AlertTriangle, color: "text-primary-600", bg: "bg-primary-100" },
  approved: { icon: CheckCircle, color: "text-success-600", bg: "bg-success-100" },
  rejected: { icon: XCircle, color: "text-error-600", bg: "bg-error-100" },
  cancelled: { icon: XCircle, color: "text-neutral-600", bg: "bg-neutral-100" },
};

const statusVariants: Record<RequestStatus, "default" | "secondary" | "success" | "warning" | "error"> = {
  draft: "secondary",
  pending: "warning",
  in_review: "default",
  approved: "success",
  rejected: "error",
  cancelled: "secondary",
};

export default function RequestDetailsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const params = useParams();
  const isRTL = locale === "ar";

  const [isLoading, setIsLoading] = React.useState(true);
  const [request, setRequest] = React.useState<RequestDetails | null>(null);

  React.useEffect(() => {
    // Simulate API call
    const timer = setTimeout(() => {
      setRequest(mockRequest);
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [params.id]);

  const getTypeLabel = (type: string) => {
    const labels: Record<string, { en: string; ar: string }> = {
      initial: { en: "Initial Privileging", ar: "امتياز أولي" },
      renewal: { en: "Renewal", ar: "تجديد" },
      expansion: { en: "Expansion of Privileges", ar: "توسيع الامتيازات" },
      temporary: { en: "Temporary Privileges", ar: "امتيازات مؤقتة" },
    };
    return isRTL ? labels[type]?.ar : labels[type]?.en;
  };

  if (isLoading) {
    return <RequestDetailsSkeleton />;
  }

  if (!request) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-neutral-500">{t("common.messages.noData")}</p>
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

  const StatusIcon = statusConfig[request.status].icon;
  const currentStep = request.approvalChain.findIndex((step) => step.status === "pending");

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
              {request.id}
            </h1>
            <Badge variant={statusVariants[request.status]}>
              {t(`common.status.${request.status}`)}
            </Badge>
          </div>
          <p className="mt-1 text-neutral-500">
            {getTypeLabel(request.type)} • {isRTL ? "تم الإنشاء" : "Created"}{" "}
            {formatDate(request.createdDate, locale)}
          </p>
        </div>
        {request.status === "pending" && (
          <Button variant="outline" className="text-error-600 hover:bg-error-50">
            {isRTL ? "سحب الطلب" : "Withdraw Request"}
          </Button>
        )}
      </div>

      {/* Status Banner */}
      <LiquidGlassCard
        className={`border-l-4 ${
          request.status === "approved"
            ? "border-l-success-500"
            : request.status === "rejected"
            ? "border-l-error-500"
            : request.status === "pending" || request.status === "in_review"
            ? "border-l-warning-500"
            : "border-l-neutral-300"
        }`}
      >
        <LiquidGlassCardContent className="flex items-center gap-4 p-4">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-full ${statusConfig[request.status].bg}`}
          >
            <StatusIcon className={`h-6 w-6 ${statusConfig[request.status].color}`} />
          </div>
          <div>
            <p className="font-medium text-neutral-900 dark:text-white">
              {request.status === "in_review"
                ? isRTL
                  ? `قيد المراجعة من قبل ${request.approvalChain[currentStep]?.roleAr}`
                  : `Under review by ${request.approvalChain[currentStep]?.role}`
                : t(`common.status.${request.status}`)}
            </p>
            {request.submittedDate && (
              <p className="text-sm text-neutral-500">
                {isRTL ? "تم الإرسال" : "Submitted"} {formatDate(request.submittedDate, locale)}
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
                <Avatar name={request.applicant.name} size="lg" />
                <div className="flex-1 grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-neutral-400" />
                    <div>
                      <p className="text-sm text-neutral-500">{t("request.form.personalInfo.fullName")}</p>
                      <p className="font-medium">
                        {isRTL ? request.applicant.nameAr : request.applicant.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-neutral-400" />
                    <div>
                      <p className="text-sm text-neutral-500">{t("request.form.personalInfo.department")}</p>
                      <p className="font-medium">
                        {isRTL ? request.applicant.departmentAr : request.applicant.department}
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
                    <Phone className="h-4 w-4 text-neutral-400" />
                    <div>
                      <p className="text-sm text-neutral-500">{t("request.form.personalInfo.phone")}</p>
                      <p className="font-medium" dir="ltr">{request.applicant.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-neutral-400" />
                    <div>
                      <p className="text-sm text-neutral-500">{t("request.form.personalInfo.scfhsNumber")}</p>
                      <p className="font-medium">{request.applicant.scfhsNumber}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-neutral-400" />
                    <div>
                      <p className="text-sm text-neutral-500">{t("request.form.personalInfo.scfhsExpiry")}</p>
                      <p className="font-medium">{formatDate(request.applicant.scfhsExpiry, locale)}</p>
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
                {t("approvals.details.requestedPrivileges")} ({request.privileges.length})
              </LiquidGlassCardTitle>
            </LiquidGlassCardHeader>
            <LiquidGlassCardContent className="p-0">
              <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {request.privileges.map((privilege) => (
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
            </LiquidGlassCardContent>
          </LiquidGlassCard>

          {/* Documents */}
          <LiquidGlassCard>
            <LiquidGlassCardHeader>
              <LiquidGlassCardTitle>
                {t("approvals.details.supportingDocuments")} ({request.documents.length})
              </LiquidGlassCardTitle>
            </LiquidGlassCardHeader>
            <LiquidGlassCardContent className="p-0">
              <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {request.documents.map((doc) => (
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
                          {doc.name}
                        </p>
                        <p className="text-sm text-neutral-500">
                          {doc.type} • {doc.size}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
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
              <div className="relative">
                {request.approvalChain.map((step, index) => (
                  <div key={step.id} className="relative pb-8 last:pb-0">
                    {/* Connector line */}
                    {index < request.approvalChain.length - 1 && (
                      <div
                        className={`absolute top-8 h-full w-0.5 ${
                          step.status === "approved"
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
                          step.status === "approved"
                            ? "bg-success-100 text-success-600"
                            : step.status === "rejected"
                            ? "bg-error-100 text-error-600"
                            : step.status === "pending" && index === currentStep
                            ? "bg-warning-100 text-warning-600"
                            : "bg-neutral-100 text-neutral-400"
                        }`}
                      >
                        {step.status === "approved" ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : step.status === "rejected" ? (
                          <XCircle className="h-4 w-4" />
                        ) : (
                          <Clock className="h-4 w-4" />
                        )}
                      </div>

                      {/* Step Content */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-neutral-900 dark:text-white">
                          {isRTL ? step.roleAr : step.role}
                        </p>
                        {step.approver ? (
                          <p className="text-sm text-neutral-500">
                            {isRTL ? step.approver.nameAr : step.approver.name}
                          </p>
                        ) : (
                          <p className="text-sm text-neutral-400 italic">
                            {isRTL ? "لم يتم التعيين بعد" : "Not yet assigned"}
                          </p>
                        )}
                        {step.date && (
                          <p className="mt-1 text-xs text-neutral-400">
                            {formatDate(step.date, locale)}
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
