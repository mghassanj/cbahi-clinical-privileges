"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Search,
  Check,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { PrivilegeCategory } from "@/lib/notifications/types";

export interface PrivilegeItem {
  /**
   * Unique identifier
   */
  id: string;
  /**
   * Privilege code
   */
  code: string;
  /**
   * Name in English
   */
  nameEn: string;
  /**
   * Name in Arabic
   */
  nameAr: string;
  /**
   * Category of the privilege
   */
  category: PrivilegeCategory;
  /**
   * Description in English
   */
  descriptionEn?: string;
  /**
   * Description in Arabic
   */
  descriptionAr?: string;
  /**
   * Whether this privilege requires special qualification
   */
  requiresQualification?: boolean;
  /**
   * Qualification message
   */
  qualificationNoteEn?: string;
  /**
   * Arabic qualification message
   */
  qualificationNoteAr?: string;
  /**
   * Whether this privilege is disabled
   */
  disabled?: boolean;
}

export interface PrivilegeCheckboxGroupProps {
  /**
   * List of available privileges
   */
  privileges: PrivilegeItem[];
  /**
   * Currently selected privilege IDs
   */
  selectedIds: string[];
  /**
   * Callback when selection changes
   */
  onChange: (selectedIds: string[]) => void;
  /**
   * Filter by category (optional)
   */
  category?: PrivilegeCategory;
  /**
   * Current locale
   * @default "en"
   */
  locale?: "en" | "ar";
  /**
   * Whether to show search filter
   * @default true
   */
  showSearch?: boolean;
  /**
   * Whether to show "Select All" option
   * @default true
   */
  showSelectAll?: boolean;
  /**
   * Whether to group by category
   * @default true
   */
  groupByCategory?: boolean;
  /**
   * Max height before scrolling (in pixels)
   */
  maxHeight?: number;
  /**
   * Additional class name
   */
  className?: string;
}

const CATEGORY_LABELS: Record<PrivilegeCategory, { en: string; ar: string }> = {
  [PrivilegeCategory.CLINICAL]: { en: "Clinical", ar: "السريرية" },
  [PrivilegeCategory.SURGICAL]: { en: "Surgical", ar: "الجراحية" },
  [PrivilegeCategory.DIAGNOSTIC]: { en: "Diagnostic", ar: "التشخيصية" },
  [PrivilegeCategory.ADMINISTRATIVE]: { en: "Administrative", ar: "الإدارية" },
  [PrivilegeCategory.CONSULTATION]: { en: "Consultation", ar: "الاستشارية" },
};

const CATEGORY_COLORS: Record<PrivilegeCategory, string> = {
  [PrivilegeCategory.CLINICAL]: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  [PrivilegeCategory.SURGICAL]: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  [PrivilegeCategory.DIAGNOSTIC]: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  [PrivilegeCategory.ADMINISTRATIVE]: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  [PrivilegeCategory.CONSULTATION]: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
};

/**
 * Grouped checkbox component for privilege selection.
 * Features search, select all, category grouping, and qualification warnings.
 */
const PrivilegeCheckboxGroup: React.FC<PrivilegeCheckboxGroupProps> = ({
  privileges,
  selectedIds,
  onChange,
  category,
  locale = "en",
  showSearch = true,
  showSelectAll = true,
  groupByCategory = true,
  maxHeight = 400,
  className,
}) => {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [expandedCategories, setExpandedCategories] = React.useState<Set<PrivilegeCategory>>(
    new Set(Object.values(PrivilegeCategory))
  );

  const isArabic = locale === "ar";

  // Filter privileges by category and search query
  const filteredPrivileges = React.useMemo(() => {
    let filtered = privileges;

    // Filter by category if specified
    if (category) {
      filtered = filtered.filter((p) => p.category === category);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.code.toLowerCase().includes(query) ||
          p.nameEn.toLowerCase().includes(query) ||
          p.nameAr.includes(query) ||
          (p.descriptionEn && p.descriptionEn.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [privileges, category, searchQuery]);

  // Group privileges by category
  const groupedPrivileges = React.useMemo(() => {
    if (!groupByCategory) {
      return { all: filteredPrivileges };
    }

    return filteredPrivileges.reduce((acc, privilege) => {
      const cat = privilege.category;
      if (!acc[cat]) {
        acc[cat] = [];
      }
      acc[cat].push(privilege);
      return acc;
    }, {} as Record<string, PrivilegeItem[]>);
  }, [filteredPrivileges, groupByCategory]);

  // Check if all visible privileges are selected
  const allSelected =
    filteredPrivileges.length > 0 &&
    filteredPrivileges.every((p) => selectedIds.includes(p.id) || p.disabled);

  // Check if some but not all are selected
  const someSelected =
    filteredPrivileges.some((p) => selectedIds.includes(p.id)) && !allSelected;

  const handleSelectAll = () => {
    if (allSelected) {
      // Deselect all visible privileges
      const visibleIds = new Set(filteredPrivileges.map((p) => p.id));
      onChange(selectedIds.filter((id) => !visibleIds.has(id)));
    } else {
      // Select all non-disabled visible privileges
      const newIds = new Set(selectedIds);
      filteredPrivileges.forEach((p) => {
        if (!p.disabled) {
          newIds.add(p.id);
        }
      });
      onChange(Array.from(newIds));
    }
  };

  const handleToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((i) => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const toggleCategory = (cat: PrivilegeCategory) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(cat)) {
      newExpanded.delete(cat);
    } else {
      newExpanded.add(cat);
    }
    setExpandedCategories(newExpanded);
  };

  const renderCheckbox = (privilege: PrivilegeItem) => {
    const isSelected = selectedIds.includes(privilege.id);

    return (
      <label
        key={privilege.id}
        className={cn(
          "flex items-start gap-3 p-3 rounded-lg cursor-pointer",
          "transition-colors duration-150",
          "hover:bg-neutral-50 dark:hover:bg-neutral-800/50",
          isSelected && "bg-primary-50/50 dark:bg-primary-900/20",
          privilege.disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        {/* Checkbox */}
        <div className="flex-shrink-0 mt-0.5">
          <input
            type="checkbox"
            checked={isSelected}
            disabled={privilege.disabled}
            onChange={() => !privilege.disabled && handleToggle(privilege.id)}
            className={cn(
              "h-5 w-5 rounded border-2 transition-colors",
              "border-neutral-300 dark:border-neutral-600",
              "text-primary-600 focus:ring-primary-500",
              "disabled:cursor-not-allowed"
            )}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Code badge */}
            <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
              {privilege.code}
            </span>

            {/* Qualification warning */}
            {privilege.requiresQualification && (
              <span
                className="inline-flex items-center gap-1 text-xs text-warning-600 dark:text-warning-400"
                title={
                  isArabic
                    ? privilege.qualificationNoteAr || "يتطلب مؤهلات خاصة"
                    : privilege.qualificationNoteEn || "Requires special qualification"
                }
              >
                <AlertTriangle size={12} />
              </span>
            )}
          </div>

          {/* Name */}
          <p
            className={cn(
              "mt-1 font-medium text-neutral-900 dark:text-neutral-100",
              isArabic && "font-arabic"
            )}
          >
            {isArabic ? privilege.nameAr : privilege.nameEn}
          </p>

          {/* Description */}
          {(privilege.descriptionEn || privilege.descriptionAr) && (
            <p
              className={cn(
                "mt-0.5 text-sm text-neutral-500 dark:text-neutral-400",
                isArabic && "font-arabic"
              )}
            >
              {isArabic
                ? privilege.descriptionAr || privilege.descriptionEn
                : privilege.descriptionEn}
            </p>
          )}

          {/* Qualification note */}
          {privilege.requiresQualification && (
            <p className="mt-1 text-xs text-warning-600 dark:text-warning-400 flex items-center gap-1">
              <AlertTriangle size={12} />
              {isArabic
                ? privilege.qualificationNoteAr || "يتطلب مؤهلات خاصة"
                : privilege.qualificationNoteEn || "Requires special qualification"}
            </p>
          )}
        </div>
      </label>
    );
  };

  const renderCategoryGroup = (cat: PrivilegeCategory, items: PrivilegeItem[]) => {
    const isExpanded = expandedCategories.has(cat);
    const selectedInCategory = items.filter((p) => selectedIds.includes(p.id)).length;

    return (
      <div key={cat} className="border-b border-neutral-200 dark:border-neutral-700 last:border-b-0">
        <button
          type="button"
          onClick={() => toggleCategory(cat)}
          className={cn(
            "w-full flex items-center justify-between p-3",
            "hover:bg-neutral-50 dark:hover:bg-neutral-800/50",
            "transition-colors duration-150"
          )}
        >
          <div className="flex items-center gap-2">
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <span
              className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                CATEGORY_COLORS[cat]
              )}
            >
              {isArabic ? CATEGORY_LABELS[cat].ar : CATEGORY_LABELS[cat].en}
            </span>
          </div>
          <span className="text-sm text-neutral-500 dark:text-neutral-400">
            {selectedInCategory}/{items.length} {isArabic ? "محدد" : "selected"}
          </span>
        </button>

        {isExpanded && (
          <div className="pl-6 rtl:pl-0 rtl:pr-6">
            {items.map(renderCheckbox)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={cn("rounded-lg border border-neutral-200 dark:border-neutral-700", className)}
      dir={isArabic ? "rtl" : "ltr"}
    >
      {/* Header with search and select all */}
      <div className="p-3 border-b border-neutral-200 dark:border-neutral-700 space-y-3">
        {/* Search */}
        {showSearch && (
          <div className="relative">
            <Search
              size={16}
              className={cn(
                "absolute top-1/2 -translate-y-1/2 text-neutral-400",
                "ltr:left-3 rtl:right-3"
              )}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isArabic ? "البحث في الصلاحيات..." : "Search privileges..."}
              className={cn(
                "w-full py-2 rounded-lg",
                "ltr:pl-10 ltr:pr-4 rtl:pr-10 rtl:pl-4",
                "bg-neutral-50 dark:bg-neutral-800",
                "border border-neutral-200 dark:border-neutral-700",
                "text-neutral-900 dark:text-neutral-100",
                "placeholder-neutral-400 dark:placeholder-neutral-500",
                "focus:outline-none focus:ring-2 focus:ring-primary-500",
                isArabic && "font-arabic text-right"
              )}
            />
          </div>
        )}

        {/* Select all */}
        {showSelectAll && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) {
                  el.indeterminate = someSelected;
                }
              }}
              onChange={handleSelectAll}
              className={cn(
                "h-4 w-4 rounded border-2 transition-colors",
                "border-neutral-300 dark:border-neutral-600",
                "text-primary-600 focus:ring-primary-500"
              )}
            />
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {isArabic ? "تحديد الكل" : "Select All"}
            </span>
            <span className="text-sm text-neutral-500">
              ({selectedIds.length}/{filteredPrivileges.filter((p) => !p.disabled).length})
            </span>
          </label>
        )}
      </div>

      {/* Privileges list */}
      <div
        className="overflow-y-auto"
        style={{ maxHeight: maxHeight ? `${maxHeight}px` : undefined }}
      >
        {filteredPrivileges.length === 0 ? (
          <div className="p-8 text-center text-neutral-500 dark:text-neutral-400">
            {isArabic ? "لا توجد صلاحيات متاحة" : "No privileges found"}
          </div>
        ) : groupByCategory ? (
          Object.entries(groupedPrivileges).map(([cat, items]) =>
            renderCategoryGroup(cat as PrivilegeCategory, items)
          )
        ) : (
          <div className="p-2">{filteredPrivileges.map(renderCheckbox)}</div>
        )}
      </div>
    </div>
  );
};

PrivilegeCheckboxGroup.displayName = "PrivilegeCheckboxGroup";

export { PrivilegeCheckboxGroup };
