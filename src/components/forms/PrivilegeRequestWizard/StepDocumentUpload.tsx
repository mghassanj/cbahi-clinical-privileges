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
} from "lucide-react";

export interface StepDocumentUploadProps {
  data: Partial<DocumentsData>;
  onUpdate: (data: Partial<DocumentsData>) => void;
  errors?: string | null;
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
}: StepDocumentUploadProps) {
  const t = useTranslations("request.form.documents");
  const tValidation = useTranslations("request.validation");
  const locale = useLocale();
  const isRTL = locale === "ar";

  const [uploadingKey, setUploadingKey] = React.useState<string | null>(null);
  const [dragOver, setDragOver] = React.useState<string | null>(null);
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

  const handleFileSelect = async (
    files: FileList | null,
    requirement: DocumentRequirement
  ) => {
    if (!files || files.length === 0) return;

    setUploadingKey(requirement.key);

    try {
      if (requirement.multiple) {
        // Handle multiple files
        const newDocs: DocumentData[] = [];
        for (const file of Array.from(files)) {
          const validation = validateFile(file, requirement);
          if (!validation.valid) {
            alert(validation.error);
            continue;
          }

          // In production, this would upload to server/cloud storage
          const doc: DocumentData = {
            id: `${requirement.key}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: file.name,
            type: file.type,
            size: file.size,
            url: URL.createObjectURL(file), // Temporary local URL
          };
          newDocs.push(doc);
        }

        const existingDocs = (data[requirement.key] as DocumentData[]) || [];
        onUpdate({
          [requirement.key]: [...existingDocs, ...newDocs],
        });
      } else {
        // Handle single file
        const file = files[0];
        const validation = validateFile(file, requirement);
        if (!validation.valid) {
          alert(validation.error);
          return;
        }

        // In production, this would upload to server/cloud storage
        const doc: DocumentData = {
          id: `${requirement.key}-${Date.now()}`,
          name: file.name,
          type: file.type,
          size: file.size,
          url: URL.createObjectURL(file), // Temporary local URL
        };

        onUpdate({ [requirement.key]: doc });
      }
    } catch (error) {
      console.error("File upload error:", error);
    } finally {
      setUploadingKey(null);
    }
  };

  const handleRemoveFile = (
    requirement: DocumentRequirement,
    docId?: string
  ) => {
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
    setDragOver(key);
  };

  const handleDragLeave = () => {
    setDragOver(null);
  };

  const handleDrop = (e: React.DragEvent, requirement: DocumentRequirement) => {
    e.preventDefault();
    setDragOver(null);
    handleFileSelect(e.dataTransfer.files, requirement);
  };

  const getDocumentStatus = (requirement: DocumentRequirement): "empty" | "uploaded" | "error" => {
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
    return (
      <div
        key={doc.id}
        className="flex items-center gap-3 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50"
      >
        <div className="flex-shrink-0">
          {isImage ? (
            <FileImage className="h-8 w-8 text-primary-500" />
          ) : (
            <FileText className="h-8 w-8 text-primary-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
            {doc.name}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {formatFileSize(doc.size)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => handleRemoveFile(requirement, doc.id)}
          className="p-1.5 rounded-md text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          aria-label={t("removeFile")}
        >
          <X className="h-4 w-4" />
        </button>
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
                          : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800"
                      )}
                    >
                      {status === "uploaded" ? (
                        <CheckCircle className="h-5 w-5" />
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
                            : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400"
                          : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                      )}
                    >
                      {requirement.required
                        ? status === "uploaded"
                          ? isRTL
                            ? "تم الرفع"
                            : "Uploaded"
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
                    {/* Add more button for multiple files */}
                    <button
                      type="button"
                      onClick={() => fileInputRefs.current[requirement.key]?.click()}
                      disabled={isUploading}
                      className={cn(
                        "w-full flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed transition-colors",
                        "border-neutral-300 dark:border-neutral-600",
                        "hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/10",
                        isUploading && "opacity-50 cursor-not-allowed"
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
                  renderFilePreview(doc as DocumentData, requirement)
                ) : (
                  // Upload dropzone
                  <button
                    type="button"
                    onClick={() => fileInputRefs.current[requirement.key]?.click()}
                    disabled={isUploading}
                    className={cn(
                      "w-full flex flex-col items-center justify-center gap-3 p-8 rounded-lg border-2 border-dashed transition-colors",
                      isDraggedOver
                        ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                        : "border-neutral-300 dark:border-neutral-600",
                      "hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/10",
                      isUploading && "opacity-50 cursor-not-allowed"
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
