/**
 * CBAHI Clinical Privileges Management System
 * Type Definitions
 */

import type { Locale } from "@/i18n/config";

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================================
// User Types
// ============================================================================

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  nameAr?: string;
  role: string;
  department?: string;
  isActive: boolean;
}

export interface SessionUser extends UserInfo {
  image?: string;
}

// ============================================================================
// Form Types
// ============================================================================

export interface SelectOption {
  value: string;
  label: string;
  labelAr?: string;
}

export interface FormFieldError {
  field: string;
  message: string;
}

// ============================================================================
// Table Types
// ============================================================================

export interface TableColumn<T> {
  key: keyof T | string;
  header: string;
  headerAr?: string;
  sortable?: boolean;
  width?: string;
  align?: "left" | "center" | "right";
  render?: (value: unknown, row: T) => React.ReactNode;
}

export interface TableSortState {
  column: string;
  direction: "asc" | "desc";
}

export interface TablePaginationState {
  page: number;
  pageSize: number;
}

// ============================================================================
// Notification Types
// ============================================================================

export interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  duration?: number;
}

// ============================================================================
// Page Props
// ============================================================================

export interface LocalePageProps {
  params: {
    locale: Locale;
  };
}

export interface LocaleLayoutProps {
  children: React.ReactNode;
  params: {
    locale: Locale;
  };
}

// ============================================================================
// Component Props
// ============================================================================

export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface WithLocale {
  locale: Locale;
}

// ============================================================================
// Search & Filter Types
// ============================================================================

export interface SearchFilters {
  query?: string;
  status?: string;
  department?: string;
  dateFrom?: string;
  dateTo?: string;
  [key: string]: string | undefined;
}

// ============================================================================
// Date & Time Types
// ============================================================================

export interface DateRange {
  from: Date;
  to: Date;
}

// ============================================================================
// File Types
// ============================================================================

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: Date;
}

// ============================================================================
// Audit Types
// ============================================================================

export interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  userId?: string;
  userName?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: Date;
}
