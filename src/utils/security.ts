import path from 'path';
import crypto from 'crypto';
import { Logger } from './logger';

/**
 * Security utilities for input validation, sanitization, and secure operations
 */
export class SecurityUtils {
  private static instance: SecurityUtils;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): SecurityUtils {
    if (!SecurityUtils.instance) {
      SecurityUtils.instance = new SecurityUtils();
    }
    return SecurityUtils.instance;
  }

  /**
   * Validate and sanitize file names to prevent path traversal attacks
   */
  public sanitizeFileName(filename: string): string {
    if (!filename || typeof filename !== 'string') {
      throw new Error('Invalid filename provided');
    }

    // Remove or replace dangerous characters
    let sanitized = filename
      // Remove path traversal attempts
      .replace(/\.\./g, '')
      .replace(/[\/\\]/g, '')
      // Remove control characters
      .replace(/[\x00-\x1f\x80-\x9f]/g, '')
      // Remove special characters that could be problematic
      .replace(/[<>:"|?*]/g, '')
      // Replace multiple spaces with single space
      .replace(/\s+/g, ' ')
      // Trim whitespace
      .trim();

    // Ensure filename is not empty after sanitization
    if (!sanitized) {
      throw new Error('Filename became empty after sanitization');
    }

    // Limit filename length
    if (sanitized.length > 255) {
      sanitized = sanitized.substring(0, 255);
      this.logger.warn(`Filename truncated to 255 characters: ${sanitized}`);
    }

    // Ensure filename has a valid extension for security
    const ext = path.extname(sanitized);
    if (!ext) {
      sanitized += '.pdf'; // Default extension for DOJ files
    }

    return sanitized;
  }

  /**
   * Validate and sanitize URLs to prevent SSRF and other attacks
   */
  public validateUrl(url: string): string {
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid URL provided');
    }

    try {
      const urlObj = new URL(url);
      
      // Only allow HTTPS for security
      if (urlObj.protocol !== 'https:') {
        throw new Error('Only HTTPS URLs are allowed');
      }

      // Validate domain - only allow DOJ domains
      const allowedDomains = [
        'www.justice.gov',
        'justice.gov'
      ];
      
      if (!allowedDomains.includes(urlObj.hostname)) {
        throw new Error(`Domain ${urlObj.hostname} is not allowed`);
      }

      // Validate path structure
      if (!urlObj.pathname.includes('/epstein/files/')) {
        throw new Error('URL path does not match expected DOJ Epstein file pattern');
      }

      // Check for suspicious query parameters
      const searchParams = urlObj.searchParams;
      for (const [key, value] of searchParams.entries()) {
        if (this.containsSuspiciousContent(key) || this.containsSuspiciousContent(value)) {
          throw new Error(`Suspicious query parameter detected: ${key}=${value}`);
        }
      }

      return urlObj.toString();

    } catch (error) {
      throw new Error(`Invalid URL format: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validate data set number
   */
  public validateDataSetNumber(dataSetNumber: number): number {
    if (!Number.isInteger(dataSetNumber)) {
      throw new Error('Data set number must be an integer');
    }

    if (dataSetNumber < 1 || dataSetNumber > 12) {
      throw new Error('Data set number must be between 1 and 12');
    }

    return dataSetNumber;
  }

  /**
   * Validate page number
   */
  public validatePageNumber(pageNumber: number): number {
    if (!Number.isInteger(pageNumber)) {
      throw new Error('Page number must be an integer');
    }

    if (pageNumber < 1) {
      throw new Error('Page number must be positive');
    }

    if (pageNumber > 1000) {
      throw new Error('Page number too large');
    }

    return pageNumber;
  }

  /**
   * Validate file index
   */
  public validateFileIndex(fileIndex: number): number {
    if (!Number.isInteger(fileIndex)) {
      throw new Error('File index must be an integer');
    }

    if (fileIndex < 1) {
      throw new Error('File index must be positive');
    }

    if (fileIndex > 100) {
      throw new Error('File index too large');
    }

    return fileIndex;
  }

  /**
   * Validate download directory path
   */
  public validateDownloadDir(downloadDir: string): string {
    if (!downloadDir || typeof downloadDir !== 'string') {
      throw new Error('Invalid download directory path');
    }

    // Resolve to absolute path
    const resolvedPath = path.resolve(downloadDir);

    // Check for path traversal attempts
    if (resolvedPath.includes('..') || resolvedPath.includes('\\')) {
      throw new Error('Download directory path contains invalid characters');
    }

    // Ensure it's within expected directory structure
    const projectRoot = process.cwd();
    if (!resolvedPath.startsWith(projectRoot)) {
      throw new Error('Download directory must be within project directory');
    }

    return resolvedPath;
  }

  /**
   * Check if string contains suspicious content
   */
  private containsSuspiciousContent(str: string): boolean {
    const suspiciousPatterns = [
      /\.\./,           // Path traversal
      /[<>]/,           // HTML/XML injection
      /javascript:/i,    // JavaScript injection
      /data:/i,          // Data URI schemes
      /file:/i,          // File protocol
      /script/i,        // Script tags
      /on\w+\s*=/i,     // Event handlers
    ];

    return suspiciousPatterns.some(pattern => pattern.test(str));
  }

  /**
   * Generate secure file hash for integrity verification
   */
  public generateFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const fs = require('fs');
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);

      stream.on('data', (chunk: Buffer) => {
        hash.update(chunk);
      });

      stream.on('end', () => {
        resolve(hash.digest('hex'));
      });

      stream.on('error', (error: Error) => {
        reject(error);
      });
    });
  }

  /**
   * Validate file integrity using hash
   */
  public async validateFileIntegrity(filePath: string, expectedHash: string): Promise<boolean> {
    try {
      const actualHash = await this.generateFileHash(filePath);
      return actualHash === expectedHash;
    } catch (error) {
      this.logger.error(`File integrity check failed: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Sanitize error messages to prevent information disclosure
   */
  public sanitizeErrorMessage(error: Error | string): string {
    const message = error instanceof Error ? error.message : String(error);
    
    // Remove sensitive information from error messages
    return message
      // Remove file system paths
      .replace(/\/[^\/\s]+/g, '[REDACTED_PATH]')
      // Remove URLs
      .replace(/https?:\/\/[^\s]+/g, '[REDACTED_URL]')
      // Remove IP addresses
      .replace(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g, '[REDACTED_IP]')
      // Remove email addresses
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]')
      // Remove potential sensitive keywords
      .replace(/(password|token|key|secret|cookie)/gi, '[REDACTED]');
  }

  /**
   * Validate cookies string for security
   */
  public validateCookies(cookies: string): string {
    if (!cookies || typeof cookies !== 'string') {
      throw new Error('Invalid cookies string');
    }

    // Check for suspicious cookie content
    if (cookies.length > 10000) {
      throw new Error('Cookies string too long');
    }

    // Basic validation - cookies should contain expected DOJ patterns
    if (!cookies.includes('DOJ') && !cookies.includes('justice.gov')) {
      this.logger.warn('Cookies may not be from DOJ domain');
    }

    return cookies;
  }

  /**
   * Log security-related messages
   */
  public logSecurityMessage(level: 'error' | 'warn' | 'info', message: string): void {
    this.logger[level](message);
  }
}

/**
 * Security middleware for validating inputs before processing
 */
export function withSecurityValidation<T extends (...args: any[]) => any>(
  fn: T, 
  validator: (args: Parameters<T>) => void
): T {
  return ((...args: Parameters<T>) => {
    try {
      validator(args);
      return fn(...args);
    } catch (error) {
      const securityUtils = SecurityUtils.getInstance();
      const sanitizedError = securityUtils.sanitizeErrorMessage(error instanceof Error ? error : new Error(String(error)));
      securityUtils.logSecurityMessage('error', `Security validation failed: ${sanitizedError}`);
      throw new Error(`Security validation failed: ${sanitizedError}`);
    }
  }) as T;
}