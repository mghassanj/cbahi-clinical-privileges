/**
 * CBAHI Clinical Privileges - PDF Generation Module
 *
 * This module provides PDF generation capabilities for the application,
 * including certificate generation for approved privilege requests.
 */

// Certificate Template
export {
  CertificateDocument,
} from "./certificate-template";
export type {
  CertificateData,
  PrivilegeItem,
  ApproverSignature,
} from "./certificate-template";

// Certificate Generator
export {
  CertificateGenerator,
  createCertificateGenerator,
  isEligibleForCertificate,
  getCertificateFilename,
} from "./certificate-generator";
export type {
  RequestForCertificate,
  CertificateResult,
} from "./certificate-generator";
