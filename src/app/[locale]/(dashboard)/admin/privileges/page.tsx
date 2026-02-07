"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Check,
  X,
  RefreshCw,
} from "lucide-react";

interface Privilege {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  category: string;
  description?: string;
  requiresSpecialQualification: boolean;
  isActive: boolean;
  _count?: { requestedPrivileges: number };
}

const CATEGORIES = [
  'CORE', 'RESTORATIVE', 'PEDIATRIC', 'ORTHODONTICS', 'ENDODONTICS',
  'PERIODONTICS', 'PROSTHODONTICS', 'ORAL_SURGERY', 'ORAL_MEDICINE',
  'RADIOLOGY', 'DIAGNOSTIC', 'PREVENTIVE', 'IMPLANT', 'COSMETIC', 'OTHER'
];

export default function PrivilegesAdminPage() {
  const t = useTranslations();
  const locale = useLocale();
  const isRTL = locale === "ar";

  const [privileges, setPrivileges] = React.useState<Privilege[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("");
  const [showInactive, setShowInactive] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [formData, setFormData] = React.useState<Partial<Privilege>>({});
  const [error, setError] = React.useState<string | null>(null);

  const fetchPrivileges = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (categoryFilter) params.append("category", categoryFilter);
      if (!showInactive) params.append("isActive", "true");

      const res = await fetch(`/api/admin/privileges?${params}`);
      const data = await res.json();
      setPrivileges(data.privileges || []);
    } catch {
      setError("Failed to load privileges");
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, showInactive]);

  React.useEffect(() => {
    fetchPrivileges();
  }, [fetchPrivileges]);

  const handleCreate = async () => {
    try {
      const res = await fetch("/api/admin/privileges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create");
      }

      setShowCreateModal(false);
      setFormData({});
      fetchPrivileges();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/privileges/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update");
      }

      setEditingId(null);
      setFormData({});
      fetchPrivileges();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this privilege?")) return;

    try {
      const res = await fetch(`/api/admin/privileges/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }

      fetchPrivileges();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const startEdit = (privilege: Privilege) => {
    setEditingId(privilege.id);
    setFormData(privilege);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            {t("admin.privileges.title")}
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {t("admin.privileges.description")}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Plus className={cn("h-4 w-4", isRTL && "ml-2")} />
          {t("admin.privileges.add")}
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="rounded-lg bg-error-50 p-4 text-error-700 dark:bg-error-900/20 dark:text-error-400">
          {error}
          <button onClick={() => setError(null)} className="ml-2">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className={cn("absolute top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400", isRTL ? "right-3" : "left-3")} />
          <input
            type="text"
            placeholder={isRTL ? "البحث في الصلاحيات..." : "Search privileges..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn("w-full rounded-lg border border-neutral-200 bg-white py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800", isRTL ? "pr-10 pl-4" : "pl-10 pr-4")}
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
        >
          <option value="">{isRTL ? "جميع الفئات" : "All Categories"}</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-neutral-300"
          />
          {isRTL ? "إظهار غير النشط" : "Show Inactive"}
        </label>
        <button
          onClick={fetchPrivileges}
          className="rounded-lg border border-neutral-200 p-2 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-800">
            <tr>
              <th className={cn("px-4 py-3 font-medium", isRTL ? "text-right" : "text-left")}>{t("admin.privileges.code")}</th>
              <th className={cn("px-4 py-3 font-medium", isRTL ? "text-right" : "text-left")}>{t("admin.privileges.nameEn")}</th>
              <th className={cn("px-4 py-3 font-medium", isRTL ? "text-right" : "text-left")}>{t("admin.privileges.nameAr")}</th>
              <th className={cn("px-4 py-3 font-medium", isRTL ? "text-right" : "text-left")}>{t("admin.privileges.category")}</th>
              <th className="px-4 py-3 text-center font-medium">{t("admin.privileges.specialQualification")}</th>
              <th className="px-4 py-3 text-center font-medium">{t("admin.privileges.status")}</th>
              <th className="px-4 py-3 text-center font-medium">{t("admin.privileges.actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center">
                  <RefreshCw className="mx-auto h-6 w-6 animate-spin text-neutral-400" />
                </td>
              </tr>
            ) : privileges.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-neutral-500">
                  {isRTL ? "لم يتم العثور على صلاحيات" : "No privileges found"}
                </td>
              </tr>
            ) : (
              privileges.map((priv) => (
                <tr key={priv.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                  <td className="px-4 py-3 font-mono text-xs">{priv.code}</td>
                  <td className="px-4 py-3">{priv.nameEn}</td>
                  <td className="px-4 py-3 text-right" dir="rtl">{priv.nameAr}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs dark:bg-neutral-700">
                      {priv.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {priv.requiresSpecialQualification ? (
                      <Check className="mx-auto h-4 w-4 text-success-500" />
                    ) : (
                      <X className="mx-auto h-4 w-4 text-neutral-300" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn(
                      "rounded-full px-2 py-1 text-xs",
                      priv.isActive
                        ? "bg-success-100 text-success-700 dark:bg-success-900/20 dark:text-success-400"
                        : "bg-neutral-100 text-neutral-500 dark:bg-neutral-700"
                    )}>
                      {priv.isActive ? t("admin.privileges.active") : t("admin.privileges.inactive")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => startEdit(priv)}
                        className="rounded p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(priv.id)}
                        className="rounded p-1 text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingId) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 dark:bg-neutral-900">
            <h2 className="text-lg font-bold mb-4">
              {editingId ? t("admin.privileges.edit") : t("admin.privileges.add")}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t("admin.privileges.code")}</label>
                <input
                  type="text"
                  value={formData.code || ""}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t("admin.privileges.nameEn")}</label>
                <input
                  type="text"
                  value={formData.nameEn || ""}
                  onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t("admin.privileges.nameAr")}</label>
                <input
                  type="text"
                  dir="rtl"
                  value={formData.nameAr || ""}
                  onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t("admin.privileges.category")}</label>
                <select
                  value={formData.category || ""}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
                >
                  <option value="">{isRTL ? "اختر الفئة" : "Select Category"}</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t("admin.privileges.privilegeDescription")}</label>
                <textarea
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
                  rows={3}
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.requiresSpecialQualification || false}
                    onChange={(e) => setFormData({ ...formData, requiresSpecialQualification: e.target.checked })}
                    className="rounded"
                  />
                  {t("admin.privileges.specialQualification")}
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive !== false}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded"
                  />
                  {t("admin.privileges.active")}
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingId(null);
                  setFormData({});
                }}
                className="rounded-lg border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() => editingId ? handleUpdate(editingId) : handleCreate()}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700"
              >
                {editingId ? t("common.save") : t("common.create")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
