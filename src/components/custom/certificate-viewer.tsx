"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Download,
  Printer,
  Share2,
  Mail,
  Eye,
  FileCheck,
  Loader2,
  CheckCircle,
  AlertCircle,
  Copy,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface CertificateViewerProps {
  /**
   * Request ID for the certificate
   */
  requestId: string;
  /**
   * Request status - certificate only available when approved
   */
  requestStatus: string;
  /**
   * Applicant name for display
   */
  applicantName: string;
  /**
   * Applicant name in Arabic
   */
  applicantNameAr?: string;
  /**
   * Certificate number if already generated
   */
  certificateNumber?: string;
  /**
   * Current locale
   * @default "en"
   */
  locale?: "en" | "ar";
  /**
   * Applicant email for sharing
   */
  applicantEmail?: string;
  /**
   * Additional class name
   */
  className?: string;
}

interface ShareOption {
  id: string;
  labelEn: string;
  labelAr: string;
  icon: React.ReactNode;
  action: () => void;
}

// ============================================================================
// Labels
// ============================================================================

const LABELS = {
  title: {
    en: "Clinical Privileges Certificate",
    ar: "شهادة الامتيازات السريرية",
  },
  description: {
    en: "Your clinical privileges certificate is ready for download.",
    ar: "شهادة الامتيازات السريرية جاهزة للتحميل.",
  },
  notAvailable: {
    en: "Certificate not available",
    ar: "الشهادة غير متاحة",
  },
  notApproved: {
    en: "Certificate will be available once the request is fully approved.",
    ar: "ستكون الشهادة متاحة بمجرد الموافقة الكاملة على الطلب.",
  },
  download: {
    en: "Download PDF",
    ar: "تحميل PDF",
  },
  print: {
    en: "Print",
    ar: "طباعة",
  },
  share: {
    en: "Share",
    ar: "مشاركة",
  },
  preview: {
    en: "Preview",
    ar: "معاينة",
  },
  email: {
    en: "Send via Email",
    ar: "إرسال عبر البريد الإلكتروني",
  },
  copyLink: {
    en: "Copy Link",
    ar: "نسخ الرابط",
  },
  copied: {
    en: "Link copied!",
    ar: "تم نسخ الرابط!",
  },
  downloading: {
    en: "Generating certificate...",
    ar: "جاري إنشاء الشهادة...",
  },
  downloadError: {
    en: "Failed to download certificate",
    ar: "فشل تحميل الشهادة",
  },
  certificateFor: {
    en: "Certificate for",
    ar: "شهادة",
  },
  certificateNo: {
    en: "Certificate No",
    ar: "رقم الشهادة",
  },
  validityNote: {
    en: "This certificate is valid for 2 years from the date of issue.",
    ar: "هذه الشهادة صالحة لمدة سنتين من تاريخ الإصدار.",
  },
  shareTitle: {
    en: "Share Certificate",
    ar: "مشاركة الشهادة",
  },
  close: {
    en: "Close",
    ar: "إغلاق",
  },
};

// ============================================================================
// Certificate Viewer Component
// ============================================================================

export const CertificateViewer: React.FC<CertificateViewerProps> = ({
  requestId,
  requestStatus,
  applicantName,
  applicantNameAr,
  certificateNumber,
  locale = "en",
  applicantEmail,
  className,
}) => {
  const isArabic = locale === "ar";
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [downloadError, setDownloadError] = React.useState<string | null>(null);
  const [showShareDialog, setShowShareDialog] = React.useState(false);
  const [linkCopied, setLinkCopied] = React.useState(false);

  const isApproved = requestStatus === "APPROVED";
  const certificateUrl = `/api/requests/${requestId}/certificate`;

  // Get localized label
  const getLabel = (key: keyof typeof LABELS): string => {
    return isArabic ? LABELS[key].ar : LABELS[key].en;
  };

  // Handle certificate download
  const handleDownload = async () => {
    if (!isApproved) return;

    setIsDownloading(true);
    setDownloadError(null);

    try {
      const response = await fetch(certificateUrl);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Download failed");
      }

      // Get the blob
      const blob = await response.blob();

      // Extract filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `Certificate_${applicantName.replace(/\s+/g, "_")}_${requestId}.pdf`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Certificate download error:", error);
      setDownloadError(
        error instanceof Error ? error.message : getLabel("downloadError")
      );
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle print
  const handlePrint = async () => {
    if (!isApproved) return;

    setIsDownloading(true);
    setDownloadError(null);

    try {
      const response = await fetch(certificateUrl);

      if (!response.ok) {
        throw new Error("Failed to fetch certificate");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      // Open in new window for printing
      const printWindow = window.open(url, "_blank");
      if (printWindow) {
        printWindow.addEventListener("load", () => {
          printWindow.print();
        });
      }
    } catch (error) {
      console.error("Certificate print error:", error);
      setDownloadError(getLabel("downloadError"));
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle email share
  const handleEmailShare = () => {
    const subject = encodeURIComponent(
      `${getLabel("certificateFor")} ${applicantName}`
    );
    const body = encodeURIComponent(
      `${getLabel("title")}\n\n${getLabel("certificateFor")}: ${applicantName}\n${
        certificateNumber ? `${getLabel("certificateNo")}: ${certificateNumber}` : ""
      }`
    );

    const mailtoUrl = `mailto:${applicantEmail || ""}?subject=${subject}&body=${body}`;
    window.location.href = mailtoUrl;
    setShowShareDialog(false);
  };

  // Handle copy link
  const handleCopyLink = async () => {
    const fullUrl = `${window.location.origin}${certificateUrl}`;

    try {
      await navigator.clipboard.writeText(fullUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy link:", error);
    }
  };

  // Handle preview
  const handlePreview = () => {
    window.open(certificateUrl, "_blank");
  };

  // Share options
  const shareOptions: ShareOption[] = [
    {
      id: "email",
      labelEn: "Send via Email",
      labelAr: "إرسال عبر البريد الإلكتروني",
      icon: <Mail size={18} />,
      action: handleEmailShare,
    },
    {
      id: "copy",
      labelEn: linkCopied ? "Link copied!" : "Copy Link",
      labelAr: linkCopied ? "تم نسخ الرابط!" : "نسخ الرابط",
      icon: linkCopied ? <CheckCircle size={18} /> : <Copy size={18} />,
      action: handleCopyLink,
    },
  ];

  // Render not available state
  if (!isApproved) {
    return (
      <div
        className={cn(
          "rounded-lg border border-neutral-200 bg-neutral-50 p-6",
          "dark:border-neutral-700 dark:bg-neutral-800/50",
          className
        )}
        dir={isArabic ? "rtl" : "ltr"}
      >
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-700">
            <AlertCircle className="h-6 w-6 text-neutral-500" />
          </div>
          <div className="flex-1">
            <h3
              className={cn(
                "font-semibold text-neutral-900 dark:text-neutral-100",
                isArabic && "font-arabic"
              )}
            >
              {getLabel("notAvailable")}
            </h3>
            <p
              className={cn(
                "mt-1 text-sm text-neutral-500 dark:text-neutral-400",
                isArabic && "font-arabic"
              )}
            >
              {getLabel("notApproved")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          "rounded-lg border border-success-200 bg-success-50 p-6",
          "dark:border-success-800 dark:bg-success-900/20",
          className
        )}
        dir={isArabic ? "rtl" : "ltr"}
      >
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success-100 dark:bg-success-900/50">
            <FileCheck className="h-6 w-6 text-success-600 dark:text-success-400" />
          </div>
          <div className="flex-1">
            <h3
              className={cn(
                "font-semibold text-success-900 dark:text-success-100",
                isArabic && "font-arabic"
              )}
            >
              {getLabel("title")}
            </h3>
            <p
              className={cn(
                "mt-1 text-sm text-success-700 dark:text-success-300",
                isArabic && "font-arabic"
              )}
            >
              {getLabel("description")}
            </p>

            {/* Practitioner info */}
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-success-700 dark:text-success-300">
                {getLabel("certificateFor")}:
              </span>
              <span className="font-medium text-success-900 dark:text-success-100">
                {applicantName}
              </span>
              {applicantNameAr && (
                <span className="font-arabic text-success-900 dark:text-success-100">
                  / {applicantNameAr}
                </span>
              )}
            </div>

            {certificateNumber && (
              <div className="mt-2 text-sm">
                <span className="text-success-700 dark:text-success-300">
                  {getLabel("certificateNo")}:
                </span>{" "}
                <span className="font-mono font-medium text-success-900 dark:text-success-100">
                  {certificateNumber}
                </span>
              </div>
            )}

            <p
              className={cn(
                "mt-3 text-xs text-success-600 dark:text-success-400",
                isArabic && "font-arabic"
              )}
            >
              {getLabel("validityNote")}
            </p>

            {/* Error message */}
            {downloadError && (
              <div className="mt-3 flex items-center gap-2 text-sm text-error-600 dark:text-error-400">
                <AlertCircle size={16} />
                <span>{downloadError}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                onClick={handleDownload}
                disabled={isDownloading}
                variant="success"
                size="sm"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {getLabel("downloading")}
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    {getLabel("download")}
                  </>
                )}
              </Button>

              <Button
                onClick={handlePreview}
                disabled={isDownloading}
                variant="outline"
                size="sm"
              >
                <Eye className="mr-2 h-4 w-4" />
                {getLabel("preview")}
              </Button>

              <Button
                onClick={handlePrint}
                disabled={isDownloading}
                variant="outline"
                size="sm"
              >
                <Printer className="mr-2 h-4 w-4" />
                {getLabel("print")}
              </Button>

              <Button
                onClick={() => setShowShareDialog(true)}
                disabled={isDownloading}
                variant="outline"
                size="sm"
              >
                <Share2 className="mr-2 h-4 w-4" />
                {getLabel("share")}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-sm">
          <DialogClose />
          <DialogHeader>
            <DialogTitle className={isArabic ? "font-arabic" : ""}>
              {getLabel("shareTitle")}
            </DialogTitle>
            <DialogDescription className={isArabic ? "font-arabic" : ""}>
              {getLabel("certificateFor")} {applicantName}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2 py-4">
            {shareOptions.map((option) => (
              <Button
                key={option.id}
                variant="outline"
                className="justify-start"
                onClick={option.action}
              >
                <span className="mr-3">{option.icon}</span>
                <span className={isArabic ? "font-arabic" : ""}>
                  {isArabic ? option.labelAr : option.labelEn}
                </span>
              </Button>
            ))}
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowShareDialog(false)}
              className={isArabic ? "font-arabic" : ""}
            >
              {getLabel("close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

CertificateViewer.displayName = "CertificateViewer";

// ============================================================================
// Certificate Status Badge
// ============================================================================

interface CertificateStatusBadgeProps {
  requestStatus: string;
  locale?: "en" | "ar";
  className?: string;
}

export const CertificateStatusBadge: React.FC<CertificateStatusBadgeProps> = ({
  requestStatus,
  locale = "en",
  className,
}) => {
  const isArabic = locale === "ar";
  const isApproved = requestStatus === "APPROVED";

  if (!isApproved) {
    return null;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium",
        "rounded-full bg-success-100 text-success-700",
        "dark:bg-success-900/30 dark:text-success-400",
        className
      )}
    >
      <FileCheck size={12} />
      <span className={isArabic ? "font-arabic" : ""}>
        {isArabic ? "الشهادة متاحة" : "Certificate Available"}
      </span>
    </span>
  );
};

CertificateStatusBadge.displayName = "CertificateStatusBadge";

export default CertificateViewer;
