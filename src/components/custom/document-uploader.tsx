"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Upload,
  X,
  FileText,
  Image,
  File,
  AlertCircle,
  Check,
  Loader2,
} from "lucide-react";

export interface UploadedFile {
  /**
   * Unique identifier
   */
  id: string;
  /**
   * File name
   */
  name: string;
  /**
   * File size in bytes
   */
  size: number;
  /**
   * MIME type
   */
  type: string;
  /**
   * URL for preview or download
   */
  url?: string;
  /**
   * Upload status
   */
  status?: "uploading" | "complete" | "error";
  /**
   * Error message if upload failed
   */
  error?: string;
  /**
   * Upload progress (0-100)
   */
  progress?: number;
}

export interface DocumentUploaderProps {
  /**
   * Accepted file types (MIME types or extensions)
   * @default ["application/pdf", "image/jpeg", "image/png"]
   */
  accept?: string[];
  /**
   * Maximum file size in bytes
   * @default 10485760 (10MB)
   */
  maxSize?: number;
  /**
   * Maximum number of files
   * @default 10
   */
  maxFiles?: number;
  /**
   * Callback when files are uploaded
   */
  onUpload: (files: File[]) => void | Promise<void>;
  /**
   * Callback when a file is removed
   */
  onRemove?: (fileId: string) => void;
  /**
   * Existing uploaded files
   */
  existingFiles?: UploadedFile[];
  /**
   * Whether multiple files can be uploaded
   * @default true
   */
  multiple?: boolean;
  /**
   * Current locale
   * @default "en"
   */
  locale?: "en" | "ar";
  /**
   * Whether the uploader is disabled
   * @default false
   */
  disabled?: boolean;
  /**
   * Additional class name
   */
  className?: string;
}

const DEFAULT_ACCEPT = ["application/pdf", "image/jpeg", "image/png"];
const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB

const FILE_ICONS: Record<string, React.ReactNode> = {
  "application/pdf": <FileText size={24} className="text-error-500" />,
  "image/jpeg": <Image size={24} className="text-primary-500" />,
  "image/png": <Image size={24} className="text-primary-500" />,
  default: <File size={24} className="text-neutral-500" />,
};

const LABELS = {
  en: {
    dragDrop: "Drag and drop files here, or",
    browse: "browse",
    acceptedFormats: "Accepted formats:",
    maxSize: "Maximum file size:",
    uploading: "Uploading...",
    uploadComplete: "Upload complete",
    uploadError: "Upload failed",
    remove: "Remove",
    fileTooBig: "File too large",
    invalidType: "Invalid file type",
    maxFilesReached: "Maximum files reached",
  },
  ar: {
    dragDrop: "اسحب وأفلت الملفات هنا، أو",
    browse: "تصفح",
    acceptedFormats: "الصيغ المقبولة:",
    maxSize: "الحد الأقصى لحجم الملف:",
    uploading: "جاري الرفع...",
    uploadComplete: "تم الرفع بنجاح",
    uploadError: "فشل الرفع",
    remove: "إزالة",
    fileTooBig: "الملف كبير جداً",
    invalidType: "نوع ملف غير صالح",
    maxFilesReached: "تم الوصول للحد الأقصى من الملفات",
  },
};

/**
 * Format file size to human readable string
 */
function formatFileSize(bytes: number, locale: "en" | "ar" = "en"): string {
  if (bytes === 0) return locale === "ar" ? "0 بايت" : "0 Bytes";

  const k = 1024;
  const sizes = locale === "ar"
    ? ["بايت", "كيلوبايت", "ميجابايت", "جيجابايت"]
    : ["Bytes", "KB", "MB", "GB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Get file extension from MIME type
 */
function getExtensionFromMime(mime: string): string {
  const map: Record<string, string> = {
    "application/pdf": "PDF",
    "image/jpeg": "JPG",
    "image/png": "PNG",
    "image/gif": "GIF",
    "application/msword": "DOC",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  };
  return map[mime] || mime.split("/")[1]?.toUpperCase() || "FILE";
}

/**
 * Drag-and-drop file upload component with preview and validation.
 */
const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  accept = DEFAULT_ACCEPT,
  maxSize = DEFAULT_MAX_SIZE,
  maxFiles = 10,
  onUpload,
  onRemove,
  existingFiles = [],
  multiple = true,
  locale = "en",
  disabled = false,
  className,
}) => {
  const [isDragging, setIsDragging] = React.useState(false);
  const [localFiles, setLocalFiles] = React.useState<UploadedFile[]>([]);
  const [errors, setErrors] = React.useState<string[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const isArabic = locale === "ar";
  const labels = LABELS[locale];

  const allFiles = [...existingFiles, ...localFiles];
  const canAddMore = allFiles.length < maxFiles;

  const validateFile = (file: File): string | null => {
    // Check file type
    const isValidType = accept.some((type) => {
      if (type.startsWith(".")) {
        return file.name.toLowerCase().endsWith(type.toLowerCase());
      }
      return file.type === type || type === "*/*";
    });

    if (!isValidType) {
      return labels.invalidType;
    }

    // Check file size
    if (file.size > maxSize) {
      return `${labels.fileTooBig} (${formatFileSize(maxSize, locale)})`;
    }

    return null;
  };

  const handleFiles = async (files: FileList | File[]) => {
    if (disabled) return;

    const fileArray = Array.from(files);
    const newErrors: string[] = [];
    const validFiles: File[] = [];

    // Check max files limit
    const remainingSlots = maxFiles - allFiles.length;
    if (fileArray.length > remainingSlots) {
      newErrors.push(labels.maxFilesReached);
      fileArray.splice(remainingSlots);
    }

    // Validate each file
    for (const file of fileArray) {
      const error = validateFile(file);
      if (error) {
        newErrors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    }

    setErrors(newErrors);

    if (validFiles.length > 0) {
      // Create local file entries for preview
      const newLocalFiles: UploadedFile[] = validFiles.map((file) => ({
        id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        size: file.size,
        type: file.type,
        status: "uploading" as const,
        progress: 0,
      }));

      setLocalFiles((prev) => [...prev, ...newLocalFiles]);

      // Call upload handler
      try {
        await onUpload(validFiles);
        // Mark as complete
        setLocalFiles((prev) =>
          prev.map((f) =>
            newLocalFiles.find((nf) => nf.id === f.id)
              ? { ...f, status: "complete" as const, progress: 100 }
              : f
          )
        );
      } catch (error) {
        // Mark as error
        setLocalFiles((prev) =>
          prev.map((f) =>
            newLocalFiles.find((nf) => nf.id === f.id)
              ? {
                  ...f,
                  status: "error" as const,
                  error: error instanceof Error ? error.message : "Upload failed",
                }
              : f
          )
        );
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && canAddMore) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!disabled && canAddMore && e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleClick = () => {
    if (!disabled && canAddMore && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
    // Reset input
    e.target.value = "";
  };

  const handleRemove = (fileId: string) => {
    // Check if it's a local file
    const isLocalFile = localFiles.some((f) => f.id === fileId);
    if (isLocalFile) {
      setLocalFiles((prev) => prev.filter((f) => f.id !== fileId));
    } else if (onRemove) {
      onRemove(fileId);
    }
  };

  const getFileIcon = (type: string) => {
    return FILE_ICONS[type] || FILE_ICONS.default;
  };

  const renderFileItem = (file: UploadedFile) => (
    <div
      key={file.id}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg",
        "bg-neutral-50 dark:bg-neutral-800/50",
        "border border-neutral-200 dark:border-neutral-700"
      )}
    >
      {/* Icon */}
      <div className="flex-shrink-0">{getFileIcon(file.type)}</div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
          {file.name}
        </p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {formatFileSize(file.size, locale)} - {getExtensionFromMime(file.type)}
        </p>

        {/* Progress bar */}
        {file.status === "uploading" && (
          <div className="mt-2 h-1 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 transition-all duration-300"
              style={{ width: `${file.progress || 0}%` }}
            />
          </div>
        )}

        {/* Error message */}
        {file.status === "error" && file.error && (
          <p className="mt-1 text-xs text-error-600 dark:text-error-400 flex items-center gap-1">
            <AlertCircle size={12} />
            {file.error}
          </p>
        )}
      </div>

      {/* Status indicator */}
      <div className="flex-shrink-0">
        {file.status === "uploading" && (
          <Loader2 size={18} className="animate-spin text-primary-500" />
        )}
        {file.status === "complete" && (
          <Check size={18} className="text-success-500" />
        )}
        {file.status === "error" && (
          <AlertCircle size={18} className="text-error-500" />
        )}
      </div>

      {/* Remove button */}
      <button
        type="button"
        onClick={() => handleRemove(file.id)}
        className={cn(
          "flex-shrink-0 p-1 rounded-full",
          "text-neutral-400 hover:text-error-500",
          "hover:bg-error-50 dark:hover:bg-error-900/30",
          "transition-colors duration-150"
        )}
        aria-label={labels.remove}
      >
        <X size={16} />
      </button>
    </div>
  );

  return (
    <div
      className={cn("space-y-4", className)}
      dir={isArabic ? "rtl" : "ltr"}
    >
      {/* Drop zone */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative flex flex-col items-center justify-center",
          "p-8 rounded-lg border-2 border-dashed",
          "transition-all duration-200 cursor-pointer",
          isDragging
            ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
            : "border-neutral-300 dark:border-neutral-600 hover:border-primary-400",
          disabled && "opacity-50 cursor-not-allowed",
          !canAddMore && "opacity-50 cursor-not-allowed"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept.join(",")}
          multiple={multiple}
          onChange={handleInputChange}
          disabled={disabled || !canAddMore}
          className="hidden"
        />

        <Upload
          size={40}
          className={cn(
            "mb-4",
            isDragging ? "text-primary-500" : "text-neutral-400"
          )}
        />

        <p className="text-sm text-neutral-600 dark:text-neutral-400 text-center">
          {labels.dragDrop}{" "}
          <span className="text-primary-600 dark:text-primary-400 font-medium hover:underline">
            {labels.browse}
          </span>
        </p>

        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-500">
          {labels.acceptedFormats} {accept.map(getExtensionFromMime).join(", ")}
        </p>
        <p className="text-xs text-neutral-500 dark:text-neutral-500">
          {labels.maxSize} {formatFileSize(maxSize, locale)}
        </p>
      </div>

      {/* Error messages */}
      {errors.length > 0 && (
        <div
          className={cn(
            "p-3 rounded-lg",
            "bg-error-50 dark:bg-error-900/30",
            "border border-error-200 dark:border-error-800"
          )}
        >
          {errors.map((error, index) => (
            <p
              key={index}
              className="text-sm text-error-700 dark:text-error-300 flex items-center gap-2"
            >
              <AlertCircle size={14} />
              {error}
            </p>
          ))}
        </div>
      )}

      {/* File list */}
      {allFiles.length > 0 && (
        <div className="space-y-2">{allFiles.map(renderFileItem)}</div>
      )}
    </div>
  );
};

DocumentUploader.displayName = "DocumentUploader";

export { DocumentUploader };
