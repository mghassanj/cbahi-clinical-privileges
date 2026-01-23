"use client";

import { useTranslations } from "next-intl";

export default function DashboardPage() {
  const t = useTranslations("dashboard");

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-neutral-900">{t("title")}</h1>
      <p className="mt-2 text-neutral-600">{t("overview")}</p>

      {/* Dashboard content will be implemented */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Placeholder cards */}
        <div className="card p-6">
          <h3 className="text-sm font-medium text-neutral-500">
            {t("totalPractitioners")}
          </h3>
          <p className="mt-2 text-3xl font-bold text-neutral-900">--</p>
        </div>
        <div className="card p-6">
          <h3 className="text-sm font-medium text-neutral-500">
            {t("activePrivileges")}
          </h3>
          <p className="mt-2 text-3xl font-bold text-neutral-900">--</p>
        </div>
        <div className="card p-6">
          <h3 className="text-sm font-medium text-neutral-500">
            {t("pendingApplications")}
          </h3>
          <p className="mt-2 text-3xl font-bold text-neutral-900">--</p>
        </div>
        <div className="card p-6">
          <h3 className="text-sm font-medium text-neutral-500">
            {t("expiringPrivileges")}
          </h3>
          <p className="mt-2 text-3xl font-bold text-neutral-900">--</p>
        </div>
      </div>
    </div>
  );
}
