"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import type { DocumentsData, DocumentData } from "@/hooks/usePrivilegeRequest";
import {
  Upload,
  FileText,
  X,
  CheckCircle,
  AlertCircle,
  FileImage,
  Loader2,
  Plus,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

export interface StepDocumentUploadProps {
  data: Partial<DocumentsData>;
  onUpdate: (data: Partial<DocumentsData>) => void;
  errors?: string | null;
  requestId?: string;
}

interface DocumentRequirement {
  key: keyof DocumentsData;
  labelEn: string;
  labelAr: string;
  descriptionEn: string;
  descriptionAr: string;
  required: boolean;
  acceptedTypes: string[];
  maxSizeMB: number;
  multiple?: boolean;
}

interface UploadProgress {
  [key: string]: number;
}

const DOCUMENT_REQUIREMENTS: DocumentRequirement[] = [
  {
    key: "educationCertificate",
    labelEn: "Education Certificate",
    labelAr: "شهادة التعليم",
    descriptionEn: "Upload your highest educational qualification certificate",
    descriptionAr: "ارفع شهادة أعلى مؤهل تعليمي لديك",
    required: true,
    acceptedTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxSizeMB: 10,
  },
  {
    key: "scfhsRegistration",
    labelEn: "SCFHS Registration",
    labelAr: "تسجيل الهيئة السعودية للتخصصات الصحية",
    descriptionEn: "Upload your valid SCFHS license/registration document",
    descriptionAr: "ارفع وثيقة ترخيص/تسجيل الهيئة السعودية للتخصصات الصحية",
    required: true,
    acceptedTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxSizeMB: 10,
  },
  {
    key: "nationalIdCopy",
    labelEn: "National ID Copy",
    labelAr: "صورة الهوية الوطنية",
    descriptionEn: "Upload a clear copy of your national ID (both sides)",
    descriptionAr: "ارفع صورة واضحة من الهوية الوطنية (الوجهين)",
    required: true,
    acceptedTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxSizeMB: 5,
  },
  {
    key: "passportPhoto",
    labelEn: "Passport Photo",
    labelAr: "صورة شخصية",
    descriptionEn: "Upload a recent passport-size photograph",
    descriptionAr: "ارفع صورة شخصية حديثة بحجم جواز السفر",
    required: true,
    acceptedTypes: ["image/jpeg", "image/png"],
    maxSizeMB: 2,
  },
  {
    key: "additionalCertifications",
    labelEn: "Additional Certifications",
    labelAr: "شهادات إضافية",
    descriptionEn:
      "Upload any additional certifications (BLS, ACLS, specialty certificates, etc.)",
    descriptionAr:
      "ارفع أي شهادات إضافية (الإنعاش الأساسي، الإنعاش المتقدم، شهادات التخصص، إلخ)",
    required: false,
    acceptedTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxSizeMB: 10,
    multiple: true,
  },
  {
    key: "cvResume",
    labelEn: "CV/Resume",
    labelAr: "السيرة الذاتية",
    descriptionEn: "Upload your updated curriculum vitae or resume",
    descriptionAr: "ارفع سيرتك الذاتية المحدثة",
    required: false,
    acceptedTypes: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    maxSizeMB: 5,
  },
];

export function StepDocumentUpload({
  data,
  onUpdate,
  errors,
  requestId,
}: StepDocumentUploadProps) {
  const t = useTranslations("request.form.documents");
  const tValidation = useTranslations("request.validation");
  const locale = useLocale();
  const isRTL = locale === "ar";

  const [uploadingKey, setUploadingKey] = React.useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = React.useState<UploadProgress>({});
  const [dragOver, setDragOver] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const fileInputRefs = React.useRef<Record<string, HTMLInputElement | null>>({});

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const validateFile = (
    file: File,
    requirement: DocumentRequirement
  ): { valid: boolean; error?: string } => {
    if (!requirement.acceptedTypes.includes(file.type)) {
      const types = requirement.acceptedTypes
        .map((t) => t.split("/")[1].toUpperCase())
        .join(", ");
      return {
        valid: false,
        error: tValidation("invalidFileType", { types }),
      };
    }
    if (file.size > requirement.maxSizeMB * 1024 * 1024) {
      return {
        valid: false,
        error: tValidation("fileTooLarge", { size: requirement.maxSizeMB }),
      };
    }
    return { valid: true };
  };

  /**
   * Upload a single file to Google Drive via API
   */
  const uploadFileToGoogleDrive = async (
    file: File,
    documentType: string
  ): Promise<DocumentData | null> => {
    // Require requestId to ensure attachments are properly linked to the request
    if (!requestId) {
      throw new Error(
        isRTL
          ? "يرجى حفظ الطلب أولاً قبل رفع المستندات"
          : "Please save the request first before uploading documents"
      );
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("documentType", documentType);
    formData.append("requestId", requestId);

    try {
      const response = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Upload failed");
      }

      return {
        id: result.data.driveFileId,
        name: result.data.name,
        type: result.data.type,
        size: result.data.size,
        url: result.data.url,
        driveFileId: result.data.driveFileId,
      };
    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    }
  };

  /**
   * Delete a file from Google Drive via API
   */
  const deleteFileFromGoogleDrive = async (fileId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/uploads/${fileId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || "Delete failed");
      }

      return true;
    } catch (error) {
      console.error("Delete error:", error);
      throw error;
    }
  };

  const handleFileSelect = async (
    files: FileList | null,
    requirement: DocumentRequirement
  ) => {
    if (!files || files.length === 0) return;

    // Check if requestId is available before allowing uploads
    if (!requestId) {
      toast.error(
        isRTL
          ? "يرجى الانتظار حتى يتم حفظ الطلب قبل رفع المستندات"
          : "Please wait for the request to be saved before uploading documents"
      );
      return;
    }

    setUploadingKey(requirement.key);
    setUploadProgress((prev) => ({ ...prev, [requirement.key]: 0 }));

    try {
      if (requirement.multiple) {
        // Handle multiple files
        const newDocs: DocumentData[] = [];
        const totalFiles = files.length;
        let completedFiles = 0;

        for (const file of Array.from(files)) {
          const validation = validateFile(file, requirement);
          if (!validation.valid) {
            toast.error(`${file.name}: ${validation.error}`);
            completedFiles++;
            continue;
          }

          try {
            // Upload to Google Drive
            const uploadedDoc = await uploadFileToGoogleDrive(file, requirement.key);
            if (uploadedDoc) {
              newDocs.push(uploadedDoc);
              toast.success(
                isRTL
                  ? `تم رفع ${file.name} بنجاح`
                  : `${file.name} uploaded successfully`
              );
            }
          } catch {
            toast.error(
              isRTL
                ? `فشل رفع ${file.name}`
                : `Failed to upload ${file.name}`
            );
          }

          completedFiles++;
          setUploadProgress((prev) => ({
            ...prev,
            [requirement.key]: Math.round((completedFiles / totalFiles) * 100),
          }));
        }

        if (newDocs.length > 0) {
          const existingDocs = (data[requirement.key] as DocumentData[]) || [];
          onUpdate({
            [requirement.key]: [...existingDocs, ...newDocs],
          });
        }
      } else {
        // Handle single file
        const file = files[0];
        const validation = validateFile(file, requirement);
        if (!validation.valid) {
          toast.error(validation.error);
          return;
        }

        // Simulate progress for better UX
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => {
            const currentProgress = prev[requirement.key] || 0;
            if (currentProgress < 90) {
              return { ...prev, [requirement.key]: currentProgress + 10 };
            }
            return prev;
          });
        }, 200);

        try {
          // Upload to Google Drive
          const uploadedDoc = await uploadFileToGoogleDrive(file, requirement.key);

          clearInterval(progressInterval);
          setUploadProgress((prev) => ({ ...prev, [requirement.key]: 100 }));

          if (uploadedDoc) {
            onUpdate({ [requirement.key]: uploadedDoc });
            toast.success(
              isRTL
                ? `تم رفع ${file.name} بنجاح`
                : `${file.name} uploaded successfully`
            );
          }
        } catch {
          clearInterval(progressInterval);
          toast.error(
            isRTL
              ? `فشل رفع ${file.name}`
              : `Failed to upload ${file.name}`
          );
        }
      }
    } catch (err) {
      console.error("File upload error:", err);
      toast.error(
        isRTL
          ? "حدث خطأ أثناء رفع الملف"
          : "An error occurred while uploading the file"
      );
    } finally {
      setUploadingKey(null);
      // Clear progress after a short delay
      setTimeout(() => {
        setUploadProgress((prev) => {
          const newProgress = { ...prev };
          delete newProgress[requirement.key];
          return newProgress;
        });
      }, 500);
    }
  };

  const handleRemoveFile = async (
    requirement: DocumentRequirement,
    docId?: string
  ) => {
    const fileToRemove = requirement.multiple
      ? (data[requirement.key] as DocumentData[] | undefined)?.find(
          (d) => d.id === docId
        )
      : (data[requirement.key] as DocumentData | undefined);

    if (!fileToRemove) return;

    const driveFileId = fileToRemove.driveFileId || fileToRemove.id;

    // Only delete from Google Drive if it has a driveFileId (was uploaded to Drive)
    if (driveFileId && !driveFileId.startsWith("local-")) {
      setDeletingId(driveFileId);

      try {
        await deleteFileFromGoogleDrive(driveFileId);
        toast.success(
          isRTL
            ? `تم حذف ${fileToRemove.name} بنجاح`
            : `${fileToRemove.name} deleted successfully`
        );
      } catch {
        toast.error(
          isRTL
            ? `فشل حذف ${fileToRemove.name}`
            : `Failed to delete ${fileToRemove.name}`
        );
        setDeletingId(null);
        return;
      }

      setDeletingId(null);
    }

    // Update local state
    if (requirement.multiple && docId) {
      const existingDocs = (data[requirement.key] as DocumentData[]) || [];
      onUpdate({
        [requirement.key]: existingDocs.filter((d) => d.id !== docId),
      });
    } else {
      onUpdate({ [requirement.key]: null });
    }
  };

  const handleDragOver = (e: React.DragEvent, key: string) => {
    e.preventDefault();
    // Only show drag indicator if requestId is available
    if (requestId) {
      setDragOver(key);
    }
  };

  const handleDragLeave = () => {
    setDragOver(null);
  };

  const handleDrop = (e: React.DragEvent, requirement: DocumentRequirement) => {
    e.preventDefault();
    setDragOver(null);
    // Only handle drop if requestId is available
    if (requestId) {
      handleFileSelect(e.dataTransfer.files, requirement);
    } else {
      toast.error(
        isRTL
          ? "يرجى الانتظار حتى يتم حفظ الطلب قبل رفع المستندات"
          : "Please wait for the request to be saved before uploading documents"
      );
    }
  };

  const getDocumentStatus = (requirement: DocumentRequirement): "empty" | "uploaded" | "uploading" | "error" => {
    if (uploadingKey === requirement.key) return "uploading";
    const doc = data[requirement.key];
    if (requirement.multiple) {
      return (doc as DocumentData[] | undefined)?.length ? "uploaded" : "empty";
    }
    return doc ? "uploaded" : "empty";
  };

  const getAcceptString = (requirement: DocumentRequirement): string => {
    return requirement.acceptedTypes.join(",");
  };

  const renderFilePreview = (doc: DocumentData, requirement: DocumentRequirement) => {
    const isImage = doc.type.startsWith("image/");
    const isDeleting = deletingId === (doc.driveFileId || doc.id);
    const hasUrl = !!doc.url;

    return (
      <div
        key={doc.id}
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50",
          isDeleting && "opacity-50"
        )}
      >
        <div className="flex-shrink-0">
          {isImage ? (
            <FileImage className="h-8 w-8 text-primary-500" />
          ) : (
            <FileText className="h-8 w-8 text-primary-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
              {doc.name}
            </p>
            {hasUrl && (
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 text-primary-500 hover:text-primary-600"
                title={isRTL ? "فتح في نافذة جديدة" : "Open in new tab"}
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {formatFileSize(doc.size)}
            {doc.driveFileId && (
              <span className="ml-2 text-green-600 dark:text-green-400">
                {isRTL ? "تم الرفع إلى Google Drive" : "Uploaded to Google Drive"}
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => handleRemoveFile(requirement, doc.id)}
          disabled={isDeleting}
          className={cn(
            "p-1.5 rounded-md text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors",
            isDeleting && "cursor-not-allowed"
          )}
          aria-label={t("removeFile")}
        >
          {isDeleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <X className="h-4 w-4" />
          )}
        </button>
      </div>
    );
  };

  const renderProgressBar = (key: string) => {
    const progress = uploadProgress[key];
    if (progress === undefined) return null;

    return (
      <div className="mt-2">
        <div className="h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-500 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-neutral-500 text-center">
          {progress}%
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Description */}
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        {t("description")}
      </p>

      {/* Supported Formats Info */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 dark:bg-blue-900/20 dark:border-blue-800">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          {t("supportedFormats", { size: 10 })}
        </p>
      </div>

      {/* Google Drive Integration Notice */}
      <div className="rounded-lg bg-green-50 border border-green-200 p-3 dark:bg-green-900/20 dark:border-green-800">
        <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          {isRTL
            ? "يتم رفع المستندات تلقائياً إلى Google Drive للتخزين الآمن"
            : "Documents are automatically uploaded to Google Drive for secure storage"}
        </p>
      </div>

      {/* Warning if requestId is missing */}
      {!requestId && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 dark:bg-amber-900/20 dark:border-amber-800">
          <p className="text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {isRTL
              ? "جاري تحضير الطلب... يرجى الانتظار قبل رفع المستندات"
              : "Preparing request... please wait before uploading documents"}
          </p>
        </div>
      )}

      {/* Document Upload Cards */}
      <div className="space-y-4">
        {DOCUMENT_REQUIREMENTS.map((requirement) => {
          const status = getDocumentStatus(requirement);
          const isUploading = uploadingKey === requirement.key;
          const isDraggedOver = dragOver === requirement.key;
          const doc = data[requirement.key];

          return (
            <div
              key={requirement.key}
              className={cn(
                "rounded-xl border-2 transition-all duration-200",
                isDraggedOver
                  ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                  : status === "uploaded"
                  ? "border-green-300 bg-green-50/50 dark:border-green-700 dark:bg-green-900/10"
                  : status === "uploading"
                  ? "border-blue-300 bg-blue-50/50 dark:border-blue-700 dark:bg-blue-900/10"
                  : "border-neutral-200 dark:border-neutral-700"
              )}
              onDragOver={(e) => handleDragOver(e, requirement.key)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, requirement)}
            >
              {/* Header */}
              <div className="p-4 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-lg",
                        status === "uploaded"
                          ? "bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400"
                          : status === "uploading"
                          ? "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400"
                          : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800"
                      )}
                    >
                      {status === "uploaded" ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : status === "uploading" ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <FileText className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                        {isRTL ? requirement.labelAr : requirement.labelEn}
                        {requirement.required && (
                          <span className="text-red-500 ml-1 rtl:ml-0 rtl:mr-1">*</span>
                        )}
                      </h4>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {isRTL ? requirement.descriptionAr : requirement.descriptionEn}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-xs font-medium px-2 py-1 rounded-full",
                        requirement.required
                          ? status === "uploaded"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400"
                            : status === "uploading"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400"
                          : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                      )}
                    >
                      {requirement.required
                        ? status === "uploaded"
                          ? isRTL
                            ? "تم الرفع"
                            : "Uploaded"
                          : status === "uploading"
                          ? isRTL
                            ? "جاري الرفع..."
                            : "Uploading..."
                          : t("required")
                        : t("optional")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Upload Area / File Preview */}
              <div className="p-4">
                {/* Show existing files */}
                {requirement.multiple ? (
                  <div className="space-y-2">
                    {(doc as DocumentData[] | undefined)?.map((d) =>
                      renderFilePreview(d, requirement)
                    )}
                    {/* Progress bar for multiple uploads */}
                    {isUploading && renderProgressBar(requirement.key)}
                    {/* Add more button for multiple files */}
                    <button
                      type="button"
                      onClick={() => fileInputRefs.current[requirement.key]?.click()}
                      disabled={isUploading || !requestId}
                      className={cn(
                        "w-full flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed transition-colors",
                        "border-neutral-300 dark:border-neutral-600",
                        "hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/10",
                        (isUploading || !requestId) && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {isUploading ? (
                        <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
                      ) : (
                        <Plus className="h-5 w-5 text-neutral-400" />
                      )}
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">
                        {isRTL ? "إضافة ملف" : "Add file"}
                      </span>
                    </button>
                  </div>
                ) : doc ? (
                  // Single file preview
                  <div>
                    {renderFilePreview(doc as DocumentData, requirement)}
                    {isUploading && renderProgressBar(requirement.key)}
                  </div>
                ) : (
                  // Upload dropzone
                  <div>
                    <button
                      type="button"
                      onClick={() => fileInputRefs.current[requirement.key]?.click()}
                      disabled={isUploading || !requestId}
                      className={cn(
                        "w-full flex flex-col items-center justify-center gap-3 p-8 rounded-lg border-2 border-dashed transition-colors",
                        isDraggedOver
                          ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                          : "border-neutral-300 dark:border-neutral-600",
                        "hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/10",
                        (isUploading || !requestId) && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {isUploading ? (
                        <Loader2 className="h-10 w-10 animate-spin text-primary-500" />
                      ) : (
                        <Upload className="h-10 w-10 text-neutral-400" />
                      )}
                      <div className="text-center">
                        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                          {t("dragDrop")}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                          {t("or")}{" "}
                          <span className="text-primary-600 dark:text-primary-400">
                            {t("browseFiles")}
                          </span>
                        </p>
                      </div>
                      <p className="text-xs text-neutral-400">
                        {isRTL
                          ? `الحد الأقصى: ${requirement.maxSizeMB} ميجابايت`
                          : `Max: ${requirement.maxSizeMB}MB`}
                      </p>
                    </button>
                    {isUploading && renderProgressBar(requirement.key)}
                  </div>
                )}

                {/* Hidden file input */}
                <input
                  type="file"
                  ref={(el) => {
                    fileInputRefs.current[requirement.key] = el;
                  }}
                  accept={getAcceptString(requirement)}
                  multiple={requirement.multiple}
                  onChange={(e) => handleFileSelect(e.target.files, requirement)}
                  disabled={!requestId}
                  className="hidden"
                  aria-label={isRTL ? requirement.labelAr : requirement.labelEn}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Validation Summary */}
      {errors && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 dark:bg-red-900/20 dark:border-red-800">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600 dark:text-red-400">{errors}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default StepDocumentUpload;
