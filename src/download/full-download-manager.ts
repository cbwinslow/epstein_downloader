import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { JusticeScraper } from '../scraper/justice-scraper';
import { Logger } from '../utils/logger';
import { SecurityUtils } from '../utils/security';

export interface DownloadProgress {
  dataSetNumber: number;
  currentPage: number;
  totalPages: number;
  currentFile: number;
  totalFiles: number;
  downloadedFiles: number;
  totalFilesInDataSet: number;
  status: 'scraping' | 'downloading' | 'completed' | 'error';
  error?: string;
  startTime: Date;
  estimatedCompletion?: Date;
}

export interface DownloadStats {
  totalFilesFound: number;
  totalFilesDownloaded: number;
  totalSize: number;
  errors: string[];
  warnings: string[];
  duration: number;
}

export class FullDownloadManager {
  private scraper: JusticeScraper;
  private logger: Logger;
  private downloadDir: string;
  private progressCallback?: (progress: DownloadProgress) => void;
  private statsCallback?: (stats: DownloadStats) => void;

  constructor(downloadDir: string = './downloads/full-download') {
    const securityUtils = SecurityUtils.getInstance();
    
    // Validate download directory path
    this.downloadDir = securityUtils.validateDownloadDir(downloadDir);
    
    this.scraper = new JusticeScraper();
    this.logger = Logger.getInstance();
    
    // Create download directory
    if (!fs.existsSync(this.downloadDir)) {
      fs.mkdirSync(this.downloadDir, { recursive: true });
      this.logger.info(`Created download directory: ${this.downloadDir}`);
    }
  }

  /**
   * Set callback for progress updates
   */
  onProgress(callback: (progress: DownloadProgress) => void): void {
    this.progressCallback = callback;
  }

  /**
   * Set callback for stats updates
   */
  onStats(callback: (stats: DownloadStats) => void): void {
    this.statsCallback = callback;
  }

  /**
   * Download all files from a specific data set
   */
  async downloadDataSet(dataSetNumber: number, maxPages: number = 100): Promise<DownloadStats> {
    const securityUtils = SecurityUtils.getInstance();
    
    // Validate data set number
    const validatedDataSetNumber = securityUtils.validateDataSetNumber(dataSetNumber);
    
    const startTime = Date.now();
    const stats: DownloadStats = {
      totalFilesFound: 0,
      totalFilesDownloaded: 0,
      totalSize: 0,
      errors: [],
      warnings: [],
      duration: 0
    };

    this.logger.info(`Starting download for Data Set ${validatedDataSetNumber}`);

    try {
      // First, discover all pages and files
      const pages = await this.discoverPages(dataSetNumber, maxPages);
      const totalFiles = pages.reduce((sum, page) => sum + page.files.length, 0);
      
      this.logger.info(`Found ${pages.length} pages with ${totalFiles} total files in Data Set ${dataSetNumber}`);

      // Download files from each page
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const progress: DownloadProgress = {
          dataSetNumber,
          currentPage: page.pageNumber,
          totalPages: pages.length,
          currentFile: 0,
          totalFiles: page.files.length,
          downloadedFiles: 0,
          totalFilesInDataSet: totalFiles,
          status: 'downloading',
          startTime: new Date()
        };

        this.progressCallback?.(progress);

        for (let j = 0; j < page.files.length; j++) {
          const file = page.files[j];
          progress.currentFile = j + 1;
          progress.totalFiles = page.files.length;
          
          try {
            const downloaded = await this.downloadFile(file, dataSetNumber, page.pageNumber, j + 1);
            if (downloaded) {
              stats.totalFilesDownloaded++;
              stats.totalSize += downloaded.size;
              progress.downloadedFiles++;
            }
          } catch (error) {
            const errorMsg = `Failed to download ${file.filename}: ${error instanceof Error ? error.message : String(error)}`;
            stats.errors.push(errorMsg);
            this.logger.error(errorMsg);
            progress.status = 'error';
            progress.error = error instanceof Error ? error.message : String(error);
          }

          this.progressCallback?.(progress);
        }
      }

      stats.totalFilesFound = totalFiles;
      stats.duration = Date.now() - startTime;

      this.logger.info(`Completed download for Data Set ${dataSetNumber}: ${stats.totalFilesDownloaded}/${totalFiles} files downloaded`);
      this.statsCallback?.(stats);

      return stats;

    } catch (error) {
      const errorMsg = `Error downloading Data Set ${dataSetNumber}: ${error instanceof Error ? error.message : String(error)}`;
      stats.errors.push(errorMsg);
      this.logger.error(errorMsg);
      stats.duration = Date.now() - startTime;
      this.statsCallback?.(stats);
      throw error;
    }
  }

  /**
   * Download all files from all data sets
   */
  async downloadAllDataSets(maxPagesPerSet: number = 100, dataSets: number[] = [1,2,3,4,5,6,7,8,9,10,11,12]): Promise<DownloadStats[]> {
    const allStats: DownloadStats[] = [];
    const startTime = Date.now();

    this.logger.info(`Starting download for ${dataSets.length} data sets`);

    for (const dataSetNumber of dataSets) {
      try {
        const stats = await this.downloadDataSet(dataSetNumber, maxPagesPerSet);
        allStats.push(stats);
        
        // Add delay between data sets to avoid overwhelming the server
        await this.delay(5000);
      } catch (error) {
        this.logger.error(`Failed to download Data Set ${dataSetNumber}: ${error instanceof Error ? error.message : String(error)}`);
        // Continue with next data set
      }
    }

    const totalTime = Date.now() - startTime;
    const totalFiles = allStats.reduce((sum, stats) => sum + stats.totalFilesFound, 0);
    const totalDownloaded = allStats.reduce((sum, stats) => sum + stats.totalFilesDownloaded, 0);
    const totalSize = allStats.reduce((sum, stats) => sum + stats.totalSize, 0);

    this.logger.info(`Completed download for all data sets: ${totalDownloaded}/${totalFiles} files downloaded, total size: ${this.formatBytes(totalSize)}`);

    return allStats;
  }

  /**
   * Discover all pages and files in a data set
   */
  private async discoverPages(dataSetNumber: number, maxPages: number): Promise<Array<{pageNumber: number, files: any[]}>> {
    const pages: Array<{pageNumber: number, files: any[]}> = [];
    let hasMorePages = true;
    let currentPage = 1;

    while (hasMorePages && currentPage <= maxPages) {
      try {
        this.logger.info(`Discovering page ${currentPage} of Data Set ${dataSetNumber}`);
        
        const files = await this.scraper.scrapeDataSetPage(dataSetNumber, currentPage);
        
        // Filter out navigation links and keep only actual document files
        const documentFiles = files.filter(file => 
          file.filename !== 'Guidance Documents' && 
          file.filename !== `Data Set ${dataSetNumber} Files` &&
          file.url.includes('/epstein/files/')
        );

        if (documentFiles.length > 0) {
          pages.push({
            pageNumber: currentPage,
            files: documentFiles
          });
          
          // Check if there are more pages by looking for pagination indicators
          // This is a simple heuristic - in a real implementation, you'd check the HTML
          if (documentFiles.length >= 50) { // If we found many files, likely more pages
            currentPage++;
          } else {
            hasMorePages = false;
          }
        } else {
          hasMorePages = false;
        }

        // Add delay between page requests
        await this.delay(1000);

      } catch (error) {
        this.logger.error(`Error discovering page ${currentPage} of Data Set ${dataSetNumber}: ${error instanceof Error ? error.message : String(error)}`);
        hasMorePages = false;
      }
    }

    return pages;
  }

  /**
   * Download a single file with retry logic
   */
  private async downloadFile(file: any, dataSetNumber: number, pageNumber: number, fileIndex: number): Promise<{size: number} | null> {
    const securityUtils = SecurityUtils.getInstance();
    
    // Validate inputs
    const validatedPageNumber = securityUtils.validatePageNumber(pageNumber);
    const validatedFileIndex = securityUtils.validateFileIndex(fileIndex);
    
    // Sanitize filename to prevent path traversal attacks
    const sanitizedFilename = securityUtils.sanitizeFileName(file.filename);
    const filename = `${dataSetNumber}_page${validatedPageNumber}_file${validatedFileIndex}_${sanitizedFilename}`;
    
    // Validate URL to prevent SSRF attacks
    const validatedUrl = securityUtils.validateUrl(file.url);
    
    const filePath = path.join(this.downloadDir, `data-set-${dataSetNumber}`, filename);

    // Create directory for this data set
    const dataSetDir = path.dirname(filePath);
    if (!fs.existsSync(dataSetDir)) {
      fs.mkdirSync(dataSetDir, { recursive: true });
    }

    // Check if file already exists
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      if (stats.size > 0) {
        this.logger.info(`File already exists: ${filename} (${this.formatBytes(stats.size)})`);
        return { size: stats.size };
      }
    }

    // Retry logic
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.info(`Downloading: ${filename} (attempt ${attempt}/${maxRetries})`);

        const response = await axios.get(file.url, {
          timeout: 60000, // 60 second timeout
          responseType: 'stream',
          headers: {
            'Cookie': process.env.DOJ_COOKIES,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });

        // Create write stream
        const writer = fs.createWriteStream(filePath);
        
        // Pipe the response to file
        response.data.pipe(writer);

        // Wait for download to complete
        await new Promise((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
        });

        // Verify file was downloaded
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          if (stats.size > 0) {
            this.logger.info(`Successfully downloaded: ${filename} (${this.formatBytes(stats.size)})`);
            return { size: stats.size };
          }
        }

        throw new Error('File download failed - empty or missing file');

      } catch (error) {
        if (attempt === maxRetries) {
          this.logger.error(`Failed to download ${filename} after ${maxRetries} attempts: ${error instanceof Error ? error.message : String(error)}`);
          throw error;
        }
        
        // Wait before retry
        await this.delay(2000 * attempt); // Exponential backoff
      }
    }

    return null;
  }

  /**
   * Utility function to format bytes
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}