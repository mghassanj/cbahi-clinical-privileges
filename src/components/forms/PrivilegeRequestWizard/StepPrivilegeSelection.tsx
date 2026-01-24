"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { PrivilegeSelectionData } from "@/hooks/usePrivilegeRequest";
import {
  dentalPrivileges,
  PrivilegeCategory,
} from "@/data/privileges";
import {
  Search,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export interface StepPrivilegeSelectionProps {
  data: Partial<PrivilegeSelectionData>;
  onUpdate: (data: Partial<PrivilegeSelectionData>) => void;
  errors?: string | null;
}

// Category display names for UI
const CATEGORY_NAMES: Record<PrivilegeCategory, { nameEn: string; nameAr: string }> = {
  [PrivilegeCategory.CORE]: { nameEn: "Core Privileges", nameAr: "الامتيازات الأساسية" },
  [PrivilegeCategory.RESTORATIVE]: { nameEn: "Restorative Dentistry", nameAr: "طب الأسنان الترميمي" },
  [PrivilegeCategory.PEDIATRIC]: { nameEn: "Pediatric Dentistry", nameAr: "طب أسنان الأطفال" },
  [PrivilegeCategory.ORTHODONTICS]: { nameEn: "Orthodontics", nameAr: "تقويم الأسنان" },
  [PrivilegeCategory.PROSTHODONTICS]: { nameEn: "Prosthodontics", nameAr: "التركيبات السنية" },
  [PrivilegeCategory.PERIODONTICS]: { nameEn: "Periodontics", nameAr: "علاج اللثة" },
  [PrivilegeCategory.ORAL_SURGERY]: { nameEn: "Oral Surgery", nameAr: "جراحة الفم" },
  [PrivilegeCategory.ENDODONTICS]: { nameEn: "Endodontics", nameAr: "علاج الجذور" },
  [PrivilegeCategory.ORAL_MEDICINE]: { nameEn: "Oral Medicine", nameAr: "طب الفم" },
  [PrivilegeCategory.RADIOLOGY]: { nameEn: "Radiology", nameAr: "الأشعة" },
};

// Group privileges by category from the real data catalog
const PRIVILEGE_CATEGORIES = Object.values(PrivilegeCategory).map((category) => ({
  id: category.toLowerCase(),
  nameEn: CATEGORY_NAMES[category].nameEn,
  nameAr: CATEGORY_NAMES[category].nameAr,
  privileges: dentalPrivileges
    .filter((p) => p.category === category)
    .map((p) => ({
      id: p.id,
      code: p.code,
      nameEn: p.nameEn,
      nameAr: p.nameAr,
      requiresSpecialQualification: p.requiresSpecialQualification,
    })),
}));

export function StepPrivilegeSelection({
  data,
  onUpdate,
}: StepPrivilegeSelectionProps) {
  const t = useTranslations("request.form.privileges");
  const locale = useLocale();
  const isRTL = locale === "ar";

  const [searchQuery, setSearchQuery] = React.useState("");
  const [, setActiveCategory] = React.useState(
    PRIVILEGE_CATEGORIES[0].id
  );
  const [expandedCategories, setExpandedCategories] = React.useState<string[]>(
    PRIVILEGE_CATEGORIES.map((c) => c.id)
  );

  const selectedPrivileges = React.useMemo(
    () => data.selectedPrivileges || [],
    [data.selectedPrivileges]
  );

  // Filter privileges based on search
  const filterPrivileges = (
    privileges: (typeof PRIVILEGE_CATEGORIES)[0]["privileges"]
  ) => {
    if (!searchQuery.trim()) return privileges;
    const query = searchQuery.toLowerCase();
    return privileges.filter(
      (p) =>
        p.code.toLowerCase().includes(query) ||
        p.nameEn.toLowerCase().includes(query) ||
        p.nameAr.includes(query)
    );
  };

  const handleTogglePrivilege = (privilegeId: string) => {
    const newSelected = selectedPrivileges.includes(privilegeId)
      ? selectedPrivileges.filter((id) => id !== privilegeId)
      : [...selectedPrivileges, privilegeId];
    onUpdate({ selectedPrivileges: newSelected });
  };

  const handleSelectAllCategory = (categoryId: string) => {
    const category = PRIVILEGE_CATEGORIES.find((c) => c.id === categoryId);
    if (!category) return;

    const categoryPrivilegeIds = category.privileges.map((p) => p.id);
    const allSelected = categoryPrivilegeIds.every((id) =>
      selectedPrivileges.includes(id)
    );

    if (allSelected) {
      // Deselect all in category
      const newSelected = selectedPrivileges.filter(
        (id) => !categoryPrivilegeIds.includes(id)
      );
      onUpdate({ selectedPrivileges: newSelected });
    } else {
      // Select all in category
      const newSelected = Array.from(
        new Set([...selectedPrivileges, ...categoryPrivilegeIds])
      );
      onUpdate({ selectedPrivileges: newSelected });
    }
  };

  const toggleCategoryExpansion = (categoryId: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const getCategorySelectionStatus = (categoryId: string) => {
    const category = PRIVILEGE_CATEGORIES.find((c) => c.id === categoryId);
    if (!category) return { selected: 0, total: 0, allSelected: false };

    const categoryPrivilegeIds = category.privileges.map((p) => p.id);
    const selected = categoryPrivilegeIds.filter((id) =>
      selectedPrivileges.includes(id)
    ).length;
    return {
      selected,
      total: categoryPrivilegeIds.length,
      allSelected: selected === categoryPrivilegeIds.length && selected > 0,
      someSelected: selected > 0 && selected < categoryPrivilegeIds.length,
    };
  };

  // Count privileges requiring special qualification
  const specialQualificationCount = React.useMemo(() => {
    return PRIVILEGE_CATEGORIES.flatMap((c) => c.privileges)
      .filter(
        (p) => p.requiresSpecialQualification && selectedPrivileges.includes(p.id)
      ).length;
  }, [selectedPrivileges]);

  return (
    <div className="space-y-6">
      {/* Description */}
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        {t("description")}
      </p>

      {/* Search and Summary Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("searchPrivileges")}
            icon={<Search className="h-4 w-4" />}
          />
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t("selectedCount", { count: selectedPrivileges.length })}
          </span>
        </div>
      </div>

      {/* Warning for special qualifications */}
      {specialQualificationCount > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 dark:bg-amber-900/20 dark:border-amber-800">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-700 dark:text-amber-300">
              <strong>
                {isRTL ? "تنبيه:" : "Warning:"}
              </strong>{" "}
              {isRTL
                ? `لقد اخترت ${specialQualificationCount} امتياز(ات) تتطلب مؤهلات خاصة. يرجى التأكد من رفع الشهادات والمؤهلات اللازمة.`
                : `You have selected ${specialQualificationCount} privilege(s) that require special qualifications. Please ensure you upload the necessary certifications.`}
            </div>
          </div>
        </div>
      )}

      {/* Category Tabs (Mobile) */}
      <div className="md:hidden">
        <Tabs defaultValue={PRIVILEGE_CATEGORIES[0].id} onValueChange={setActiveCategory}>
          <TabsList className="w-full overflow-x-auto flex-nowrap">
            {PRIVILEGE_CATEGORIES.map((category) => {
              const status = getCategorySelectionStatus(category.id);
              return (
                <TabsTrigger key={category.id} value={category.id} className="relative">
                  {isRTL ? category.nameAr : category.nameEn}
                  {status.selected > 0 && (
                    <span className="ml-1.5 rtl:ml-0 rtl:mr-1.5 inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-primary-100 text-primary-700 text-xs font-medium dark:bg-primary-900 dark:text-primary-300">
                      {status.selected}
                    </span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
          {PRIVILEGE_CATEGORIES.map((category) => (
            <TabsContent key={category.id} value={category.id}>
              <PrivilegeList
                category={category}
                selectedPrivileges={selectedPrivileges}
                onToggle={handleTogglePrivilege}
                onSelectAll={() => handleSelectAllCategory(category.id)}
                searchQuery={searchQuery}
                filterPrivileges={filterPrivileges}
                isRTL={isRTL}
                t={t}
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Category Accordion (Desktop) */}
      <div className="hidden md:block space-y-4">
        {PRIVILEGE_CATEGORIES.map((category) => {
          const status = getCategorySelectionStatus(category.id);
          const isExpanded = expandedCategories.includes(category.id);
          const filteredPrivileges = filterPrivileges(category.privileges);

          if (searchQuery && filteredPrivileges.length === 0) {
            return null;
          }

          return (
            <div
              key={category.id}
              className="rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden"
            >
              {/* Category Header */}
              <div
                className={cn(
                  "flex items-center justify-between p-4 cursor-pointer transition-colors",
                  "bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800/50 dark:hover:bg-neutral-800"
                )}
                onClick={() => toggleCategoryExpansion(category.id)}
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectAllCategory(category.id);
                    }}
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded border-2 transition-colors",
                      status.allSelected
                        ? "border-primary-600 bg-primary-600 text-white"
                        : status.someSelected
                        ? "border-primary-600 bg-primary-100 dark:bg-primary-900"
                        : "border-neutral-300 bg-white dark:border-neutral-600 dark:bg-neutral-900"
                    )}
                    aria-label={
                      status.allSelected
                        ? t("deselectAll")
                        : t("selectAll")
                    }
                  >
                    {status.allSelected && (
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {status.someSelected && (
                      <div className="h-2 w-2 rounded-sm bg-primary-600" />
                    )}
                  </button>
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">
                    {isRTL ? category.nameAr : category.nameEn}
                  </span>
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">
                    ({status.selected}/{status.total})
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-neutral-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-neutral-400" />
                )}
              </div>

              {/* Privileges List */}
              {isExpanded && (
                <div className="p-4 pt-0 space-y-2">
                  <PrivilegeList
                    category={{ ...category, privileges: filteredPrivileges }}
                    selectedPrivileges={selectedPrivileges}
                    onToggle={handleTogglePrivilege}
                    onSelectAll={() => handleSelectAllCategory(category.id)}
                    searchQuery={searchQuery}
                    filterPrivileges={filterPrivileges}
                    isRTL={isRTL}
                    t={t}
                    hideHeader
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* No Results */}
      {searchQuery &&
        PRIVILEGE_CATEGORIES.every(
          (c) => filterPrivileges(c.privileges).length === 0
        ) && (
          <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
            {isRTL
              ? "لم يتم العثور على امتيازات مطابقة"
              : "No matching privileges found"}
          </div>
        )}
    </div>
  );
}

// Privilege List Component
interface PrivilegeListProps {
  category: (typeof PRIVILEGE_CATEGORIES)[0];
  selectedPrivileges: string[];
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  searchQuery: string;
  filterPrivileges: (
    privileges: (typeof PRIVILEGE_CATEGORIES)[0]["privileges"]
  ) => (typeof PRIVILEGE_CATEGORIES)[0]["privileges"];
  isRTL: boolean;
  t: ReturnType<typeof useTranslations>;
  hideHeader?: boolean;
}

function PrivilegeList({
  category,
  selectedPrivileges,
  onToggle,
  filterPrivileges,
  isRTL,
}: PrivilegeListProps) {
  const filteredPrivileges = filterPrivileges(category.privileges);

  if (filteredPrivileges.length === 0) {
    return (
      <div className="text-center py-4 text-neutral-500 dark:text-neutral-400">
        {isRTL ? "لا توجد نتائج" : "No results"}
      </div>
    );
  }

  return (
    <div className="space-y-2 pt-4">
      {filteredPrivileges.map((privilege) => {
        const isSelected = selectedPrivileges.includes(privilege.id);
        return (
          <div
            key={privilege.id}
            className={cn(
              "flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors",
              isSelected
                ? "bg-primary-50 dark:bg-primary-900/20"
                : "hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
            )}
            onClick={() => onToggle(privilege.id)}
          >
            <div className="flex items-center pt-0.5">
              <div
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all duration-200",
                  isSelected
                    ? "border-primary-600 bg-primary-600 text-white"
                    : "border-neutral-300 bg-white dark:border-neutral-600 dark:bg-neutral-900"
                )}
              >
                {isSelected && (
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400">
                  {privilege.code}
                </span>
                {privilege.requiresSpecialQualification && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">
                    <AlertTriangle className="h-3 w-3" />
                    {isRTL ? "مؤهل خاص" : "Special Qual."}
                  </span>
                )}
              </div>
              <p className="text-sm text-neutral-900 dark:text-neutral-100 mt-0.5">
                {isRTL ? privilege.nameAr : privilege.nameEn}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default StepPrivilegeSelection;
