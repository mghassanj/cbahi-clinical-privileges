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
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Download,
  User,
  Building,
  Mail,
  Shield,
  MessageSquare,
  Check,
  X,
  RotateCcw,
} from "lucide-react";

interface PrivilegeForApproval {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  category: string;
  isGranted: boolean | null; // null = not decided yet
  requiresSpecialQualification: boolean;
}

interface PreviousApproval {
  id: string;
  role: string;
  roleAr: string;
  approver: {
    name: string;
    nameAr: string;
  };
  decision: "approved" | "rejected" | "modifications_requested";
  comments: string;
  date: Date;
}

interface ApprovalDetails {
  id: string;
  type: "initial" | "renewal" | "expansion" | "temporary";
  daysPending: number;
  isEscalated: boolean;
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
  privileges: PrivilegeForApproval[];
  documents: Array<{
    id: string;
    name: string;
    type: string;
    size: string;
  }>;
  previousApprovals: PreviousApproval[];
  submittedDate: Date;
}

// Mock data
const mockApprovalDetails: ApprovalDetails = {
  id: "REQ-2024-011",
  type: "expansion",
  daysPending: 5,
  isEscalated: true,
  applicant: {
    name: "Dr. Mohammed Ali",
    nameAr: "د. محمد علي",
    email: "mohammed@hospital.com",
    phone: "+966 50 987 6543",
    department: "Oral Surgery",
    departmentAr: "جراحة الفم",
    employeeCode: "EMP-045",
    scfhsNumber: "SCFHS-67890",
    scfhsExpiry: new Date(2025, 11, 31),
  },
  privileges: [
    { id: "1", code: "SURG-005", nameEn: "Impacted Tooth Removal - Partial Bony", nameAr: "إزالة السن المنطمر - عظمي جزئي", category: "Oral Surgery", isGranted: null, requiresSpecialQualification: true },
    { id: "2", code: "SURG-006", nameEn: "Impacted Tooth Removal - Full Bony", nameAr: "إزالة السن المنطمر - عظمي كامل", category: "Oral Surgery", isGranted: null, requiresSpecialQualification: true },
    { id: "3", code: "SURG-016", nameEn: "Cyst Enucleation", nameAr: "استئصال الكيس", category: "Oral Surgery", isGranted: null, requiresSpecialQualification: true },
    { id: "4", code: "SURG-017", nameEn: "Torus Removal", nameAr: "إزالة النتوء العظمي", category: "Oral Surgery", isGranted: null, requiresSpecialQualification: true },
    { id: "5", code: "SURG-018", nameEn: "Bone Grafting - Pre-implant", nameAr: "ترقيع العظم - ما قبل الزراعة", category: "Oral Surgery", isGranted: null, requiresSpecialQualification: true },
  ],
  documents: [
    { id: "1", name: "Board_Certificate_Oral_Surgery.pdf", type: "PDF", size: "2.1 MB" },
    { id: "2", name: "Advanced_Training_Certificate.pdf", type: "PDF", size: "1.5 MB" },
    { id: "3", name: "Case_Log_2024.pdf", type: "PDF", size: "3.2 MB" },
  ],
  previousApprovals: [
    {
      id: "1",
      role: "Department Head",
      roleAr: "رئيس القسم",
      approver: { name: "Dr. Abdullah Hassan", nameAr: "د. عبدالله حسن" },
      decision: "approved",
      comments: "Dr. Mohammed has demonstrated excellent surgical skills and has completed the required training for these advanced procedures. I recommend approval.",
      date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
    },
  ],
  submittedDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
};

export default function ApprovalDetailsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const params = useParams();
  const isRTL = locale === "ar";

  const [isLoading, setIsLoading] = React.useState(true);
  const [approval, setApproval] = React.useState<ApprovalDetails | null>(null);
  const [privileges, setPrivileges] = React.useState<PrivilegeForApproval[]>([]);
  const [comments, setComments] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setApproval(mockApprovalDetails);
      setPrivileges(mockApprovalDetails.privileges);
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [params.id]);

  const handlePrivilegeToggle = (privilegeId: string, granted: boolean) => {
    setPrivileges((prev) =>
      prev.map((p) => (p.id === privilegeId ? { ...p, isGranted: granted } : p))
    );
  };

  const handleGrantAll = () => {
    setPrivileges((prev) => prev.map((p) => ({ ...p, isGranted: true })));
  };

  const handleDenyAll = () => {
    setPrivileges((prev) => prev.map((p) => ({ ...p, isGranted: false })));
  };

  const handleSubmitDecision = async (decision: "approve" | "reject" | "modifications") => {
    if (!comments.trim() && decision !== "approve") {
      alert(isRTL ? "يرجى إضافة تعليق" : "Please add a comment");
      return;
    }

    setIsSubmitting(true);
    // TODO: API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSubmitting(false);
    router.push(`/${locale}/approvals`);
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, { en: string; ar: string }> = {
      initial: { en: "Initial Privileging", ar: "امتياز أولي" },
      renewal: { en: "Renewal", ar: "تجديد" },
      expansion: { en: "Expansion of Privileges", ar: "توسيع الامتيازات" },
      temporary: { en: "Temporary Privileges", ar: "امتيازات مؤقتة" },
    };
    return isRTL ? labels[type]?.ar : labels[type]?.en;
  };

  const allDecided = privileges.every((p) => p.isGranted !== null);
  const grantedCount = privileges.filter((p) => p.isGranted === true).length;
  const deniedCount = privileges.filter((p) => p.isGranted === false).length;

  if (isLoading) {
    return <ApprovalDetailsSkeleton />;
  }

  if (!approval) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-neutral-500">{t("common.messages.noData")}</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push(`/${locale}/approvals`)}
        >
          {t("common.actions.back")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/${locale}/approvals`)}
        >
          <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
              {isRTL ? "مراجعة الطلب" : "Review Request"} {approval.id}
            </h1>
            {approval.isEscalated && (
              <Badge variant="error" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {isRTL ? "مصعد" : "Escalated"}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-neutral-500">
            {getTypeLabel(approval.type)} • {approval.daysPending} {isRTL ? "أيام في الانتظار" : "days pending"}
          </p>
        </div>
      </div>

      {/* Warning Banner for Escalated */}
      {approval.isEscalated && (
        <div className="flex items-center gap-3 rounded-lg border border-error-200 bg-error-50 p-4 dark:border-error-800 dark:bg-error-900/20">
          <AlertTriangle className="h-5 w-5 text-error-600" />
          <div>
            <p className="font-medium text-error-800 dark:text-error-200">
              {isRTL ? "هذا الطلب مصعد" : "This request has been escalated"}
            </p>
            <p className="text-sm text-error-600 dark:text-error-400">
              {isRTL
                ? "تجاوز هذا الطلب الوقت المحدد للموافقة. يرجى المراجعة في أقرب وقت ممكن."
                : "This request has exceeded the approval timeline. Please review as soon as possible."}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Applicant Summary */}
          <LiquidGlassCard>
            <LiquidGlassCardHeader>
              <LiquidGlassCardTitle>
                {t("approvals.details.applicantInfo")}
              </LiquidGlassCardTitle>
            </LiquidGlassCardHeader>
            <LiquidGlassCardContent>
              <div className="flex items-start gap-4">
                <Avatar name={approval.applicant.name} size="lg" />
                <div className="flex-1 grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-neutral-400" />
                    <span className="font-medium">
                      {isRTL ? approval.applicant.nameAr : approval.applicant.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-neutral-400" />
                    <span>
                      {isRTL ? approval.applicant.departmentAr : approval.applicant.department}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-neutral-400" />
                    <span>{approval.applicant.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-neutral-400" />
                    <span>{approval.applicant.scfhsNumber}</span>
                  </div>
                </div>
              </div>
            </LiquidGlassCardContent>
          </LiquidGlassCard>

          {/* Privileges Review */}
          <LiquidGlassCard>
            <LiquidGlassCardHeader className="flex flex-row items-center justify-between">
              <LiquidGlassCardTitle>
                {t("approvals.details.requestedPrivileges")} ({privileges.length})
              </LiquidGlassCardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleGrantAll}>
                  <Check className="mr-1 h-4 w-4 rtl:ml-1 rtl:mr-0" />
                  {isRTL ? "منح الكل" : "Grant All"}
                </Button>
                <Button variant="outline" size="sm" onClick={handleDenyAll}>
                  <X className="mr-1 h-4 w-4 rtl:ml-1 rtl:mr-0" />
                  {isRTL ? "رفض الكل" : "Deny All"}
                </Button>
              </div>
            </LiquidGlassCardHeader>
            <LiquidGlassCardContent className="p-0">
              <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {privileges.map((privilege) => (
                  <div
                    key={privilege.id}
                    className="flex items-center justify-between p-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-neutral-900 dark:text-white">
                          {isRTL ? privilege.nameAr : privilege.nameEn}
                        </p>
                        {privilege.requiresSpecialQualification && (
                          <Badge variant="warning" className="text-xs">
                            {isRTL ? "يتطلب تأهيل خاص" : "Special Qualification"}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-neutral-500">
                        {privilege.code} • {privilege.category}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={privilege.isGranted === true ? "success" : "outline"}
                        size="sm"
                        onClick={() => handlePrivilegeToggle(privilege.id, true)}
                        className={privilege.isGranted === true ? "bg-success-600 text-white" : ""}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={privilege.isGranted === false ? "destructive" : "outline"}
                        size="sm"
                        onClick={() => handlePrivilegeToggle(privilege.id, false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              {allDecided && (
                <div className="border-t border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/50">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    {isRTL ? "الملخص:" : "Summary:"}{" "}
                    <span className="text-success-600">{grantedCount} {isRTL ? "ممنوح" : "granted"}</span>,{" "}
                    <span className="text-error-600">{deniedCount} {isRTL ? "مرفوض" : "denied"}</span>
                  </p>
                </div>
              )}
            </LiquidGlassCardContent>
          </LiquidGlassCard>

          {/* Documents */}
          <LiquidGlassCard>
            <LiquidGlassCardHeader>
              <LiquidGlassCardTitle>
                {t("approvals.details.supportingDocuments")}
              </LiquidGlassCardTitle>
            </LiquidGlassCardHeader>
            <LiquidGlassCardContent className="p-0">
              <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {approval.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
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

          {/* Previous Approvals */}
          {approval.previousApprovals.length > 0 && (
            <LiquidGlassCard>
              <LiquidGlassCardHeader>
                <LiquidGlassCardTitle>
                  {t("approvals.details.previousApprovals")}
                </LiquidGlassCardTitle>
              </LiquidGlassCardHeader>
              <LiquidGlassCardContent className="space-y-4">
                {approval.previousApprovals.map((prev) => (
                  <div
                    key={prev.id}
                    className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full ${
                            prev.decision === "approved"
                              ? "bg-success-100 text-success-600"
                              : prev.decision === "rejected"
                              ? "bg-error-100 text-error-600"
                              : "bg-warning-100 text-warning-600"
                          }`}
                        >
                          {prev.decision === "approved" ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : prev.decision === "rejected" ? (
                            <XCircle className="h-4 w-4" />
                          ) : (
                            <RotateCcw className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-neutral-900 dark:text-white">
                            {isRTL ? prev.approver.nameAr : prev.approver.name}
                          </p>
                          <p className="text-sm text-neutral-500">
                            {isRTL ? prev.roleAr : prev.role}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm text-neutral-500">
                        {formatDate(prev.date, locale)}
                      </span>
                    </div>
                    {prev.comments && (
                      <div className="mt-3 rounded-lg bg-neutral-50 p-3 text-sm text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                        <MessageSquare className="mb-1 inline h-4 w-4 text-neutral-400" />{" "}
                        {prev.comments}
                      </div>
                    )}
                  </div>
                ))}
              </LiquidGlassCardContent>
            </LiquidGlassCard>
          )}
        </div>

        {/* Right Column - Decision Form */}
        <div className="space-y-6">
          <LiquidGlassCard className="sticky top-24">
            <LiquidGlassCardHeader>
              <LiquidGlassCardTitle>
                {t("approvals.form.decision")}
              </LiquidGlassCardTitle>
            </LiquidGlassCardHeader>
            <LiquidGlassCardContent className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  {t("approvals.form.comments")}
                </label>
                <Textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder={t("approvals.form.commentsPlaceholder")}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Button
                  className="w-full"
                  variant="success"
                  disabled={!allDecided || isSubmitting}
                  isLoading={isSubmitting}
                  onClick={() => handleSubmitDecision("approve")}
                >
                  <CheckCircle className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
                  {t("approvals.form.confirmApproval")}
                </Button>
                <Button
                  className="w-full"
                  variant="destructive"
                  disabled={isSubmitting}
                  isLoading={isSubmitting}
                  onClick={() => handleSubmitDecision("reject")}
                >
                  <XCircle className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
                  {t("approvals.form.confirmRejection")}
                </Button>
                <Button
                  className="w-full"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => handleSubmitDecision("modifications")}
                >
                  <RotateCcw className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
                  {t("approvals.actions.requestModifications")}
                </Button>
              </div>

              {!allDecided && (
                <p className="text-center text-sm text-warning-600 dark:text-warning-400">
                  {isRTL
                    ? "يرجى اتخاذ قرار بشأن جميع الامتيازات قبل الموافقة"
                    : "Please decide on all privileges before approving"}
                </p>
              )}
            </LiquidGlassCardContent>
          </LiquidGlassCard>
        </div>
      </div>
    </div>
  );
}

function ApprovalDetailsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="flex-1">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="mt-2 h-4 w-48" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    </div>
  );
}
