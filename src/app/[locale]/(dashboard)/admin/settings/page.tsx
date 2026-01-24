"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  LiquidGlassCard,
  LiquidGlassCardContent,
  LiquidGlassCardHeader,
  LiquidGlassCardTitle,
} from "@/components/custom/liquid-glass-card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  Building2,
  Mail,
  FileText,
  AlertTriangle,
  Save,
  RefreshCw,
  Send,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
} from "lucide-react";

interface SettingsFormState {
  isDirty: boolean;
  isSaving: boolean;
}

export default function SettingsPage() {
  const t = useTranslations();

  const [activeTab, setActiveTab] = React.useState("general");
  const [formState, setFormState] = React.useState<SettingsFormState>({
    isDirty: false,
    isSaving: false,
  });

  const handleSave = async () => {
    setFormState((prev) => ({ ...prev, isSaving: true }));
    try {
      const response = await fetch("/api/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Settings would be gathered from form state
          updatedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save settings");
      }

      toast.success(t("admin.settings.messages.saveSuccess"));
      setFormState({ isDirty: false, isSaving: false });
    } catch (err) {
      console.error("Error saving settings:", err);
      toast.error(t("admin.settings.messages.saveFailed"));
      setFormState((prev) => ({ ...prev, isSaving: false }));
    }
  };

  const markDirty = () => {
    if (!formState.isDirty) {
      setFormState((prev) => ({ ...prev, isDirty: true }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            {t("admin.settings.title")}
          </h1>
          <p className="mt-1 text-neutral-500 dark:text-neutral-400">
            {t("admin.settings.description")}
          </p>
        </div>
        {formState.isDirty && (
          <Button onClick={handleSave} isLoading={formState.isSaving}>
            <Save className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
            {t("common.actions.save")}
          </Button>
        )}
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="general" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="general">
            <Settings className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
            {t("admin.settings.tabs.general")}
          </TabsTrigger>
          <TabsTrigger value="jisr">
            <Building2 className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
            {t("admin.settings.tabs.jisr")}
          </TabsTrigger>
          <TabsTrigger value="email">
            <Mail className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
            {t("admin.settings.tabs.email")}
          </TabsTrigger>
          <TabsTrigger value="google">
            <FileText className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
            {t("admin.settings.tabs.google")}
          </TabsTrigger>
          <TabsTrigger value="escalation">
            <AlertTriangle className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
            {t("admin.settings.tabs.escalation")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <GeneralSettings onDirty={markDirty} />
        </TabsContent>

        <TabsContent value="jisr" className="mt-6">
          <JisrSettings onDirty={markDirty} />
        </TabsContent>

        <TabsContent value="email" className="mt-6">
          <EmailSettings onDirty={markDirty} />
        </TabsContent>

        <TabsContent value="google" className="mt-6">
          <GoogleSettings onDirty={markDirty} />
        </TabsContent>

        <TabsContent value="escalation" className="mt-6">
          <EscalationSettings onDirty={markDirty} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// General Settings Tab
function GeneralSettings({
  onDirty,
}: {
  onDirty: () => void;
}) {
  const t = useTranslations();
  const [appName, setAppName] = React.useState("CBAHI Clinical Privileges");
  const [appNameAr, setAppNameAr] = React.useState("امتيازات سباهي السريرية");
  const [defaultLanguage, setDefaultLanguage] = React.useState("en");
  const [sessionTimeout, setSessionTimeout] = React.useState("30");
  const [dateFormat, setDateFormat] = React.useState("DD/MM/YYYY");

  return (
    <LiquidGlassCard>
      <LiquidGlassCardHeader>
        <LiquidGlassCardTitle>
          <Settings className="mr-2 h-5 w-5 rtl:ml-2 rtl:mr-0" />
          {t("admin.settings.generalSettings.title")}
        </LiquidGlassCardTitle>
      </LiquidGlassCardHeader>
      <LiquidGlassCardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t("admin.settings.generalSettings.appNameEn")}
            </label>
            <Input
              value={appName}
              onChange={(e) => {
                setAppName(e.target.value);
                onDirty();
              }}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t("admin.settings.generalSettings.appNameAr")}
            </label>
            <Input
              value={appNameAr}
              onChange={(e) => {
                setAppNameAr(e.target.value);
                onDirty();
              }}
              dir="rtl"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t("admin.settings.generalSettings.defaultLanguage")}
            </label>
            <Select
              value={defaultLanguage}
              onChange={(e) => {
                setDefaultLanguage(e.target.value);
                onDirty();
              }}
            >
              <option value="en">English</option>
              <option value="ar">العربية</option>
            </Select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t("admin.settings.generalSettings.sessionTimeout")}
            </label>
            <Input
              type="number"
              value={sessionTimeout}
              onChange={(e) => {
                setSessionTimeout(e.target.value);
                onDirty();
              }}
              min="5"
              max="120"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t("admin.settings.generalSettings.dateFormat")}
            </label>
            <Select
              value={dateFormat}
              onChange={(e) => {
                setDateFormat(e.target.value);
                onDirty();
              }}
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </Select>
          </div>
        </div>
      </LiquidGlassCardContent>
    </LiquidGlassCard>
  );
}

// Jisr HR Settings Tab
function JisrSettings({
  onDirty,
}: {
  onDirty: () => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const [apiUrl, setApiUrl] = React.useState("https://api.jisr.net/v1");
  const [apiKey, setApiKey] = React.useState("••••••••••••••••");
  const [showApiKey, setShowApiKey] = React.useState(false);
  const [syncInterval, setSyncInterval] = React.useState("60");
  const [lastSync, setLastSync] = React.useState<Date | null>(new Date(Date.now() - 1000 * 60 * 15));
  const [syncStatus, setSyncStatus] = React.useState<"success" | "error" | "syncing">("success");
  const [isSyncing, setIsSyncing] = React.useState(false);

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncStatus("syncing");
    try {
      const response = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullSync: true }),
      });

      if (!response.ok) {
        throw new Error("Sync failed");
      }

      const result = await response.json();
      setLastSync(new Date());
      setSyncStatus("success");
      toast.success(t("admin.settings.jisrSettings.syncSuccess", { count: result.data?.users?.recordsUpdated || 0 }));
    } catch (err) {
      console.error("Sync error:", err);
      setSyncStatus("error");
      toast.error(t("admin.settings.jisrSettings.syncFailed"));
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <LiquidGlassCard>
      <LiquidGlassCardHeader>
        <LiquidGlassCardTitle>
          <Building2 className="mr-2 h-5 w-5 rtl:ml-2 rtl:mr-0" />
          {t("admin.settings.jisrSettings.title")}
        </LiquidGlassCardTitle>
      </LiquidGlassCardHeader>
      <LiquidGlassCardContent className="space-y-6">
        {/* Connection Status */}
        <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/50">
          <div className="flex items-center gap-3">
            {syncStatus === "success" ? (
              <CheckCircle className="h-5 w-5 text-success-600" />
            ) : syncStatus === "error" ? (
              <XCircle className="h-5 w-5 text-error-600" />
            ) : (
              <RefreshCw className="h-5 w-5 animate-spin text-primary-600" />
            )}
            <div>
              <p className="font-medium text-neutral-900 dark:text-white">
                {t("admin.settings.jisrSettings.connectionStatus")}
              </p>
              <p className="text-sm text-neutral-500">
                {lastSync
                  ? `${t("admin.settings.jisrSettings.lastSync")} ${lastSync.toLocaleTimeString(locale === "ar" ? "ar-SA" : undefined)}`
                  : t("admin.settings.jisrSettings.neverSynced")}
              </p>
            </div>
          </div>
          <Badge variant={syncStatus === "success" ? "success" : syncStatus === "error" ? "error" : "warning"}>
            {syncStatus === "success"
              ? t("admin.settings.jisrSettings.connected")
              : syncStatus === "error"
              ? t("admin.settings.jisrSettings.error")
              : t("admin.settings.jisrSettings.syncing")}
          </Badge>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t("admin.settings.jisrSettings.apiUrl")}
            </label>
            <Input
              value={apiUrl}
              onChange={(e) => {
                setApiUrl(e.target.value);
                onDirty();
              }}
              placeholder="https://api.jisr.net/v1"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t("admin.settings.jisrSettings.apiKey")}
            </label>
            <div className="flex gap-2">
              <Input
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  onDirty();
                }}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t("admin.settings.jisrSettings.syncInterval")}
            </label>
            <Select
              value={syncInterval}
              onChange={(e) => {
                setSyncInterval(e.target.value);
                onDirty();
              }}
            >
              <option value="15">15 {t("admin.settings.time.minutes")}</option>
              <option value="30">30 {t("admin.settings.time.minutes")}</option>
              <option value="60">1 {t("admin.settings.time.hour")}</option>
              <option value="120">2 {t("admin.settings.time.hours")}</option>
              <option value="360">6 {t("admin.settings.time.hours")}</option>
              <option value="720">12 {t("admin.settings.time.hours")}</option>
              <option value="1440">24 {t("admin.settings.time.hours")}</option>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={handleManualSync}
              isLoading={isSyncing}
              className="w-full"
            >
              <RefreshCw className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
              {t("admin.settings.jisrSettings.syncNow")}
            </Button>
          </div>
        </div>
      </LiquidGlassCardContent>
    </LiquidGlassCard>
  );
}

// Email Settings Tab
function EmailSettings({
  onDirty,
}: {
  onDirty: () => void;
}) {
  const t = useTranslations();
  const [provider, setProvider] = React.useState("smtp");
  const [smtpHost, setSmtpHost] = React.useState("smtp.office365.com");
  const [smtpPort, setSmtpPort] = React.useState("587");
  const [smtpUser, setSmtpUser] = React.useState("noreply@hospital.com");
  const [smtpPassword, setSmtpPassword] = React.useState("••••••••");
  const [showPassword, setShowPassword] = React.useState(false);
  const [graphTenantId, setGraphTenantId] = React.useState("");
  const [graphClientId, setGraphClientId] = React.useState("");
  const [graphClientSecret, setGraphClientSecret] = React.useState("");
  const [fromEmail, setFromEmail] = React.useState("noreply@hospital.com");
  const [fromName, setFromName] = React.useState("CBAHI Privileges");
  const [isTesting, setIsTesting] = React.useState(false);
  const [testResult, setTestResult] = React.useState<"success" | "error" | null>(null);

  const handleTestEmail = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const response = await fetch("/api/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          config: provider === "smtp"
            ? { host: smtpHost, port: smtpPort, user: smtpUser, password: smtpPassword }
            : { tenantId: graphTenantId, clientId: graphClientId, clientSecret: graphClientSecret },
          from: { email: fromEmail, name: fromName },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send test email");
      }

      setTestResult("success");
      toast.success(t("admin.settings.emailSettings.testEmailSuccess"));
    } catch (err) {
      console.error("Test email error:", err);
      setTestResult("error");
      toast.error(t("admin.settings.emailSettings.testEmailFailed"));
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <LiquidGlassCard>
      <LiquidGlassCardHeader>
        <LiquidGlassCardTitle>
          <Mail className="mr-2 h-5 w-5 rtl:ml-2 rtl:mr-0" />
          {t("admin.settings.emailSettings.title")}
        </LiquidGlassCardTitle>
      </LiquidGlassCardHeader>
      <LiquidGlassCardContent className="space-y-6">
        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t("admin.settings.emailSettings.provider")}
          </label>
          <Select
            value={provider}
            onChange={(e) => {
              setProvider(e.target.value);
              onDirty();
            }}
          >
            <option value="smtp">SMTP</option>
            <option value="graph">Microsoft Graph API</option>
          </Select>
        </div>

        {provider === "smtp" ? (
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {t("admin.settings.emailSettings.smtpHost")}
              </label>
              <Input
                value={smtpHost}
                onChange={(e) => {
                  setSmtpHost(e.target.value);
                  onDirty();
                }}
                placeholder="smtp.example.com"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {t("admin.settings.emailSettings.smtpPort")}
              </label>
              <Input
                value={smtpPort}
                onChange={(e) => {
                  setSmtpPort(e.target.value);
                  onDirty();
                }}
                placeholder="587"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {t("admin.settings.emailSettings.username")}
              </label>
              <Input
                value={smtpUser}
                onChange={(e) => {
                  setSmtpUser(e.target.value);
                  onDirty();
                }}
                placeholder="user@example.com"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {t("admin.settings.emailSettings.password")}
              </label>
              <div className="flex gap-2">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={smtpPassword}
                  onChange={(e) => {
                    setSmtpPassword(e.target.value);
                    onDirty();
                  }}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {t("admin.settings.emailSettings.tenantId")}
              </label>
              <Input
                value={graphTenantId}
                onChange={(e) => {
                  setGraphTenantId(e.target.value);
                  onDirty();
                }}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {t("admin.settings.emailSettings.clientId")}
              </label>
              <Input
                value={graphClientId}
                onChange={(e) => {
                  setGraphClientId(e.target.value);
                  onDirty();
                }}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {t("admin.settings.emailSettings.clientSecret")}
              </label>
              <Input
                type="password"
                value={graphClientSecret}
                onChange={(e) => {
                  setGraphClientSecret(e.target.value);
                  onDirty();
                }}
              />
            </div>
          </div>
        )}

        <hr className="border-neutral-200 dark:border-neutral-700" />

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t("admin.settings.emailSettings.fromEmail")}
            </label>
            <Input
              value={fromEmail}
              onChange={(e) => {
                setFromEmail(e.target.value);
                onDirty();
              }}
              placeholder="noreply@example.com"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t("admin.settings.emailSettings.fromName")}
            </label>
            <Input
              value={fromName}
              onChange={(e) => {
                setFromName(e.target.value);
                onDirty();
              }}
              placeholder="System Notifications"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={handleTestEmail}
            isLoading={isTesting}
          >
            <Send className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
            {t("admin.settings.emailSettings.sendTestEmail")}
          </Button>
          {testResult === "success" && (
            <div className="flex items-center gap-2 text-success-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">
                {t("admin.settings.emailSettings.testEmailSuccess")}
              </span>
            </div>
          )}
          {testResult === "error" && (
            <div className="flex items-center gap-2 text-error-600">
              <XCircle className="h-4 w-4" />
              <span className="text-sm">
                {t("admin.settings.emailSettings.testEmailFailed")}
              </span>
            </div>
          )}
        </div>
      </LiquidGlassCardContent>
    </LiquidGlassCard>
  );
}

// Google Drive Settings Tab
function GoogleSettings({
  onDirty,
}: {
  onDirty: () => void;
}) {
  const t = useTranslations();
  const [serviceAccountEmail, setServiceAccountEmail] = React.useState(
    "cbahi-service@cbahi-project.iam.gserviceaccount.com"
  );
  const [privateKey, setPrivateKey] = React.useState("••••••••••••••••");
  const [driveFolderId, setDriveFolderId] = React.useState("1AbCdEfGhIjKlMnOpQrStUvWxYz");
  const [certificateTemplateId, setCertificateTemplateId] = React.useState("");
  const [reportTemplateId, setReportTemplateId] = React.useState("");
  const [connectionStatus, setConnectionStatus] = React.useState<"connected" | "disconnected" | "testing">("connected");

  const handleTestConnection = async () => {
    setConnectionStatus("testing");
    try {
      const response = await fetch("/api/google/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceAccountEmail,
          privateKey: privateKey.startsWith("•") ? undefined : privateKey,
          driveFolderId,
        }),
      });

      if (!response.ok) {
        throw new Error("Connection test failed");
      }

      setConnectionStatus("connected");
      toast.success(t("admin.settings.googleSettings.connectionSuccess"));
    } catch (err) {
      console.error("Google connection test error:", err);
      setConnectionStatus("disconnected");
      toast.error(t("admin.settings.googleSettings.connectionFailed"));
    }
  };

  return (
    <LiquidGlassCard>
      <LiquidGlassCardHeader>
        <LiquidGlassCardTitle>
          <FileText className="mr-2 h-5 w-5 rtl:ml-2 rtl:mr-0" />
          {t("admin.settings.googleSettings.title")}
        </LiquidGlassCardTitle>
      </LiquidGlassCardHeader>
      <LiquidGlassCardContent className="space-y-6">
        {/* Connection Status */}
        <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/50">
          <div className="flex items-center gap-3">
            {connectionStatus === "connected" ? (
              <CheckCircle className="h-5 w-5 text-success-600" />
            ) : connectionStatus === "disconnected" ? (
              <XCircle className="h-5 w-5 text-error-600" />
            ) : (
              <RefreshCw className="h-5 w-5 animate-spin text-primary-600" />
            )}
            <div>
              <p className="font-medium text-neutral-900 dark:text-white">
                {t("admin.settings.googleSettings.connectionStatus")}
              </p>
              <p className="text-sm text-neutral-500">
                {t("admin.settings.googleSettings.serviceAccount")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge
              variant={
                connectionStatus === "connected"
                  ? "success"
                  : connectionStatus === "disconnected"
                  ? "error"
                  : "warning"
              }
            >
              {connectionStatus === "connected"
                ? t("admin.settings.googleSettings.connected")
                : connectionStatus === "disconnected"
                ? t("admin.settings.googleSettings.disconnected")
                : t("admin.settings.googleSettings.testing")}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={connectionStatus === "testing"}
            >
              {t("admin.settings.googleSettings.test")}
            </Button>
          </div>
        </div>

        <div className="grid gap-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t("admin.settings.googleSettings.serviceAccountEmail")}
            </label>
            <Input
              value={serviceAccountEmail}
              onChange={(e) => {
                setServiceAccountEmail(e.target.value);
                onDirty();
              }}
              placeholder="service-account@project.iam.gserviceaccount.com"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t("admin.settings.googleSettings.privateKey")}
            </label>
            <Input
              type="password"
              value={privateKey}
              onChange={(e) => {
                setPrivateKey(e.target.value);
                onDirty();
              }}
              placeholder="-----BEGIN PRIVATE KEY-----"
            />
            <p className="mt-1 text-xs text-neutral-500">
              {t("admin.settings.googleSettings.privateKeyHint")}
            </p>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t("admin.settings.googleSettings.driveFolderId")}
            </label>
            <Input
              value={driveFolderId}
              onChange={(e) => {
                setDriveFolderId(e.target.value);
                onDirty();
              }}
              placeholder="1AbCdEfGhIjKlMnOpQrStUvWxYz"
            />
            <p className="mt-1 text-xs text-neutral-500">
              {t("admin.settings.googleSettings.driveFolderHint")}
            </p>
          </div>
        </div>

        <hr className="border-neutral-200 dark:border-neutral-700" />

        <div>
          <h3 className="mb-4 font-medium text-neutral-900 dark:text-white">
            {t("admin.settings.googleSettings.templateIds")}
          </h3>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {t("admin.settings.googleSettings.certificateTemplate")}
              </label>
              <Input
                value={certificateTemplateId}
                onChange={(e) => {
                  setCertificateTemplateId(e.target.value);
                  onDirty();
                }}
                placeholder="Google Docs ID"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {t("admin.settings.googleSettings.reportTemplate")}
              </label>
              <Input
                value={reportTemplateId}
                onChange={(e) => {
                  setReportTemplateId(e.target.value);
                  onDirty();
                }}
                placeholder="Google Docs ID"
              />
            </div>
          </div>
        </div>
      </LiquidGlassCardContent>
    </LiquidGlassCard>
  );
}

// Escalation Settings Tab
function EscalationSettings({
  onDirty,
}: {
  onDirty: () => void;
}) {
  const t = useTranslations();
  const [warningThreshold, setWarningThreshold] = React.useState("3");
  const [escalationThreshold, setEscalationThreshold] = React.useState("5");
  const [hrEscalationEmail, setHrEscalationEmail] = React.useState("hr@hospital.com");
  const [adminEscalationEmail, setAdminEscalationEmail] = React.useState("admin@hospital.com");
  const [enableAutoReminders, setEnableAutoReminders] = React.useState(true);
  const [reminderInterval, setReminderInterval] = React.useState("24");

  return (
    <LiquidGlassCard>
      <LiquidGlassCardHeader>
        <LiquidGlassCardTitle>
          <AlertTriangle className="mr-2 h-5 w-5 rtl:ml-2 rtl:mr-0" />
          {t("admin.settings.escalationSettings.title")}
        </LiquidGlassCardTitle>
      </LiquidGlassCardHeader>
      <LiquidGlassCardContent className="space-y-6">
        <div className="rounded-lg border border-warning-200 bg-warning-50 p-4 dark:border-warning-800 dark:bg-warning-900/20">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-warning-600" />
            <div>
              <p className="font-medium text-warning-800 dark:text-warning-200">
                {t("admin.settings.escalationSettings.title")}
              </p>
              <p className="mt-1 text-sm text-warning-700 dark:text-warning-300">
                {t("admin.settings.escalationSettings.description")}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t("admin.settings.escalationSettings.warningThreshold")}
            </label>
            <Input
              type="number"
              value={warningThreshold}
              onChange={(e) => {
                setWarningThreshold(e.target.value);
                onDirty();
              }}
              min="1"
              max="30"
            />
            <p className="mt-1 text-xs text-neutral-500">
              {t("admin.settings.escalationSettings.warningThresholdHint")}
            </p>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t("admin.settings.escalationSettings.escalationThreshold")}
            </label>
            <Input
              type="number"
              value={escalationThreshold}
              onChange={(e) => {
                setEscalationThreshold(e.target.value);
                onDirty();
              }}
              min="1"
              max="30"
            />
            <p className="mt-1 text-xs text-neutral-500">
              {t("admin.settings.escalationSettings.escalationThresholdHint")}
            </p>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t("admin.settings.escalationSettings.hrEmail")}
            </label>
            <Input
              type="email"
              value={hrEscalationEmail}
              onChange={(e) => {
                setHrEscalationEmail(e.target.value);
                onDirty();
              }}
              placeholder="hr@example.com"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t("admin.settings.escalationSettings.adminEmail")}
            </label>
            <Input
              type="email"
              value={adminEscalationEmail}
              onChange={(e) => {
                setAdminEscalationEmail(e.target.value);
                onDirty();
              }}
              placeholder="admin@example.com"
            />
          </div>
        </div>

        <hr className="border-neutral-200 dark:border-neutral-700" />

        <div>
          <h3 className="mb-4 font-medium text-neutral-900 dark:text-white">
            {t("admin.settings.escalationSettings.autoReminders")}
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-neutral-900 dark:text-white">
                  {t("admin.settings.escalationSettings.enableAutoReminders")}
                </p>
                <p className="text-sm text-neutral-500">
                  {t("admin.settings.escalationSettings.enableAutoRemindersHint")}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={enableAutoReminders}
                onClick={() => {
                  setEnableAutoReminders(!enableAutoReminders);
                  onDirty();
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  enableAutoReminders
                    ? "bg-primary-600"
                    : "bg-neutral-300 dark:bg-neutral-600"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    enableAutoReminders
                      ? "ltr:translate-x-6 rtl:-translate-x-6"
                      : "ltr:translate-x-1 rtl:-translate-x-1"
                  }`}
                />
              </button>
            </div>

            {enableAutoReminders && (
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  {t("admin.settings.escalationSettings.reminderInterval")}
                </label>
                <Select
                  value={reminderInterval}
                  onChange={(e) => {
                    setReminderInterval(e.target.value);
                    onDirty();
                  }}
                  className="w-48"
                >
                  <option value="12">12 {t("admin.settings.time.hours")}</option>
                  <option value="24">24 {t("admin.settings.time.hours")}</option>
                  <option value="48">48 {t("admin.settings.time.hours")}</option>
                  <option value="72">72 {t("admin.settings.time.hours")}</option>
                </Select>
              </div>
            )}
          </div>
        </div>
      </LiquidGlassCardContent>
    </LiquidGlassCard>
  );
}
