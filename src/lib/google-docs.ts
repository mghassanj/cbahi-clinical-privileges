/**
 * CBAHI Clinical Privileges - Google Docs Service
 *
 * Handles all Google Docs operations for document generation including:
 * - Template copying and management
 * - Placeholder replacement
 * - Checkbox handling for forms
 */

import { google, docs_v1 } from 'googleapis';
import { JWT } from 'google-auth-library';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface ServiceAccountCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

export interface PlaceholderData {
  [key: string]: string | number | Date | undefined | null;
}

export interface CheckboxData {
  [key: string]: boolean;
}

export interface TableRowData {
  cells: string[];
}

export interface TableData {
  headers?: string[];
  rows: TableRowData[];
}

export interface DocumentInfo {
  documentId: string;
  title: string;
  revisionId: string;
}

export interface ReplaceResult {
  replacementsCount: number;
  placeholdersFound: string[];
  placeholdersNotFound: string[];
}

// ============================================================================
// Constants
// ============================================================================

const SCOPES = [
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/drive',
];

// Checkbox symbols
const CHECKBOX_CHECKED = '\u2611'; // ☑
const CHECKBOX_UNCHECKED = '\u2610'; // ☐

// Alternative checkbox symbols (if Unicode not supported)
const CHECKBOX_CHECKED_ALT = '[X]';
const CHECKBOX_UNCHECKED_ALT = '[ ]';

// Placeholder pattern: {{placeholder_name}}
const PLACEHOLDER_REGEX = /\{\{([^}]+)\}\}/g;

// ============================================================================
// Google Docs Service Class
// ============================================================================

export class GoogleDocsService {
  private docs: docs_v1.Docs;
  private auth: JWT;
  private useUnicodeCheckboxes: boolean;

  /**
   * Initialize Google Docs service with service account credentials
   * @param serviceAccountKey - JSON string or parsed credentials object
   * @param useUnicodeCheckboxes - Whether to use Unicode checkbox symbols (default: true)
   */
  constructor(
    serviceAccountKey: string | ServiceAccountCredentials,
    useUnicodeCheckboxes: boolean = true
  ) {
    const credentials: ServiceAccountCredentials =
      typeof serviceAccountKey === 'string'
        ? JSON.parse(serviceAccountKey)
        : serviceAccountKey;

    this.auth = new JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: SCOPES,
    });

    this.docs = google.docs({ version: 'v1', auth: this.auth });
    this.useUnicodeCheckboxes = useUnicodeCheckboxes;
  }

  // ==========================================================================
  // Template Operations
  // ==========================================================================

  /**
   * Copy a template document to a new location
   * Uses the Drive API to copy, then returns the new document ID
   * @param templateId - Source template document ID
   * @param newName - Name for the new document
   * @param folderId - Target folder ID
   * @returns New document ID
   */
  async copyTemplate(templateId: string, newName: string, folderId: string): Promise<string> {
    try {
      const drive = google.drive({ version: 'v3', auth: this.auth });

      const response = await drive.files.copy({
        fileId: templateId,
        requestBody: {
          name: newName,
          parents: [folderId],
        },
        fields: 'id',
      });

      if (!response.data.id) {
        throw new Error('Failed to copy template: No ID returned');
      }

      return response.data.id;
    } catch (error) {
      throw this.handleError('copyTemplate', error);
    }
  }

  // ==========================================================================
  // Placeholder Operations
  // ==========================================================================

  /**
   * Fill placeholders in a document with actual data
   * Placeholders should be in the format: {{placeholder_name}}
   * @param docId - Document ID
   * @param data - Key-value pairs of placeholder names and values
   * @returns Result with replacement statistics
   */
  async fillPlaceholders(docId: string, data: PlaceholderData): Promise<ReplaceResult> {
    try {
      // First, get the document to find all placeholders
      const doc = await this.getDocument(docId);
      const foundPlaceholders = this.extractPlaceholders(doc);

      const requests: docs_v1.Schema$Request[] = [];
      const placeholdersFound: string[] = [];
      const placeholdersNotFound: string[] = [];

      // Build replacement requests
      for (const placeholder of foundPlaceholders) {
        const value = data[placeholder];

        if (value !== undefined && value !== null) {
          placeholdersFound.push(placeholder);

          const textValue = this.formatValue(value);
          requests.push({
            replaceAllText: {
              containsText: {
                text: `{{${placeholder}}}`,
                matchCase: false,
              },
              replaceText: textValue,
            },
          });
        } else {
          placeholdersNotFound.push(placeholder);
        }
      }

      // Also process any data keys that might not have been found in the document scan
      for (const [key, value] of Object.entries(data)) {
        if (!foundPlaceholders.includes(key) && value !== undefined && value !== null) {
          const textValue = this.formatValue(value);
          requests.push({
            replaceAllText: {
              containsText: {
                text: `{{${key}}}`,
                matchCase: false,
              },
              replaceText: textValue,
            },
          });
        }
      }

      // Execute batch update if there are requests
      if (requests.length > 0) {
        await this.docs.documents.batchUpdate({
          documentId: docId,
          requestBody: { requests },
        });
      }

      return {
        replacementsCount: placeholdersFound.length,
        placeholdersFound,
        placeholdersNotFound,
      };
    } catch (error) {
      throw this.handleError('fillPlaceholders', error);
    }
  }

  /**
   * Replace checkbox placeholders with checked/unchecked symbols
   * @param docId - Document ID
   * @param checkboxes - Key-value pairs of checkbox names and their states
   */
  async fillCheckboxes(docId: string, checkboxes: CheckboxData): Promise<void> {
    try {
      const requests: docs_v1.Schema$Request[] = [];
      const checkedSymbol = this.useUnicodeCheckboxes ? CHECKBOX_CHECKED : CHECKBOX_CHECKED_ALT;
      const uncheckedSymbol = this.useUnicodeCheckboxes ? CHECKBOX_UNCHECKED : CHECKBOX_UNCHECKED_ALT;

      for (const [key, isChecked] of Object.entries(checkboxes)) {
        const symbol = isChecked ? checkedSymbol : uncheckedSymbol;

        requests.push({
          replaceAllText: {
            containsText: {
              text: `{{${key}}}`,
              matchCase: false,
            },
            replaceText: symbol,
          },
        });

        // Also handle alternative formats
        requests.push({
          replaceAllText: {
            containsText: {
              text: `{{checkbox_${key}}}`,
              matchCase: false,
            },
            replaceText: symbol,
          },
        });
      }

      if (requests.length > 0) {
        await this.docs.documents.batchUpdate({
          documentId: docId,
          requestBody: { requests },
        });
      }
    } catch (error) {
      throw this.handleError('fillCheckboxes', error);
    }
  }

  /**
   * Replace all remaining unfilled placeholders with empty string or default value
   * @param docId - Document ID
   * @param defaultValue - Value to use for unfilled placeholders (default: empty string)
   */
  async clearUnfilledPlaceholders(docId: string, defaultValue: string = ''): Promise<string[]> {
    try {
      const doc = await this.getDocument(docId);
      const placeholders = this.extractPlaceholders(doc);
      const requests: docs_v1.Schema$Request[] = [];

      for (const placeholder of placeholders) {
        requests.push({
          replaceAllText: {
            containsText: {
              text: `{{${placeholder}}}`,
              matchCase: false,
            },
            replaceText: defaultValue,
          },
        });
      }

      if (requests.length > 0) {
        await this.docs.documents.batchUpdate({
          documentId: docId,
          requestBody: { requests },
        });
      }

      return placeholders;
    } catch (error) {
      throw this.handleError('clearUnfilledPlaceholders', error);
    }
  }

  // ==========================================================================
  // Document Operations
  // ==========================================================================

  /**
   * Get document metadata and content
   * @param docId - Document ID
   * @returns Full document object
   */
  async getDocument(docId: string): Promise<docs_v1.Schema$Document> {
    try {
      const response = await this.docs.documents.get({
        documentId: docId,
      });

      return response.data;
    } catch (error) {
      throw this.handleError('getDocument', error);
    }
  }

  /**
   * Get document information (ID, title, revision)
   * @param docId - Document ID
   * @returns Document info object
   */
  async getDocumentInfo(docId: string): Promise<DocumentInfo> {
    try {
      const doc = await this.getDocument(docId);

      return {
        documentId: doc.documentId || docId,
        title: doc.title || 'Untitled',
        revisionId: doc.revisionId || '',
      };
    } catch (error) {
      throw this.handleError('getDocumentInfo', error);
    }
  }

  /**
   * Get all text content from a document
   * @param docId - Document ID
   * @returns Plain text content
   */
  async getDocumentText(docId: string): Promise<string> {
    try {
      const doc = await this.getDocument(docId);
      return this.extractText(doc);
    } catch (error) {
      throw this.handleError('getDocumentText', error);
    }
  }

  /**
   * Create a new document
   * @param title - Document title
   * @returns New document ID
   */
  async createDocument(title: string): Promise<string> {
    try {
      const response = await this.docs.documents.create({
        requestBody: { title },
      });

      if (!response.data.documentId) {
        throw new Error('Failed to create document: No ID returned');
      }

      return response.data.documentId;
    } catch (error) {
      throw this.handleError('createDocument', error);
    }
  }

  /**
   * Insert text at the end of a document
   * @param docId - Document ID
   * @param text - Text to insert
   */
  async appendText(docId: string, text: string): Promise<void> {
    try {
      const doc = await this.getDocument(docId);
      const endIndex = this.getDocumentEndIndex(doc);

      await this.docs.documents.batchUpdate({
        documentId: docId,
        requestBody: {
          requests: [
            {
              insertText: {
                location: { index: endIndex - 1 },
                text,
              },
            },
          ],
        },
      });
    } catch (error) {
      throw this.handleError('appendText', error);
    }
  }

  /**
   * Update document title
   * @param docId - Document ID
   * @param title - New title
   */
  async updateTitle(docId: string, title: string): Promise<void> {
    try {
      const drive = google.drive({ version: 'v3', auth: this.auth });

      await drive.files.update({
        fileId: docId,
        requestBody: { name: title },
      });
    } catch (error) {
      throw this.handleError('updateTitle', error);
    }
  }

  // ==========================================================================
  // Table Operations
  // ==========================================================================

  /**
   * Find and populate a table in the document
   * Note: This is a basic implementation. For complex tables, consider using
   * the raw batchUpdate API with specific table indices.
   * @param docId - Document ID
   * @param tableIndex - Zero-based index of the table in the document
   * @param data - Table data to insert
   */
  async populateTable(docId: string, tableIndex: number, data: TableData): Promise<void> {
    try {
      const doc = await this.getDocument(docId);
      const tables = this.findTables(doc);

      if (tableIndex >= tables.length) {
        throw new Error(`Table index ${tableIndex} not found. Document has ${tables.length} tables.`);
      }

      // Note: Table manipulation in Google Docs API is complex.
      // This is a simplified version - actual implementation would use tables[tableIndex]
      // to build requests for updating cell content.
      // For full table support, additional logic would be needed.

      const requests: docs_v1.Schema$Request[] = [];

      // Placeholder: In production, iterate through data.rows and build requests
      // using the table structure from tables[tableIndex]
      void data.rows; // Mark as intentionally unused for now

      if (requests.length > 0) {
        await this.docs.documents.batchUpdate({
          documentId: docId,
          requestBody: { requests },
        });
      }
    } catch (error) {
      throw this.handleError('populateTable', error);
    }
  }

  // ==========================================================================
  // Batch Operations
  // ==========================================================================

  /**
   * Execute multiple text replacements in a single batch
   * @param docId - Document ID
   * @param replacements - Array of {find, replace} pairs
   */
  async batchReplace(
    docId: string,
    replacements: Array<{ find: string; replace: string }>
  ): Promise<void> {
    try {
      const requests: docs_v1.Schema$Request[] = replacements.map(({ find, replace }) => ({
        replaceAllText: {
          containsText: {
            text: find,
            matchCase: false,
          },
          replaceText: replace,
        },
      }));

      if (requests.length > 0) {
        await this.docs.documents.batchUpdate({
          documentId: docId,
          requestBody: { requests },
        });
      }
    } catch (error) {
      throw this.handleError('batchReplace', error);
    }
  }

  /**
   * Execute raw batch update requests
   * @param docId - Document ID
   * @param requests - Array of update requests
   */
  async batchUpdate(docId: string, requests: docs_v1.Schema$Request[]): Promise<void> {
    try {
      if (requests.length > 0) {
        await this.docs.documents.batchUpdate({
          documentId: docId,
          requestBody: { requests },
        });
      }
    } catch (error) {
      throw this.handleError('batchUpdate', error);
    }
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Get the underlying Docs client for advanced operations
   */
  getDocsClient(): docs_v1.Docs {
    return this.docs;
  }

  /**
   * Extract all placeholders from a document
   * @param doc - Document object
   * @returns Array of placeholder names (without curly braces)
   */
  extractPlaceholders(doc: docs_v1.Schema$Document): string[] {
    const text = this.extractText(doc);
    const placeholders: Set<string> = new Set();

    let match;
    while ((match = PLACEHOLDER_REGEX.exec(text)) !== null) {
      placeholders.add(match[1]);
    }

    // Reset regex state
    PLACEHOLDER_REGEX.lastIndex = 0;

    return Array.from(placeholders);
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  private extractText(doc: docs_v1.Schema$Document): string {
    let text = '';

    const body = doc.body;
    if (!body || !body.content) {
      return text;
    }

    for (const element of body.content) {
      text += this.extractTextFromElement(element);
    }

    return text;
  }

  private extractTextFromElement(element: docs_v1.Schema$StructuralElement): string {
    let text = '';

    if (element.paragraph) {
      for (const paragraphElement of element.paragraph.elements || []) {
        if (paragraphElement.textRun) {
          text += paragraphElement.textRun.content || '';
        }
      }
    }

    if (element.table) {
      for (const row of element.table.tableRows || []) {
        for (const cell of row.tableCells || []) {
          for (const cellElement of cell.content || []) {
            text += this.extractTextFromElement(cellElement);
          }
        }
      }
    }

    if (element.tableOfContents) {
      for (const tocElement of element.tableOfContents.content || []) {
        text += this.extractTextFromElement(tocElement);
      }
    }

    return text;
  }

  private findTables(doc: docs_v1.Schema$Document): docs_v1.Schema$Table[] {
    const tables: docs_v1.Schema$Table[] = [];
    const body = doc.body;

    if (!body || !body.content) {
      return tables;
    }

    for (const element of body.content) {
      if (element.table) {
        tables.push(element.table);
      }
    }

    return tables;
  }

  private getDocumentEndIndex(doc: docs_v1.Schema$Document): number {
    const body = doc.body;
    if (!body || !body.content || body.content.length === 0) {
      return 1;
    }

    const lastElement = body.content[body.content.length - 1];
    return lastElement.endIndex || 1;
  }

  private formatValue(value: string | number | Date | undefined | null): string {
    if (value === undefined || value === null) {
      return '';
    }

    if (value instanceof Date) {
      return this.formatDate(value);
    }

    return String(value);
  }

  private formatDate(date: Date): string {
    // Format as YYYY-MM-DD or customize as needed
    return date.toISOString().split('T')[0];
  }

  private handleError(operation: string, error: unknown): Error {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`GoogleDocsService.${operation} error:`, error);
    return new Error(`Google Docs ${operation} failed: ${message}`);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a Google Docs service instance from environment variables
 * Expects GOOGLE_SERVICE_ACCOUNT_KEY environment variable
 */
export function createGoogleDocsService(useUnicodeCheckboxes: boolean = true): GoogleDocsService {
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKey) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY environment variable is required');
  }

  return new GoogleDocsService(serviceAccountKey, useUnicodeCheckboxes);
}

// ============================================================================
// Helper Functions for Common Placeholders
// ============================================================================

/**
 * Generate standard CBAHI placeholders from applicant data
 */
export function generateApplicantPlaceholders(applicant: {
  nameEn: string;
  nameAr: string;
  idNumber?: string;
  scfhsNumber?: string;
  department?: string;
  departmentAr?: string;
  jobTitle?: string;
  jobTitleAr?: string;
  specialty?: string;
  specialtyAr?: string;
}): PlaceholderData {
  return {
    applicant_name: applicant.nameEn,
    applicant_name_ar: applicant.nameAr,
    id_number: applicant.idNumber,
    scfhs_number: applicant.scfhsNumber,
    department: applicant.department,
    department_ar: applicant.departmentAr,
    job_title: applicant.jobTitle,
    job_title_ar: applicant.jobTitleAr,
    specialty: applicant.specialty,
    specialty_ar: applicant.specialtyAr,
  };
}

/**
 * Generate date-related placeholders
 */
export function generateDatePlaceholders(date: Date = new Date()): PlaceholderData {
  const hijriDate = formatHijriDate(date);

  return {
    date: formatGregorianDate(date),
    date_full: formatGregorianDateFull(date),
    date_ar: formatArabicDate(date),
    date_hijri: hijriDate,
    year: date.getFullYear().toString(),
    month: (date.getMonth() + 1).toString().padStart(2, '0'),
    day: date.getDate().toString().padStart(2, '0'),
  };
}

// Date formatting helpers
function formatGregorianDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatGregorianDateFull(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatArabicDate(date: Date): string {
  return date.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatHijriDate(date: Date): string {
  // Note: This is a simplified conversion. For production, use a proper Hijri calendar library
  return date.toLocaleDateString('ar-SA-u-ca-islamic', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export {
  CHECKBOX_CHECKED,
  CHECKBOX_UNCHECKED,
  CHECKBOX_CHECKED_ALT,
  CHECKBOX_UNCHECKED_ALT,
  PLACEHOLDER_REGEX,
};
