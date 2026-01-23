/**
 * CBAHI Custom UI Components
 *
 * This module exports all custom UI components built for the CBAHI
 * Clinical Privileges Management System.
 */

// Glass Morphism Card
export {
  LiquidGlassCard,
  LiquidGlassCardHeader,
  LiquidGlassCardTitle,
  LiquidGlassCardDescription,
  LiquidGlassCardContent,
  LiquidGlassCardFooter,
} from "./liquid-glass-card";
export type { LiquidGlassCardProps } from "./liquid-glass-card";

// Bilingual Text
export {
  BilingualText,
  useBilingualText,
  getLocalizedText,
} from "./bilingual-text";
export type { BilingualTextProps } from "./bilingual-text";

// Language Switcher
export { LanguageSwitcher, useLocalePreference } from "./language-switcher";
export type { LanguageSwitcherProps } from "./language-switcher";

// Step Wizard
export { StepWizard } from "./step-wizard";
export type { StepWizardProps, Step } from "./step-wizard";

// Request Status Badge
export {
  RequestStatusBadge,
  getStatusColor,
  getStatusLabel,
} from "./request-status-badge";
export type { RequestStatusBadgeProps } from "./request-status-badge";

// Approval Chain Timeline
export { ApprovalChainTimeline } from "./approval-chain-timeline";
export type {
  ApprovalChainTimelineProps,
  Approval,
} from "./approval-chain-timeline";

// Privilege Checkbox Group
export { PrivilegeCheckboxGroup } from "./privilege-checkbox-group";
export type {
  PrivilegeCheckboxGroupProps,
  PrivilegeItem,
} from "./privilege-checkbox-group";

// Document Uploader
export { DocumentUploader } from "./document-uploader";
export type {
  DocumentUploaderProps,
  UploadedFile,
} from "./document-uploader";

// Notification Bell
export { NotificationBell } from "./notification-bell";
export type {
  NotificationBellProps,
  Notification,
} from "./notification-bell";

// Escalation Banner
export { EscalationBanner } from "./escalation-banner";
export type { EscalationBannerProps } from "./escalation-banner";
