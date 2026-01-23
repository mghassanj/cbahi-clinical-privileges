/**
 * CBAHI Clinical Privileges - Google Drive Service
 *
 * Handles all Google Drive operations for document management including:
 * - Folder structure creation and management
 * - File uploads and permission management
 * - PDF export functionality
 */

import { google, drive_v3 } from 'googleapis';
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

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  webContentLink?: string;
  createdTime: string;
  modifiedTime: string;
  parents?: string[];
}

export interface FolderStructure {
  rootFolderId: string;
  employeesFolderId: string;
  templatesFolderId: string;
}

export interface EmployeeFolderInfo {
  folderId: string;
  folderName: string;
  webViewLink: string;
}

export interface RequestFolderInfo {
  folderId: string;
  attachmentsFolderId: string;
  folderName: string;
  webViewLink: string;
}

export interface DriveServiceConfig {
  rootFolderName: string;
  rootFolderId?: string; // Optional: use existing root folder
}

// ============================================================================
// Constants
// ============================================================================

const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
];

const MIME_TYPES = {
  FOLDER: 'application/vnd.google-apps.folder',
  DOCUMENT: 'application/vnd.google-apps.document',
  PDF: 'application/pdf',
  JPEG: 'image/jpeg',
  PNG: 'image/png',
  WORD: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
} as const;

// ============================================================================
// Google Drive Service Class
// ============================================================================

export class GoogleDriveService {
  private drive: drive_v3.Drive;
  private auth: JWT;
  private config: DriveServiceConfig;
  private folderCache: Map<string, string> = new Map();

  /**
   * Initialize Google Drive service with service account credentials
   * @param serviceAccountKey - JSON string or parsed credentials object
   * @param config - Service configuration options
   */
  constructor(
    serviceAccountKey: string | ServiceAccountCredentials,
    config: DriveServiceConfig = { rootFolderName: 'CBAHI Clinical Privileges' }
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

    this.drive = google.drive({ version: 'v3', auth: this.auth });
    this.config = config;
  }

  // ==========================================================================
  // Folder Operations
  // ==========================================================================

  /**
   * Create a new folder in Google Drive
   * @param name - Folder name
   * @param parentId - Optional parent folder ID
   * @returns The created folder ID
   */
  async createFolder(name: string, parentId?: string): Promise<string> {
    try {
      const fileMetadata: drive_v3.Schema$File = {
        name,
        mimeType: MIME_TYPES.FOLDER,
        parents: parentId ? [parentId] : undefined,
      };

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        fields: 'id, name, webViewLink',
      });

      if (!response.data.id) {
        throw new Error('Failed to create folder: No ID returned');
      }

      return response.data.id;
    } catch (error) {
      throw this.handleError('createFolder', error);
    }
  }

  /**
   * Get an existing folder by name or create it if it doesn't exist
   * @param name - Folder name
   * @param parentId - Optional parent folder ID
   * @returns The folder ID (existing or newly created)
   */
  async getOrCreateFolder(name: string, parentId?: string): Promise<string> {
    const cacheKey = `${parentId || 'root'}_${name}`;

    // Check cache first
    if (this.folderCache.has(cacheKey)) {
      return this.folderCache.get(cacheKey)!;
    }

    try {
      // Build query to find existing folder
      let query = `name = '${this.escapeQueryString(name)}' and mimeType = '${MIME_TYPES.FOLDER}' and trashed = false`;
      if (parentId) {
        query += ` and '${parentId}' in parents`;
      }

      const response = await this.drive.files.list({
        q: query,
        fields: 'files(id, name)',
        pageSize: 1,
      });

      let folderId: string;

      if (response.data.files && response.data.files.length > 0 && response.data.files[0].id) {
        folderId = response.data.files[0].id;
      } else {
        folderId = await this.createFolder(name, parentId);
      }

      // Cache the result
      this.folderCache.set(cacheKey, folderId);
      return folderId;
    } catch (error) {
      throw this.handleError('getOrCreateFolder', error);
    }
  }

  /**
   * Initialize the root folder structure for CBAHI Clinical Privileges
   * Creates: Root / Employees, Root / Templates
   * @returns Folder structure with IDs
   */
  async initializeFolderStructure(): Promise<FolderStructure> {
    try {
      const rootFolderId = this.config.rootFolderId || await this.getOrCreateFolder(this.config.rootFolderName);
      const employeesFolderId = await this.getOrCreateFolder('Employees', rootFolderId);
      const templatesFolderId = await this.getOrCreateFolder('Templates', rootFolderId);

      return {
        rootFolderId,
        employeesFolderId,
        templatesFolderId,
      };
    } catch (error) {
      throw this.handleError('initializeFolderStructure', error);
    }
  }

  /**
   * Create or get an employee's folder
   * Structure: Employees/{Employee Name} ({Employee Code})
   * @param employeeName - Full name of the employee
   * @param employeeCode - Employee's unique code/ID
   * @returns Employee folder information
   */
  async createEmployeeFolder(employeeName: string, employeeCode: string): Promise<EmployeeFolderInfo> {
    try {
      const structure = await this.initializeFolderStructure();
      const folderName = `${employeeName} (${employeeCode})`;
      const folderId = await this.getOrCreateFolder(folderName, structure.employeesFolderId);

      const webViewLink = await this.getFileUrl(folderId);

      return {
        folderId,
        folderName,
        webViewLink,
      };
    } catch (error) {
      throw this.handleError('createEmployeeFolder', error);
    }
  }

  /**
   * Create a request folder within an employee's folder
   * Structure: {Employee Folder}/Request_{YYYY}_{NNN}
   * Also creates an Attachments subfolder
   * @param employeeFolderId - Parent employee folder ID
   * @param requestId - Unique request identifier (e.g., "2024_001")
   * @returns Request folder information including attachments folder
   */
  async createRequestFolder(employeeFolderId: string, requestId: string): Promise<RequestFolderInfo> {
    try {
      const folderName = `Request_${requestId}`;
      const folderId = await this.getOrCreateFolder(folderName, employeeFolderId);
      const attachmentsFolderId = await this.getOrCreateFolder('Attachments', folderId);

      const webViewLink = await this.getFileUrl(folderId);

      return {
        folderId,
        attachmentsFolderId,
        folderName,
        webViewLink,
      };
    } catch (error) {
      throw this.handleError('createRequestFolder', error);
    }
  }

  // ==========================================================================
  // File Operations
  // ==========================================================================

  /**
   * Upload a file to Google Drive
   * @param folderId - Target folder ID
   * @param fileName - Name for the file
   * @param mimeType - MIME type of the file
   * @param content - File content as Buffer
   * @returns Uploaded file information
   */
  async uploadFile(
    folderId: string,
    fileName: string,
    mimeType: string,
    content: Buffer
  ): Promise<DriveFile> {
    try {
      const fileMetadata: drive_v3.Schema$File = {
        name: fileName,
        parents: [folderId],
      };

      const media = {
        mimeType,
        body: this.bufferToStream(content),
      };

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media,
        fields: 'id, name, mimeType, webViewLink, webContentLink, createdTime, modifiedTime, parents',
      });

      if (!response.data.id) {
        throw new Error('Failed to upload file: No ID returned');
      }

      return this.mapToDriveFile(response.data);
    } catch (error) {
      throw this.handleError('uploadFile', error);
    }
  }

  /**
   * Get the web view URL for a file or folder
   * @param fileId - File or folder ID
   * @returns Web view URL
   */
  async getFileUrl(fileId: string): Promise<string> {
    try {
      const response = await this.drive.files.get({
        fileId,
        fields: 'webViewLink',
      });

      return response.data.webViewLink || `https://drive.google.com/drive/folders/${fileId}`;
    } catch (error) {
      throw this.handleError('getFileUrl', error);
    }
  }

  /**
   * Get file metadata
   * @param fileId - File ID
   * @returns File information
   */
  async getFile(fileId: string): Promise<DriveFile> {
    try {
      const response = await this.drive.files.get({
        fileId,
        fields: 'id, name, mimeType, webViewLink, webContentLink, createdTime, modifiedTime, parents',
      });

      return this.mapToDriveFile(response.data);
    } catch (error) {
      throw this.handleError('getFile', error);
    }
  }

  /**
   * List files in a folder
   * @param folderId - Folder ID
   * @param pageSize - Number of files to return (default 100)
   * @returns Array of files in the folder
   */
  async listFiles(folderId: string, pageSize: number = 100): Promise<DriveFile[]> {
    try {
      const response = await this.drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType, webViewLink, webContentLink, createdTime, modifiedTime, parents)',
        pageSize,
        orderBy: 'createdTime desc',
      });

      return (response.data.files || []).map((file) => this.mapToDriveFile(file));
    } catch (error) {
      throw this.handleError('listFiles', error);
    }
  }

  /**
   * Delete a file or folder
   * @param fileId - File or folder ID to delete
   */
  async deleteFile(fileId: string): Promise<void> {
    try {
      await this.drive.files.delete({ fileId });
    } catch (error) {
      throw this.handleError('deleteFile', error);
    }
  }

  /**
   * Move file to trash (recoverable)
   * @param fileId - File ID to trash
   */
  async trashFile(fileId: string): Promise<void> {
    try {
      await this.drive.files.update({
        fileId,
        requestBody: { trashed: true },
      });
    } catch (error) {
      throw this.handleError('trashFile', error);
    }
  }

  // ==========================================================================
  // Permission Operations
  // ==========================================================================

  /**
   * Set file permissions for anyone with the link
   * @param fileId - File or folder ID
   * @param role - Permission role ('reader' or 'writer')
   */
  async setFilePermissions(fileId: string, role: 'reader' | 'writer'): Promise<void> {
    try {
      await this.drive.permissions.create({
        fileId,
        requestBody: {
          role,
          type: 'anyone',
        },
      });
    } catch (error) {
      throw this.handleError('setFilePermissions', error);
    }
  }

  /**
   * Share file with a specific email address
   * @param fileId - File or folder ID
   * @param email - Email address to share with
   * @param role - Permission role
   * @param sendNotification - Whether to send an email notification
   */
  async shareWithUser(
    fileId: string,
    email: string,
    role: 'reader' | 'writer' | 'commenter',
    sendNotification: boolean = false
  ): Promise<void> {
    try {
      await this.drive.permissions.create({
        fileId,
        sendNotificationEmail: sendNotification,
        requestBody: {
          role,
          type: 'user',
          emailAddress: email,
        },
      });
    } catch (error) {
      throw this.handleError('shareWithUser', error);
    }
  }

  /**
   * Share file with a domain
   * @param fileId - File or folder ID
   * @param domain - Domain to share with
   * @param role - Permission role
   */
  async shareWithDomain(
    fileId: string,
    domain: string,
    role: 'reader' | 'writer' | 'commenter'
  ): Promise<void> {
    try {
      await this.drive.permissions.create({
        fileId,
        requestBody: {
          role,
          type: 'domain',
          domain,
        },
      });
    } catch (error) {
      throw this.handleError('shareWithDomain', error);
    }
  }

  // ==========================================================================
  // Export Operations
  // ==========================================================================

  /**
   * Export a Google Doc as PDF
   * @param docId - Google Doc ID
   * @returns PDF content as Buffer
   */
  async exportAsPdf(docId: string): Promise<Buffer> {
    try {
      const response = await this.drive.files.export(
        {
          fileId: docId,
          mimeType: MIME_TYPES.PDF,
        },
        { responseType: 'arraybuffer' }
      );

      return Buffer.from(response.data as ArrayBuffer);
    } catch (error) {
      throw this.handleError('exportAsPdf', error);
    }
  }

  /**
   * Export a Google Doc as Word document
   * @param docId - Google Doc ID
   * @returns Word document content as Buffer
   */
  async exportAsWord(docId: string): Promise<Buffer> {
    try {
      const response = await this.drive.files.export(
        {
          fileId: docId,
          mimeType: MIME_TYPES.WORD,
        },
        { responseType: 'arraybuffer' }
      );

      return Buffer.from(response.data as ArrayBuffer);
    } catch (error) {
      throw this.handleError('exportAsWord', error);
    }
  }

  /**
   * Copy a file to a new location
   * @param fileId - Source file ID
   * @param newName - Name for the copy
   * @param folderId - Target folder ID
   * @returns Copied file information
   */
  async copyFile(fileId: string, newName: string, folderId: string): Promise<DriveFile> {
    try {
      const response = await this.drive.files.copy({
        fileId,
        requestBody: {
          name: newName,
          parents: [folderId],
        },
        fields: 'id, name, mimeType, webViewLink, webContentLink, createdTime, modifiedTime, parents',
      });

      return this.mapToDriveFile(response.data);
    } catch (error) {
      throw this.handleError('copyFile', error);
    }
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Clear the folder cache
   */
  clearCache(): void {
    this.folderCache.clear();
  }

  /**
   * Get the underlying Drive client for advanced operations
   */
  getDriveClient(): drive_v3.Drive {
    return this.drive;
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  private bufferToStream(buffer: Buffer): NodeJS.ReadableStream {
    const { Readable } = require('stream');
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);
    return stream;
  }

  private mapToDriveFile(file: drive_v3.Schema$File): DriveFile {
    return {
      id: file.id || '',
      name: file.name || '',
      mimeType: file.mimeType || '',
      webViewLink: file.webViewLink || '',
      webContentLink: file.webContentLink || undefined,
      createdTime: file.createdTime || '',
      modifiedTime: file.modifiedTime || '',
      parents: file.parents || undefined,
    };
  }

  private escapeQueryString(str: string): string {
    return str.replace(/'/g, "\\'").replace(/\\/g, '\\\\');
  }

  private handleError(operation: string, error: unknown): Error {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`GoogleDriveService.${operation} error:`, error);
    return new Error(`Google Drive ${operation} failed: ${message}`);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a Google Drive service instance from environment variables
 * Expects GOOGLE_SERVICE_ACCOUNT_KEY environment variable
 */
export function createGoogleDriveService(config?: DriveServiceConfig): GoogleDriveService {
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKey) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY environment variable is required');
  }

  return new GoogleDriveService(serviceAccountKey, config);
}

export { MIME_TYPES };
