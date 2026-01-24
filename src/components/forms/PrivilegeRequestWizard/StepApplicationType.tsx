"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { RadioGroup, RadioCard } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import type { ApplicationTypeData } from "@/hooks/usePrivilegeRequest";
import { FilePlus, RefreshCw, Info } from "lucide-react";

export interface StepApplicationTypeProps {
  data: Partial<ApplicationTypeData>;
  onUpdate: (data: Partial<ApplicationTypeData>) => void;
  errors?: string | null;
}

const APPLICATION_TYPES = [
  {
    value: "new",
    labelEn: "New Application",
    labelAr: "طلب جديد",
    descriptionEn: "First-time privilege request for new practitioners",
    descriptionAr: "طلب امتياز لأول مرة للممارسين الجدد",
    icon: FilePlus,
  },
  {
    value: "reapplication",
    labelEn: "Reapplication",
    labelAr: "إعادة التقديم",
    descriptionEn: "Reapply for privileges after previous rejection or expiration",
    descriptionAr: "إعادة التقديم للامتيازات بعد الرفض أو انتهاء الصلاحية السابقة",
    icon: RefreshCw,
  },
];

export function StepApplicationType({
  data,
  onUpdate,
}: StepApplicationTypeProps) {
  const t = useTranslations("request.form.applicationType");
  const locale = useLocale();
  const isRTL = locale === "ar";

  const handleApplicationTypeChange = (value: string) => {
    onUpdate({
      applicationType: value as "new" | "reapplication",
      // Clear reapplication reason if switching to new application
      reapplicationReason:
        value === "new" ? undefined : data.reapplicationReason,
    });
  };

  const handleReasonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate({ reapplicationReason: e.target.value });
  };

  return (
    <div className="space-y-8">
      {/* Description */}
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        {t("description")}
      </p>

      {/* Application Type Selection */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
          {isRTL ? "نوع التطبيق" : "Application Type"}
        </h3>
        <RadioGroup
          name="applicationType"
          value={data.applicationType}
          onValueChange={handleApplicationTypeChange}
          className="grid gap-4 md:grid-cols-2"
        >
          {APPLICATION_TYPES.map((type) => {
            const Icon = type.icon;
            return (
              <RadioCard
                key={type.value}
                value={type.value}
                label={isRTL ? type.labelAr : type.labelEn}
                description={isRTL ? type.descriptionAr : type.descriptionEn}
                icon={<Icon className="h-5 w-5" />}
              />
            );
          })}
        </RadioGroup>
      </div>

      {/* Reapplication Reason (shown only when reapplication is selected) */}
      {data.applicationType === "reapplication" && (
        <div className="space-y-3 animate-fade-in">
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {isRTL ? "سبب إعادة التقديم" : "Reason for Reapplication"}{" "}
            <span className="text-red-500">*</span>
          </label>
          <Textarea
            value={data.reapplicationReason || ""}
            onChange={handleReasonChange}
            placeholder={
              isRTL
                ? "يرجى توضيح سبب إعادة التقديم..."
                : "Please explain the reason for your reapplication..."
            }
            rows={4}
            className="resize-none"
            aria-required="true"
          />
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {isRTL
              ? "قدم شرحاً موجزاً لسبب إعادة التقديم للامتيازات السريرية."
              : "Provide a brief explanation of why you are reapplying for clinical privileges."}
          </p>
        </div>
      )}

      {/* Info Box about privilege selection */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 dark:bg-blue-900/20 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700 dark:text-blue-300">
            {isRTL
              ? "في الخطوة التالية، ستتمكن من اختيار الامتيازات من جميع الفئات (الأساسية، الترميمية، الجراحية، وغيرها) في طلب واحد. سيتم توجيه الموافقات تلقائياً بناءً على الامتيازات المختارة."
              : "In the next step, you will be able to select privileges from all categories (Core, Restorative, Surgical, etc.) in a single request. Approvals will be automatically routed based on the privileges you select."}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StepApplicationType;
