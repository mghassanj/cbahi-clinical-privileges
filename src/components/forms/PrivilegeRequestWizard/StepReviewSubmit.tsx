"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  LiquidGlassCard,
  LiquidGlassCardContent,
  LiquidGlassCardHeader,
  LiquidGlassCardTitle,
} from "@/components/custom/liquid-glass-card";
import type {
  PersonalInfoData,
  ApplicationTypeData,
  PrivilegeSelectionData,
  DocumentsData,
  ReviewData,
  DocumentData,
} from "@/hooks/usePrivilegeRequest";
import {
  User,
  FileText,
  Shield,
  Upload,
  Edit,
  CheckCircle,
  AlertTriangle,
  Users,
  Clock,
  ArrowRight,
} from "lucide-react";
import { PrivilegeCategory } from "@/data/privileges";

export interface StepReviewSubmitProps {
  personalInfo: Partial<PersonalInfoData>;
  applicationType: Partial<ApplicationTypeData>;
  privileges: Partial<PrivilegeSelectionData>;
  documents: Partial<DocumentsData>;
  review: Partial<ReviewData>;
  onUpdateReview: (data: Partial<ReviewData>) => void;
  onGoToStep: (step: number) => void;
  errors?: string | null;
}

// System approval workflow configuration
// These levels match the ApprovalLevel enum in the Prisma schema
const APPROVAL_CHAIN = [
  {
    level: "HEAD_OF_SECTION",
    titleEn: "Head of Section",
    titleAr: "رئيس القسم",
    descriptionEn: "Initial review and recommendation",
    descriptionAr: "المراجعة الأولية والتوصية",
    estimatedDays: 3,
  },
  {
    level: "HEAD_OF_DEPT",
    titleEn: "Head of Department",
    titleAr: "رئيس الإدارة",
    descriptionEn: "Departmental approval",
    descriptionAr: "موافقة الإدارة",
    estimatedDays: 3,
  },
  {
    level: "COMMITTEE",
    titleEn: "Privileges Committee",
    titleAr: "لجنة الامتيازات",
    descriptionEn: "Committee review and evaluation",
    descriptionAr: "مراجعة وتقييم اللجنة",
    estimatedDays: 5,
  },
  {
    level: "MEDICAL_DIRECTOR",
    titleEn: "Medical Director",
    titleAr: "المدير الطبي",
    descriptionEn: "Final approval",
    descriptionAr: "الموافقة النهائية",
    estimatedDays: 2,
  },
];

// Privilege category display names for summary - uses real PrivilegeCategory enum
const PRIVILEGE_CATEGORY_NAMES: Record<string, { nameEn: string; nameAr: string }> = {
  [PrivilegeCategory.CORE.toLowerCase()]: { nameEn: "Core", nameAr: "أساسية" },
  [PrivilegeCategory.RESTORATIVE.toLowerCase()]: { nameEn: "Restorative", nameAr: "ترميمية" },
  [PrivilegeCategory.PEDIATRIC.toLowerCase()]: { nameEn: "Pediatric", nameAr: "أطفال" },
  [PrivilegeCategory.ORTHODONTICS.toLowerCase()]: { nameEn: "Orthodontics", nameAr: "تقويم" },
  [PrivilegeCategory.PROSTHODONTICS.toLowerCase()]: { nameEn: "Prosthodontics", nameAr: "تركيبات" },
  [PrivilegeCategory.PERIODONTICS.toLowerCase()]: { nameEn: "Periodontics", nameAr: "لثة" },
  [PrivilegeCategory.ORAL_SURGERY.toLowerCase()]: { nameEn: "Oral Surgery", nameAr: "جراحة فم" },
  [PrivilegeCategory.ENDODONTICS.toLowerCase()]: { nameEn: "Endodontics", nameAr: "علاج جذور" },
  [PrivilegeCategory.ORAL_MEDICINE.toLowerCase()]: { nameEn: "Oral Medicine", nameAr: "طب الفم" },
  [PrivilegeCategory.RADIOLOGY.toLowerCase()]: { nameEn: "Radiology", nameAr: "أشعة" },
};

export function StepReviewSubmit({
  personalInfo,
  applicationType,
  privileges,
  documents,
  review,
  onUpdateReview,
  onGoToStep,
  errors,
}: StepReviewSubmitProps) {
  const t = useTranslations("request.form.review");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const isRTL = locale === "ar";

  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);

  const selectedPrivileges = React.useMemo(
    () => privileges.selectedPrivileges || [],
    [privileges.selectedPrivileges]
  );

  // Group privileges by category for summary
  const privilegesByCategory = React.useMemo(() => {
    const grouped: Record<string, number> = {};
    selectedPrivileges.forEach((id) => {
      const category = id.split("-")[0];
      grouped[category] = (grouped[category] || 0) + 1;
    });
    return grouped;
  }, [selectedPrivileges]);

  // Calculate document stats
  const documentStats = React.useMemo(() => {
    let uploaded = 0;
    const required = 4; // educationCertificate, scfhsRegistration, nationalIdCopy, passportPhoto

    if (documents.educationCertificate) uploaded++;
    if (documents.scfhsRegistration) uploaded++;
    if (documents.nationalIdCopy) uploaded++;
    if (documents.passportPhoto) uploaded++;

    const additionalCount = (documents.additionalCertifications as DocumentData[] | undefined)?.length || 0;
    const hasCV = !!documents.cvResume;

    return {
      uploaded,
      required,
      additional: additionalCount + (hasCV ? 1 : 0),
      isComplete: uploaded === required,
    };
  }, [documents]);

  // Calculate total estimated processing time
  const totalEstimatedDays = APPROVAL_CHAIN.reduce(
    (sum, step) => sum + step.estimatedDays,
    0
  );

  const handleTermsChange = (checked: boolean) => {
    onUpdateReview({ agreedToTerms: checked });
  };

  const getApplicationTypeLabel = () => {
    if (applicationType.applicationType === "new") {
      return isRTL ? "طلب جديد" : "New Application";
    }
    return isRTL ? "إعادة التقديم" : "Reapplication";
  };

  const getRequestTypeLabel = () => {
    switch (applicationType.requestType) {
      case "core":
        return isRTL ? "امتيازات أساسية" : "Core Privileges";
      case "non-core":
        return isRTL ? "امتيازات غير أساسية" : "Non-Core Privileges";
      case "extra":
        return isRTL ? "امتيازات إضافية" : "Extra Privileges";
      default:
        return "-";
    }
  };

  return (
    <div className="space-y-6">
      {/* Description */}
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        {t("description")}
      </p>

      {/* Summary Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Personal Information Summary */}
        <LiquidGlassCard className="relative">
          <LiquidGlassCardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary-500" />
                <LiquidGlassCardTitle className="text-base">
                  {t("personalInfoSummary")}
                </LiquidGlassCardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onGoToStep(0)}
                className="h-8 px-2"
              >
                <Edit className="h-4 w-4" />
                <span className="sr-only">{tCommon("actions.edit")}</span>
              </Button>
            </div>
          </LiquidGlassCardHeader>
          <LiquidGlassCardContent className="pt-0">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-neutral-500 dark:text-neutral-400">
                  {isRTL ? "الاسم" : "Name"}
                </dt>
                <dd className="font-medium text-neutral-900 dark:text-neutral-100">
                  {isRTL ? personalInfo.nameAr || personalInfo.nameEn : personalInfo.nameEn}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500 dark:text-neutral-400">
                  {isRTL ? "القسم" : "Department"}
                </dt>
                <dd className="font-medium text-neutral-900 dark:text-neutral-100">
                  {isRTL
                    ? personalInfo.departmentAr || personalInfo.department
                    : personalInfo.department || "-"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500 dark:text-neutral-400">
                  {isRTL ? "رقم الهيئة" : "SCFHS No."}
                </dt>
                <dd className="font-medium font-mono text-neutral-900 dark:text-neutral-100">
                  {personalInfo.scfhsNumber || "-"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500 dark:text-neutral-400">
                  {isRTL ? "المركز" : "Center"}
                </dt>
                <dd className="font-medium text-neutral-900 dark:text-neutral-100">
                  {personalInfo.hospitalCenter || "-"}
                </dd>
              </div>
            </dl>
          </LiquidGlassCardContent>
        </LiquidGlassCard>

        {/* Application Type Summary */}
        <LiquidGlassCard className="relative">
          <LiquidGlassCardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary-500" />
                <LiquidGlassCardTitle className="text-base">
                  {isRTL ? "نوع الطلب" : "Application Type"}
                </LiquidGlassCardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onGoToStep(1)}
                className="h-8 px-2"
              >
                <Edit className="h-4 w-4" />
                <span className="sr-only">{tCommon("actions.edit")}</span>
              </Button>
            </div>
          </LiquidGlassCardHeader>
          <LiquidGlassCardContent className="pt-0">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-neutral-500 dark:text-neutral-400">
                  {isRTL ? "نوع التطبيق" : "Application"}
                </dt>
                <dd className="font-medium text-neutral-900 dark:text-neutral-100">
                  {getApplicationTypeLabel()}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500 dark:text-neutral-400">
                  {isRTL ? "نوع الطلب" : "Request Type"}
                </dt>
                <dd className="font-medium text-neutral-900 dark:text-neutral-100">
                  {getRequestTypeLabel()}
                </dd>
              </div>
              {applicationType.applicationType === "reapplication" && (
                <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700">
                  <dt className="text-neutral-500 dark:text-neutral-400 mb-1">
                    {isRTL ? "سبب إعادة التقديم" : "Reapplication Reason"}
                  </dt>
                  <dd className="text-neutral-900 dark:text-neutral-100 text-xs">
                    {applicationType.reapplicationReason || "-"}
                  </dd>
                </div>
              )}
            </dl>
          </LiquidGlassCardContent>
        </LiquidGlassCard>

        {/* Privileges Summary */}
        <LiquidGlassCard className="relative">
          <LiquidGlassCardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary-500" />
                <LiquidGlassCardTitle className="text-base">
                  {t("privilegesSummary")}
                </LiquidGlassCardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onGoToStep(2)}
                className="h-8 px-2"
              >
                <Edit className="h-4 w-4" />
                <span className="sr-only">{tCommon("actions.edit")}</span>
              </Button>
            </div>
          </LiquidGlassCardHeader>
          <LiquidGlassCardContent className="pt-0">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                {selectedPrivileges.length}
              </span>
              <span className="text-sm text-neutral-500 dark:text-neutral-400">
                {isRTL ? "امتياز مختار" : "privileges selected"}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(privilegesByCategory).map(([category, count]) => {
                const catInfo = PRIVILEGE_CATEGORY_NAMES[category];
                return (
                  <span
                    key={category}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300"
                  >
                    {isRTL ? catInfo?.nameAr || category : catInfo?.nameEn || category}:{" "}
                    {count}
                  </span>
                );
              })}
            </div>
          </LiquidGlassCardContent>
        </LiquidGlassCard>

        {/* Documents Summary */}
        <LiquidGlassCard className="relative">
          <LiquidGlassCardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary-500" />
                <LiquidGlassCardTitle className="text-base">
                  {t("documentsSummary")}
                </LiquidGlassCardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onGoToStep(3)}
                className="h-8 px-2"
              >
                <Edit className="h-4 w-4" />
                <span className="sr-only">{tCommon("actions.edit")}</span>
              </Button>
            </div>
          </LiquidGlassCardHeader>
          <LiquidGlassCardContent className="pt-0">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {documentStats.isComplete ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                )}
                <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {documentStats.uploaded}/{documentStats.required}{" "}
                  {isRTL ? "مستندات مطلوبة" : "required documents"}
                </span>
              </div>
              {documentStats.additional > 0 && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  + {documentStats.additional}{" "}
                  {isRTL ? "مستندات إضافية" : "additional documents"}
                </p>
              )}
              {!documentStats.isComplete && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {isRTL
                    ? "يرجى رفع جميع المستندات المطلوبة قبل الإرسال"
                    : "Please upload all required documents before submitting"}
                </p>
              )}
            </div>
          </LiquidGlassCardContent>
        </LiquidGlassCard>
      </div>

      {/* Approval Chain */}
      <LiquidGlassCard>
        <LiquidGlassCardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary-500" />
            <LiquidGlassCardTitle className="text-base">
              {isRTL ? "مسار الموافقة المتوقع" : "Expected Approval Chain"}
            </LiquidGlassCardTitle>
          </div>
        </LiquidGlassCardHeader>
        <LiquidGlassCardContent className="pt-0">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 text-neutral-500" />
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              {isRTL
                ? `الوقت المقدر للمعالجة: ~${totalEstimatedDays} أيام عمل`
                : `Estimated processing time: ~${totalEstimatedDays} business days`}
            </span>
          </div>
          <div className="flex items-center justify-between overflow-x-auto pb-2">
            {APPROVAL_CHAIN.map((step, index) => (
              <React.Fragment key={step.level}>
                <div className="flex flex-col items-center min-w-[100px]">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 font-semibold text-sm">
                    {index + 1}
                  </div>
                  <span className="mt-2 text-xs font-medium text-neutral-900 dark:text-neutral-100 text-center">
                    {isRTL ? step.titleAr : step.titleEn}
                  </span>
                  <span className="text-xs text-neutral-400 mt-0.5">
                    ~{step.estimatedDays} {isRTL ? "أيام" : "days"}
                  </span>
                </div>
                {index < APPROVAL_CHAIN.length - 1 && (
                  <ArrowRight className="h-5 w-5 text-neutral-300 dark:text-neutral-600 flex-shrink-0 mx-2 rtl:rotate-180" />
                )}
              </React.Fragment>
            ))}
          </div>
        </LiquidGlassCardContent>
      </LiquidGlassCard>

      {/* Declaration and Terms */}
      <LiquidGlassCard>
        <LiquidGlassCardHeader className="pb-3">
          <LiquidGlassCardTitle className="text-base">
            {t("declaration")}
          </LiquidGlassCardTitle>
        </LiquidGlassCardHeader>
        <LiquidGlassCardContent className="pt-0">
          <div className="space-y-4">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {t("declarationText")}
            </p>
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="agree-terms"
                checked={review.agreedToTerms || false}
                onChange={(e) => handleTermsChange(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              <label
                htmlFor="agree-terms"
                className="text-sm font-medium text-neutral-900 dark:text-neutral-100 cursor-pointer"
              >
                {t("agreeTerms")}
              </label>
            </div>
          </div>
        </LiquidGlassCardContent>
      </LiquidGlassCard>

      {/* Validation Errors */}
      {errors && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 dark:bg-red-900/20 dark:border-red-800">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600 dark:text-red-400">{errors}</p>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogClose />
          <DialogHeader>
            <DialogTitle>
              {isRTL ? "تأكيد الإرسال" : "Confirm Submission"}
            </DialogTitle>
            <DialogDescription>
              {isRTL
                ? "هل أنت متأكد من إرسال طلب الامتياز هذا؟ بمجرد الإرسال، لن تتمكن من تعديل الطلب."
                : "Are you sure you want to submit this privilege request? Once submitted, you will not be able to modify the request."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              {tCommon("actions.cancel")}
            </Button>
            <Button
              onClick={() => {
                setShowConfirmDialog(false);
                // The actual submission is handled by the parent wizard
              }}
            >
              {tCommon("actions.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default StepReviewSubmit;
