/**
 * CBAHI Email Notification System - Type Definitions
 *
 * This file contains all TypeScript interfaces and types for the notification system.
 */

// ============================================================================
// Core Enums
// ============================================================================

export enum NotificationType {
  APPROVAL_REQUIRED = 'APPROVAL_REQUIRED',
  APPROVAL_PROGRESS = 'APPROVAL_PROGRESS',
  APPROVAL_COMPLETE = 'APPROVAL_COMPLETE',
  REJECTION = 'REJECTION',
  MODIFICATIONS_REQUESTED = 'MODIFICATIONS_REQUESTED',
  ESCALATION_REMINDER = 'ESCALATION_REMINDER',
  ESCALATION_MANAGER = 'ESCALATION_MANAGER',
  ESCALATION_HR = 'ESCALATION_HR',
}

export enum RequestStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  MODIFICATIONS_REQUIRED = 'MODIFICATIONS_REQUIRED',
  CANCELLED = 'CANCELLED',
}

export enum PrivilegeCategory {
  CLINICAL = 'CLINICAL',
  SURGICAL = 'SURGICAL',
  DIAGNOSTIC = 'DIAGNOSTIC',
  ADMINISTRATIVE = 'ADMINISTRATIVE',
  CONSULTATION = 'CONSULTATION',
}

export enum EscalationLevel {
  NONE = 0,
  REMINDER = 1,
  MANAGER = 2,
  HR = 3,
}

export enum EmailProviderType {
  GMAIL_SMTP = 'GMAIL_SMTP',
  MICROSOFT_GRAPH = 'MICROSOFT_GRAPH',
}

// ============================================================================
// User & Organization Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  nameEn: string;
  nameAr: string;
  title?: string;
  titleAr?: string;
  department?: string;
  departmentAr?: string;
  phone?: string;
  managerId?: string;
}

export interface Approver extends User {
  role: string;
  roleAr: string;
  level: number;
  canDelegate: boolean;
  delegateTo?: string;
}

export interface Applicant extends User {
  employeeId: string;
  specialty?: string;
  specialtyAr?: string;
  licenseNumber?: string;
  licenseExpiry?: Date;
  yearsOfExperience?: number;
}

// ============================================================================
// Privilege Types
// ============================================================================

export interface Privilege {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  category: PrivilegeCategory;
  description?: string;
  descriptionAr?: string;
  requiresSupervision: boolean;
  supervisionDuration?: number; // in months
}

export interface PrivilegeRequest {
  privilege: Privilege;
  justification?: string;
  justificationAr?: string;
  supportingDocuments?: string[];
}

// ============================================================================
// Approval Chain Types
// ============================================================================

export interface ApprovalStep {
  id: string;
  level: number;
  approver: Approver;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED';
  actionDate?: Date;
  comments?: string;
  commentsAr?: string;
}

export interface ApprovalChain {
  steps: ApprovalStep[];
  currentStep: number;
  totalSteps: number;
}

// ============================================================================
// Request Types
// ============================================================================

export interface PrivilegeApplicationRequest {
  id: string;
  requestNumber: string;
  applicant: Applicant;
  privileges: PrivilegeRequest[];
  approvalChain: ApprovalChain;
  status: RequestStatus;
  submittedAt: Date;
  updatedAt: Date;
  currentApprover?: Approver;
  urgency?: 'NORMAL' | 'HIGH' | 'URGENT';
  notes?: string;
  notesAr?: string;
}

// ============================================================================
// Notification Types
// ============================================================================

export interface NotificationRecipient {
  email: string;
  nameEn: string;
  nameAr: string;
}

export interface NotificationContext {
  request: PrivilegeApplicationRequest;
  recipient: NotificationRecipient;
  actionUrl: string;
  additionalData?: Record<string, unknown>;
}

export interface ApprovalProgressInfo {
  completedSteps: number;
  totalSteps: number;
  latestApprover: Approver;
  latestAction: 'APPROVED' | 'FORWARDED';
  latestComments?: string;
}

export interface RejectionInfo {
  rejectedBy: Approver;
  reason: string;
  reasonAr?: string;
  rejectedAt: Date;
  canResubmit: boolean;
}

export interface ModificationInfo {
  requestedBy: Approver;
  comments: string;
  commentsAr?: string;
  specificChanges?: string[];
  specificChangesAr?: string[];
  deadline?: Date;
}

export interface EscalationInfo {
  level: EscalationLevel;
  originalApprover: Approver;
  escalatedTo: User;
  hoursPending: number;
  previousReminders: number;
  escalatedAt: Date;
}

// ============================================================================
// Email Types
// ============================================================================

export interface EmailContent {
  subject: string;
  htmlBody: string;
  textBody: string;
}

export interface EmailMessage {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  htmlBody: string;
  textBody: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: Date;
}

// ============================================================================
// Provider Configuration Types
// ============================================================================

export interface GmailSmtpConfig {
  type: EmailProviderType.GMAIL_SMTP;
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: {
    name: string;
    address: string;
  };
}

export interface MicrosoftGraphConfig {
  type: EmailProviderType.MICROSOFT_GRAPH;
  clientId: string;
  clientSecret: string;
  tenantId: string;
  from: {
    name: string;
    address: string;
  };
}

export type EmailProviderConfig = GmailSmtpConfig | MicrosoftGraphConfig;

// ============================================================================
// Escalation Types
// ============================================================================

export interface EscalationRecord {
  id: string;
  requestId: string;
  approverId: string;
  level: EscalationLevel;
  createdAt: Date;
  notifiedAt: Date;
  resolvedAt?: Date;
  resolution?: 'APPROVED' | 'REJECTED' | 'DELEGATED' | 'EXPIRED';
}

export interface EscalationThresholds {
  reminderHours: number;
  managerHours: number;
  hrHours: number;
}

export interface PendingApproval {
  requestId: string;
  request: PrivilegeApplicationRequest;
  approverId: string;
  approver: Approver;
  pendingSince: Date;
  escalationLevel: EscalationLevel;
  lastReminderSent?: Date;
}

// ============================================================================
// Service Configuration Types
// ============================================================================

export interface NotificationServiceConfig {
  emailProvider: EmailProviderConfig;
  baseUrl: string;
  supportEmail: string;
  testingMode?: boolean;
  testingEmail?: string;
  escalationThresholds?: EscalationThresholds;
}

// ============================================================================
// Brand Configuration Types
// ============================================================================

export interface EmailBrandColors {
  primary: string;
  primaryDark: string;
  success: string;
  error: string;
  warning: string;
  info: string;
  textPrimary: string;
  textSecondary: string;
  background: string;
  backgroundAlt: string;
  border: string;
}

export interface EmailBrandConfig {
  organizationNameEn: string;
  organizationNameAr: string;
  logoUrl: string;
  colors: EmailBrandColors;
  footerTextEn: string;
  footerTextAr: string;
}

// ============================================================================
// Bilingual Text Types
// ============================================================================

export interface BilingualText {
  en: string;
  ar: string;
}

export interface EmailTitles {
  [NotificationType.APPROVAL_REQUIRED]: BilingualText;
  [NotificationType.APPROVAL_PROGRESS]: BilingualText;
  [NotificationType.APPROVAL_COMPLETE]: BilingualText;
  [NotificationType.REJECTION]: BilingualText;
  [NotificationType.MODIFICATIONS_REQUESTED]: BilingualText;
  [NotificationType.ESCALATION_REMINDER]: BilingualText;
  [NotificationType.ESCALATION_MANAGER]: BilingualText;
  [NotificationType.ESCALATION_HR]: BilingualText;
}
