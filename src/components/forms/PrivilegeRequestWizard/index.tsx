"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { usePrivilegeRequest } from "@/hooks/usePrivilegeRequest";
import { StepProgress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  LiquidGlassCard,
  LiquidGlassCardContent,
  LiquidGlassCardHeader,
  LiquidGlassCardTitle,
} from "@/components/custom/liquid-glass-card";
import { ChevronLeft, ChevronRight, Save } from "lucide-react";

import StepPersonalInfo from "./StepPersonalInfo";
import StepApplicationType from "./StepApplicationType";
import StepPrivilegeSelection from "./StepPrivilegeSelection";
import StepDocumentUpload from "./StepDocumentUpload";
import StepReviewSubmit from "./StepReviewSubmit";

export interface PrivilegeRequestWizardProps {
  draftId?: string;
  initialData?: {
    nameEn?: string;
    nameAr?: string;
    employeeCode?: string;
    department?: string;
    departmentAr?: string;
    jobTitle?: string;
    jobTitleAr?: string;
    location?: string;
    locationAr?: string;
    email?: string;
  };
  onSubmitSuccess?: (requestId: string) => void;
  onSaveDraft?: () => void;
}

const WIZARD_STEPS = [
  { key: "personalInfo", label: "Personal Info", labelAr: "المعلومات الشخصية" },
  { key: "applicationType", label: "Application Type", labelAr: "نوع الطلب" },
  { key: "privileges", label: "Privileges", labelAr: "الامتيازات" },
  { key: "documents", label: "Documents", labelAr: "المستندات" },
  { key: "review", label: "Review", labelAr: "المراجعة" },
];

// Map of error message patterns to translation keys
const ERROR_TRANSLATION_MAP: Record<string, string> = {
  "Failed to save draft": "saveDraftFailed",
  "Failed to load draft": "loadDraftFailed",
  "Failed to submit request": "submitFailed",
  "Validation failed": "validationFailed",
};

export function PrivilegeRequestWizard({
  draftId,
  initialData,
  onSubmitSuccess,
  onSaveDraft,
}: PrivilegeRequestWizardProps) {
  const t = useTranslations("request");
  const tCommon = useTranslations("common");
  const locale = useLocale() as "en" | "ar";
  const isRTL = locale === "ar";

  // Translate error messages using the map
  const translateError = (error: string | null): string | null => {
    if (!error) return null;
    const translationKey = ERROR_TRANSLATION_MAP[error];
    if (translationKey) {
      return tCommon(`messages.${translationKey}`);
    }
    return error;
  };

  const wizard = usePrivilegeRequest(draftId);
  const [isSubmitPending, setIsSubmitPending] = React.useState(false);

  // Initialize with user data from Jisr if provided
  /* eslint-disable react-hooks/exhaustive-deps */
  React.useEffect(() => {
    if (initialData && Object.keys(wizard.personalInfo).length === 0) {
      wizard.updatePersonalInfo({
        nameEn: initialData.nameEn || "",
        nameAr: initialData.nameAr || "",
        employeeCode: initialData.employeeCode || "",
        department: initialData.department || "",
        departmentAr: initialData.departmentAr || "",
        jobTitle: initialData.jobTitle || "",
        jobTitleAr: initialData.jobTitleAr || "",
        location: initialData.location || "",
        locationAr: initialData.locationAr || "",
        email: initialData.email || "",
      });
    }
    // wizard is intentionally excluded to prevent infinite loops
  }, [initialData]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const handleNext = async () => {
    const isValid = await wizard.validateCurrentStep();
    if (isValid) {
      // Save draft BEFORE navigating to next step to ensure draftId is available
      // This is especially important before Step 4 (Documents) where we need the requestId for uploads
      try {
        await wizard.saveDraft();
        // Small delay to ensure state update has propagated
        await new Promise(resolve => setTimeout(resolve, 100));
        wizard.nextStep();
      } catch (error) {
        console.error("Failed to save draft:", error);
        // Don't proceed if save failed - user needs the draftId for document uploads
        // The error will be displayed by the wizard's error state
      }
    }
  };

  const handlePrevious = () => {
    wizard.previousStep();
  };

  const handleSaveDraft = async () => {
    try {
      await wizard.saveDraft();
      onSaveDraft?.();
    } catch (error) {
      // Error is already set in wizard state, will be displayed to user
      console.error("Failed to save draft:", error);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitPending || wizard.isSubmitting) return;

    setIsSubmitPending(true);
    const result = await wizard.submit();

    if (result.success) {
      toast.success(tCommon("messages.success"));
      const submittedId = result.requestId || wizard.draftId || "";
      if (submittedId) {
        onSubmitSuccess?.(submittedId);
      }
    } else {
      const errorMessage =
        translateError(result.error || wizard.error) ||
        tCommon("messages.submitFailed");
      toast.error(errorMessage);
    }

    setIsSubmitPending(false);
  };

  const renderStep = () => {
    switch (wizard.currentStep) {
      case 0:
        return (
          <StepPersonalInfo
            data={wizard.personalInfo}
            onUpdate={wizard.updatePersonalInfo}
            errors={wizard.error}
          />
        );
      case 1:
        return (
          <StepApplicationType
            data={wizard.applicationType}
            onUpdate={wizard.updateApplicationType}
            errors={wizard.error}
          />
        );
      case 2:
        return (
          <StepPrivilegeSelection
            data={wizard.privileges}
            onUpdate={wizard.updatePrivileges}
            errors={wizard.error}
          />
        );
      case 3:
        return (
          <StepDocumentUpload
            data={wizard.documents}
            onUpdate={wizard.updateDocuments}
            errors={wizard.error}
            requestId={wizard.draftId || undefined}
          />
        );
      case 4:
        return (
          <StepReviewSubmit
            personalInfo={wizard.personalInfo}
            applicationType={wizard.applicationType}
            privileges={wizard.privileges}
            documents={wizard.documents}
            review={wizard.review}
            onUpdateReview={wizard.updateReview}
            onGoToStep={wizard.setCurrentStep}
            errors={wizard.error}
          />
        );
      default:
        return null;
    }
  };

  const isFirstStep = wizard.currentStep === 0;
  const isLastStep = wizard.currentStep === WIZARD_STEPS.length - 1;
  const isSubmitting = wizard.isSubmitting || isSubmitPending;

  return (
    <div
      className={cn("w-full max-w-4xl mx-auto", isRTL && "rtl")}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Progress Indicator */}
      <div className="mb-8">
        <StepProgress
          steps={WIZARD_STEPS.map((step) => ({
            label: step.label,
            labelAr: step.labelAr,
          }))}
          currentStep={wizard.currentStep}
          locale={locale}
        />
      </div>

      {/* Main Content Card */}
      <LiquidGlassCard className="mb-6">
        <LiquidGlassCardHeader>
          <LiquidGlassCardTitle>
            {isRTL
              ? WIZARD_STEPS[wizard.currentStep].labelAr
              : WIZARD_STEPS[wizard.currentStep].label}
          </LiquidGlassCardTitle>
        </LiquidGlassCardHeader>
        <LiquidGlassCardContent className="pt-6">
          {/* Loading State */}
          {wizard.isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
              <span className="ml-3 text-neutral-600 dark:text-neutral-400">
                {tCommon("messages.loading")}
              </span>
            </div>
          )}

          {/* Error Display */}
          {wizard.error && (
            <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4 dark:bg-red-900/20 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400">
                {translateError(wizard.error)}
              </p>
            </div>
          )}

          {/* Step Content */}
          {!wizard.isLoading && renderStep()}
        </LiquidGlassCardContent>
      </LiquidGlassCard>

      {/* Navigation Buttons */}
      <div
        className={cn(
          "flex items-center gap-4",
          isLastStep ? "justify-between" : "justify-between"
        )}
      >
        {/* Left Side - Back and Save Draft */}
        <div className="flex items-center gap-3">
          {!isFirstStep && (
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={isSubmitting}
            >
              {isRTL ? (
                <ChevronRight className="h-4 w-4 ml-2" />
              ) : (
                <ChevronLeft className="h-4 w-4 mr-2" />
              )}
              {tCommon("actions.previous")}
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={handleSaveDraft}
            disabled={isSubmitting}
          >
            <Save className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
            {tCommon("actions.saveDraft")}
          </Button>
        </div>

        {/* Right Side - Next or Submit */}
        <div>
          {!isLastStep ? (
            <Button onClick={handleNext} disabled={isSubmitting}>
              {tCommon("actions.next")}
              {isRTL ? (
                <ChevronLeft className="h-4 w-4 mr-2" />
              ) : (
                <ChevronRight className="h-4 w-4 ml-2" />
              )}
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              isLoading={isSubmitting}
            >
              {t("form.review.submitApplication")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default PrivilegeRequestWizard;
