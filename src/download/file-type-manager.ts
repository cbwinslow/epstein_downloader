import fs from 'fs';
import path from 'path';
import { Logger } from '../utils/logger';
import { SecurityUtils } from '../utils/security';

export interface FileTypeInfo {
  extension: string;
  mimeType: string;
  category: 'document' | 'spreadsheet' | 'presentation' | 'archive' | 'text' | 'other';
  description: string;
  maxFileSize: number; // in bytes
}

export interface DownloadedFile {
  filename: string;
  filePath: string;
  size: number;
  extension: string;
  category: string;
  mimeType: string;
  hash?: string;
  downloadTime: Date;
}

export class FileTypeManager {
  private logger: Logger;
  private securityUtils: SecurityUtils;
  private supportedTypes: Map<string, FileTypeInfo>;

  constructor() {
    this.logger = Logger.getInstance();
    this.securityUtils = SecurityUtils.getInstance();
    this.supportedTypes = new Map<string, FileTypeInfo>();
    this.initializeSupportedTypes();
  }

  private initializeSupportedTypes(): void {
    this.supportedTypes = new Map<string, FileTypeInfo>([
      // Documents
      ['pdf', { extension: 'pdf', mimeType: 'application/pdf', category: 'document', description: 'PDF Document', maxFileSize: 100 * 1024 * 1024 }], // 100MB
      ['doc', { extension: 'doc', mimeType: 'application/msword', category: 'document', description: 'Word Document (Legacy)', maxFileSize: 50 * 1024 * 1024 }], // 50MB
      ['docx', { extension: 'docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', category: 'document', description: 'Word Document', maxFileSize: 50 * 1024 * 1024 }], // 50MB
      ['rtf', { extension: 'rtf', mimeType: 'application/rtf', category: 'document', description: 'Rich Text Format', maxFileSize: 10 * 1024 * 1024 }], // 10MB
      ['txt', { extension: 'txt', mimeType: 'text/plain', category: 'text', description: 'Plain Text', maxFileSize: 10 * 1024 * 1024 }], // 10MB
      
      // Spreadsheets
      ['xls', { extension: 'xls', mimeType: 'application/vnd.ms-excel', category: 'spreadsheet', description: 'Excel Spreadsheet (Legacy)', maxFileSize: 50 * 1024 * 1024 }], // 50MB
      ['xlsx', { extension: 'xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', category: 'spreadsheet', description: 'Excel Spreadsheet', maxFileSize: 50 * 1024 * 1024 }], // 50MB
      
      // Presentations
      ['ppt', { extension: 'ppt', mimeType: 'application/vnd.ms-powerpoint', category: 'presentation', description: 'PowerPoint Presentation (Legacy)', maxFileSize: 100 * 1024 * 1024 }], // 100MB
      ['pptx', { extension: 'pptx', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', category: 'presentation', description: 'PowerPoint Presentation', maxFileSize: 100 * 1024 * 1024 }], // 100MB
      
      // Archives
      ['zip', { extension: 'zip', mimeType: 'application/zip', category: 'archive', description: 'ZIP Archive', maxFileSize: 500 * 1024 * 1024 }], // 500MB
      ['rar', { extension: 'rar', mimeType: 'application/rar', category: 'archive', description: 'RAR Archive', maxFileSize: 500 * 1024 * 1024 }], // 500MB
      ['7z', { extension: '7z', mimeType: 'application/x-7z-compressed', category: 'archive', description: '7-Zip Archive', maxFileSize: 500 * 1024 * 1024 }], // 500MB
      
      // Other common types
      ['jpg', { extension: 'jpg', mimeType: 'image/jpeg', category: 'other', description: 'JPEG Image', maxFileSize: 50 * 1024 * 1024 }], // 50MB
      ['jpeg', { extension: 'jpeg', mimeType: 'image/jpeg', category: 'other', description: 'JPEG Image', maxFileSize: 50 * 1024 * 1024 }], // 50MB
      ['png', { extension: 'png', mimeType: 'image/png', category: 'other', description: 'PNG Image', maxFileSize: 50 * 1024 * 1024 }], // 50MB
      ['gif', { extension: 'gif', mimeType: 'image/gif', category: 'other', description: 'GIF Image', maxFileSize: 10 * 1024 * 1024 }], // 10MB
      ['bmp', { extension: 'bmp', mimeType: 'image/bmp', category: 'other', description: 'Bitmap Image', maxFileSize: 50 * 1024 * 1024 }], // 50MB
    ]);
  }

  /**
   * Detect file type from URL or filename
   */
  public detectFileType(urlOrFilename: string): FileTypeInfo | null {
    try {
      // Extract filename from URL if needed
      const filename = this.extractFilename(urlOrFilename);
      const extension = this.extractExtension(filename).toLowerCase();

      // Check if we support this file type
      const fileType = this.supportedTypes.get(extension);
      
      if (!fileType) {
        this.logger.warn(`Unsupported file type detected: ${extension} from ${filename}`);
        return null;
      }

      this.logger.info(`Detected file type: ${fileType.description} (${extension})`);
      return fileType;
    } catch (error) {
      this.logger.error(`Error detecting file type for ${urlOrFilename}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Validate file size against type limits
   */
  public validateFileSize(fileSize: number, fileType: FileTypeInfo): boolean {
    if (fileSize > fileType.maxFileSize) {
      this.logger.warn(`File size ${this.formatBytes(fileSize)} exceeds limit ${this.formatBytes(fileType.maxFileSize)} for ${fileType.description}`);
      return false;
    }
    return true;
  }

  /**
   * Generate safe filename with proper extension
   */
  public generateSafeFilename(originalFilename: string, fileType: FileTypeInfo, dataSetNumber: number, pageNumber: number, fileIndex: number): string {
    try {
      // Sanitize the original filename
      const sanitized = this.securityUtils.sanitizeFileName(originalFilename);
      
      // Ensure proper extension
      const filename = this.ensureProperExtension(sanitized, fileType.extension);
      
      // Add prefix with metadata
      const safeFilename = `${dataSetNumber}_page${pageNumber}_file${fileIndex}_${filename}`;
      
      this.logger.debug(`Generated safe filename: ${safeFilename}`);
      return safeFilename;
    } catch (error) {
      this.logger.error(`Error generating safe filename: ${error instanceof Error ? error.message : String(error)}`);
      // Fallback to generic filename
      return `${dataSetNumber}_page${pageNumber}_file${fileIndex}_document.${fileType.extension}`;
    }
  }

  /**
   * Categorize file for organization
   */
  public categorizeFile(fileType: FileTypeInfo): string {
    return fileType.category;
  }

  /**
   * Get all supported file extensions
   */
  public getSupportedExtensions(): string[] {
    return Array.from(this.supportedTypes.keys());
  }

  /**
   * Get file type statistics
   */
  public getSupportedTypesInfo(): FileTypeInfo[] {
    return Array.from(this.supportedTypes.values());
  }

  private extractFilename(urlOrFilename: string): string {
    try {
      // If it's a URL, extract the filename from the path
      if (urlOrFilename.includes('/')) {
        const url = new URL(urlOrFilename);
        const pathname = url.pathname;
        return path.basename(pathname);
      }
      return urlOrFilename;
    } catch {
      // If URL parsing fails, treat as filename
      return path.basename(urlOrFilename);
    }
  }

  private extractExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1 || lastDotIndex === 0) {
      return '';
    }
    return filename.substring(lastDotIndex + 1);
  }

  private ensureProperExtension(filename: string, expectedExtension: string): string {
    const currentExtension = this.extractExtension(filename);
    if (currentExtension.toLowerCase() === expectedExtension.toLowerCase()) {
      return filename;
    }
    // Remove existing extension if present
    const baseName = currentExtension ? filename.substring(0, filename.lastIndexOf('.')) : filename;
    return `${baseName}.${expectedExtension}`;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}