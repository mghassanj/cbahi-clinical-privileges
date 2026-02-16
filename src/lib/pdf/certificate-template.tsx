/**
 * CBAHI Clinical Privileges - Certificate Template
 *
 * Professional PDF certificate template using @react-pdf/renderer.
 * Supports bilingual content (English and Arabic).
 */

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from "@react-pdf/renderer";

// ============================================================================
// Font Registration
// ============================================================================

import path from "path";
import fs from "fs";

// Register custom fonts for bilingual support
// Using local fonts to avoid network issues

// Find the correct public/fonts directory
const findFontsDir = () => {
  const possiblePaths = [
    // Railway/Docker standalone build - public is copied to root
    path.join(process.cwd(), "public", "fonts"),
    // Development mode
    path.resolve("./public/fonts"),
    // Next.js server build
    path.join(process.cwd(), ".next", "server", "public", "fonts"),
    // Relative to this file
    path.join(__dirname, "..", "..", "..", "public", "fonts"),
    path.join(__dirname, "..", "public", "fonts"),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      console.log(`✓ Found fonts directory at: ${p}`);
      // Verify at least one font file exists
      const testFont = path.join(p, "Roboto-Regular.ttf");
      if (fs.existsSync(testFont)) {
        console.log(`✓ Verified font file: ${testFont}`);
        return p;
      }
    }
  }
  
  console.error("❌ Could not find fonts directory! Checked paths:", possiblePaths);
  // Fallback - will likely fail but provides clear error
  return path.join(process.cwd(), "public", "fonts");
};

const fontsDir = findFontsDir();

// Helper to safely register font with error handling
const registerFontSafely = (family: string, regular: string, bold: string) => {
  try {
    const regularPath = path.join(fontsDir, regular);
    const boldPath = path.join(fontsDir, bold);
    
    // Check if files exist before registering
    if (!fs.existsSync(regularPath)) {
      throw new Error(`Font file not found: ${regularPath}`);
    }
    if (!fs.existsSync(boldPath)) {
      throw new Error(`Font file not found: ${boldPath}`);
    }
    
    Font.register({
      family,
      fonts: [
        { src: regularPath, fontWeight: 400 },
        { src: boldPath, fontWeight: 700 },
      ],
    });
    
    console.log(`✓ Registered font family: ${family}`);
  } catch (error) {
    console.error(`❌ Failed to register ${family} font:`, error);
    throw error; // Re-throw to prevent silent failures
  }
};

// Register fonts with error handling
registerFontSafely("Roboto", "Roboto-Regular.ttf", "Roboto-Bold.ttf");
// Use Noto Sans Arabic instead of Amiri for better fontkit compatibility
registerFontSafely("Amiri", "NotoSansArabic-Regular.ttf", "NotoSansArabic-Bold.ttf");

// ============================================================================
// Types
// ============================================================================

export interface PrivilegeItem {
  code: string;
  nameEn: string;
  nameAr: string;
  category: string;
}

export interface ApproverSignature {
  nameEn: string;
  nameAr: string;
  role: string;
  roleAr: string;
  approvedAt: string;
}

export interface CertificateData {
  // Certificate metadata
  certificateNumber: string;
  issueDate: string;
  validUntil: string;

  // Practitioner information
  practitioner: {
    nameEn: string;
    nameAr: string;
    employeeCode: string;
    scfhsNo?: string;
    departmentEn: string;
    departmentAr: string;
    jobTitleEn: string;
    jobTitleAr: string;
    hospitalCenter?: string;
  };

  // Approved privileges
  privileges: PrivilegeItem[];

  // Approval chain signatures
  approvers: ApproverSignature[];

  // QR code verification URL (base64 image data)
  qrCodeDataUrl?: string;
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#ffffff",
    padding: 40,
    fontFamily: "Roboto",
  },

  // Header with CBAHI branding
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    borderBottom: "2px solid #004d40",
    paddingBottom: 15,
  },
  logoContainer: {
    width: 100,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  logoPlaceholder: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#004d40",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  headerTitleEn: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#004d40",
    textAlign: "center",
    marginBottom: 4,
  },
  headerTitleAr: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#004d40",
    textAlign: "center",
    fontFamily: "Amiri",
    direction: "rtl",
  },
  headerSubtitle: {
    fontSize: 10,
    color: "#666666",
    textAlign: "center",
    marginTop: 4,
  },

  // Certificate title
  titleSection: {
    alignItems: "center",
    marginVertical: 20,
  },
  certificateTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#004d40",
    textAlign: "center",
    letterSpacing: 2,
  },
  certificateTitleAr: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#004d40",
    textAlign: "center",
    fontFamily: "Amiri",
    direction: "rtl",
    marginTop: 8,
  },
  certificateNumber: {
    fontSize: 10,
    color: "#666666",
    marginTop: 8,
  },

  // Practitioner info section
  practitionerSection: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#004d40",
    marginBottom: 10,
    borderBottom: "1px solid #e0e0e0",
    paddingBottom: 5,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 9,
    color: "#666666",
    width: 120,
  },
  infoValue: {
    fontSize: 10,
    color: "#333333",
    flex: 1,
  },
  infoValueAr: {
    fontSize: 10,
    color: "#333333",
    flex: 1,
    fontFamily: "Amiri",
    textAlign: "right",
  },
  bilingualName: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingBottom: 10,
    borderBottom: "1px solid #e0e0e0",
  },
  nameEn: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333333",
  },
  nameAr: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333333",
    fontFamily: "Amiri",
  },

  // Privileges section
  privilegesSection: {
    marginBottom: 20,
  },
  privilegesHeader: {
    flexDirection: "row",
    backgroundColor: "#004d40",
    padding: 8,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  privilegeHeaderCell: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#ffffff",
  },
  privilegeCodeHeader: {
    width: 60,
  },
  privilegeNameHeader: {
    flex: 1,
  },
  privilegeCategoryHeader: {
    width: 100,
  },
  privilegeRow: {
    flexDirection: "row",
    padding: 6,
    borderBottom: "1px solid #e0e0e0",
    backgroundColor: "#ffffff",
  },
  privilegeRowAlt: {
    backgroundColor: "#fafafa",
  },
  privilegeCell: {
    fontSize: 8,
    color: "#333333",
  },
  privilegeCodeCell: {
    width: 60,
    fontWeight: "bold",
    color: "#004d40",
  },
  privilegeNameCell: {
    flex: 1,
  },
  privilegeNameEn: {
    fontSize: 8,
    color: "#333333",
    marginBottom: 2,
  },
  privilegeNameAr: {
    fontSize: 8,
    color: "#666666",
    fontFamily: "Amiri",
  },
  privilegeCategoryCell: {
    width: 100,
    fontSize: 7,
    color: "#666666",
  },

  // Validity section
  validitySection: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#e8f5e9",
    borderRadius: 4,
    padding: 12,
    marginBottom: 20,
  },
  validityItem: {
    alignItems: "center",
  },
  validityLabel: {
    fontSize: 8,
    color: "#666666",
    marginBottom: 2,
  },
  validityValue: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#2e7d32",
  },

  // Signatures section
  signaturesSection: {
    marginBottom: 20,
  },
  signaturesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  signatureBlock: {
    width: "48%",
    marginBottom: 15,
    padding: 10,
    borderRadius: 4,
    border: "1px solid #e0e0e0",
  },
  signaturePlaceholder: {
    height: 40,
    borderBottom: "1px dashed #999999",
    marginBottom: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  signaturePlaceholderText: {
    fontSize: 8,
    color: "#999999",
    fontStyle: "italic",
  },
  signatureName: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#333333",
    textAlign: "center",
  },
  signatureNameAr: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#333333",
    fontFamily: "Amiri",
    textAlign: "center",
  },
  signatureRole: {
    fontSize: 8,
    color: "#666666",
    textAlign: "center",
    marginTop: 2,
  },
  signatureDate: {
    fontSize: 7,
    color: "#999999",
    textAlign: "center",
    marginTop: 4,
  },

  // Footer with QR code
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: "auto",
    paddingTop: 15,
    borderTop: "1px solid #e0e0e0",
  },
  qrSection: {
    alignItems: "center",
  },
  qrPlaceholder: {
    width: 70,
    height: 70,
    border: "1px solid #e0e0e0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  qrImage: {
    width: 70,
    height: 70,
    marginBottom: 4,
  },
  qrText: {
    fontSize: 6,
    color: "#999999",
    textAlign: "center",
  },
  footerText: {
    flex: 1,
    paddingHorizontal: 20,
  },
  footerNote: {
    fontSize: 7,
    color: "#999999",
    textAlign: "center",
    marginBottom: 2,
  },
  footerNoteAr: {
    fontSize: 7,
    color: "#999999",
    textAlign: "center",
    fontFamily: "Amiri",
    marginBottom: 4,
  },

  // Watermark
  watermark: {
    position: "absolute",
    top: "40%",
    left: "20%",
    transform: "rotate(-30deg)",
    opacity: 0.05,
  },
  watermarkText: {
    fontSize: 60,
    fontWeight: "bold",
    color: "#004d40",
  },
});

// ============================================================================
// Certificate Document Component
// ============================================================================

export const CertificateDocument: React.FC<{ data: CertificateData }> = ({
  data,
}) => {
  const formatCategory = (category: string): string => {
    return category
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Watermark */}
        <View style={styles.watermark} fixed>
          <Text style={styles.watermarkText}>CBAHI</Text>
        </View>

        {/* Header with CBAHI branding */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoPlaceholder}>CBAHI</Text>
          </View>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitleEn}>
              Saudi Central Board for Accreditation of Healthcare Institutions
            </Text>
            <Text style={styles.headerTitleAr}>
              المجلس المركزي لاعتماد المنشآت الصحية
            </Text>
            <Text style={styles.headerSubtitle}>
              Clinical Privileges Management System
            </Text>
          </View>
          <View style={styles.logoContainer}>
            {/* Placeholder for additional logo */}
          </View>
        </View>

        {/* Certificate Title */}
        <View style={styles.titleSection}>
          <Text style={styles.certificateTitle}>
            CLINICAL PRIVILEGES CERTIFICATE
          </Text>
          <Text style={styles.certificateTitleAr}>
            شهادة الامتيازات السريرية
          </Text>
          <Text style={styles.certificateNumber}>
            Certificate No: {data.certificateNumber}
          </Text>
        </View>

        {/* Practitioner Information */}
        <View style={styles.practitionerSection}>
          <Text style={styles.sectionTitle}>Practitioner Information</Text>
          <View style={styles.bilingualName}>
            <Text style={styles.nameEn}>{data.practitioner.nameEn}</Text>
            <Text style={styles.nameAr}>{data.practitioner.nameAr}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Employee Code:</Text>
            <Text style={styles.infoValue}>
              {data.practitioner.employeeCode}
            </Text>
          </View>
          {data.practitioner.scfhsNo && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>SCFHS Registration:</Text>
              <Text style={styles.infoValue}>{data.practitioner.scfhsNo}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Department:</Text>
            <Text style={styles.infoValue}>
              {data.practitioner.departmentEn} / {data.practitioner.departmentAr}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Position:</Text>
            <Text style={styles.infoValue}>
              {data.practitioner.jobTitleEn} / {data.practitioner.jobTitleAr}
            </Text>
          </View>
          {data.practitioner.hospitalCenter && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Hospital/Center:</Text>
              <Text style={styles.infoValue}>
                {data.practitioner.hospitalCenter}
              </Text>
            </View>
          )}
        </View>

        {/* Validity Period */}
        <View style={styles.validitySection}>
          <View style={styles.validityItem}>
            <Text style={styles.validityLabel}>Issue Date</Text>
            <Text style={styles.validityValue}>{data.issueDate}</Text>
          </View>
          <View style={styles.validityItem}>
            <Text style={styles.validityLabel}>Valid Until</Text>
            <Text style={styles.validityValue}>{data.validUntil}</Text>
          </View>
          <View style={styles.validityItem}>
            <Text style={styles.validityLabel}>Privileges Granted</Text>
            <Text style={styles.validityValue}>{data.privileges.length}</Text>
          </View>
        </View>

        {/* Approved Privileges */}
        <View style={styles.privilegesSection}>
          <Text style={styles.sectionTitle}>Approved Clinical Privileges</Text>
          <View style={styles.privilegesHeader}>
            <Text style={[styles.privilegeHeaderCell, styles.privilegeCodeHeader]}>
              Code
            </Text>
            <Text style={[styles.privilegeHeaderCell, styles.privilegeNameHeader]}>
              Privilege Name
            </Text>
            <Text
              style={[styles.privilegeHeaderCell, styles.privilegeCategoryHeader]}
            >
              Category
            </Text>
          </View>
          {data.privileges.map((privilege, index) => (
            <View
              key={privilege.code}
              style={[
                styles.privilegeRow,
                index % 2 === 1 ? styles.privilegeRowAlt : {},
              ]}
            >
              <Text style={[styles.privilegeCell, styles.privilegeCodeCell]}>
                {privilege.code}
              </Text>
              <View style={styles.privilegeNameCell}>
                <Text style={styles.privilegeNameEn}>{privilege.nameEn}</Text>
                <Text style={styles.privilegeNameAr}>{privilege.nameAr}</Text>
              </View>
              <Text style={[styles.privilegeCell, styles.privilegeCategoryCell]}>
                {formatCategory(privilege.category)}
              </Text>
            </View>
          ))}
        </View>

        {/* Approval Signatures */}
        <View style={styles.signaturesSection}>
          <Text style={styles.sectionTitle}>Approval Signatures</Text>
          <View style={styles.signaturesGrid}>
            {data.approvers.map((approver, index) => (
              <View key={index} style={styles.signatureBlock}>
                <View style={styles.signaturePlaceholder}>
                  <Text style={styles.signaturePlaceholderText}>
                    [Digital Signature]
                  </Text>
                </View>
                <Text style={styles.signatureName}>{approver.nameEn}</Text>
                <Text style={styles.signatureNameAr}>{approver.nameAr}</Text>
                <Text style={styles.signatureRole}>
                  {approver.role} / {approver.roleAr}
                </Text>
                <Text style={styles.signatureDate}>
                  Approved: {approver.approvedAt}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Footer with QR Code */}
        <View style={styles.footer}>
          <View style={styles.qrSection}>
            {data.qrCodeDataUrl ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image style={styles.qrImage} src={data.qrCodeDataUrl} />
            ) : (
              <View style={styles.qrPlaceholder}>
                <Text style={styles.qrText}>QR Code</Text>
              </View>
            )}
            <Text style={styles.qrText}>Scan to verify</Text>
          </View>
          <View style={styles.footerText}>
            <Text style={styles.footerNote}>
              This certificate is issued electronically and is valid without a
              physical signature.
            </Text>
            <Text style={styles.footerNoteAr}>
              هذه الشهادة صادرة إلكترونياً وصالحة بدون توقيع فعلي.
            </Text>
            <Text style={styles.footerNote}>
              Verify authenticity at: verify.cbahi.gov.sa/{data.certificateNumber}
            </Text>
          </View>
          <View style={styles.qrSection}>
            {/* Placeholder for second QR or logo */}
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default CertificateDocument;
