import { Logger } from '@utils/logger';
import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * Interface for scraped file information
 */
export interface ScrapedFile {
  url: string;
  filename: string;
  size?: number;
}

/**
 * Justice Department scraper for extracting file links from data set pages
 */
export class JusticeScraper {
  private logger: Logger;
  private baseUrl: string = 'https://www.justice.gov';

  constructor() {
    this.logger = Logger.getInstance();
  }

  /**
   * Scrape a Justice Department data set page for file links
   * @param dataSetNumber The data set number (1-12)
   * @param pageNumber The page number to scrape
   * @returns Array of scraped file information
   */
  public async scrapeDataSetPage(dataSetNumber: number, pageNumber: number): Promise<ScrapedFile[]> {
    const url = `${this.baseUrl}/epstein/doj-disclosures/data-set-${dataSetNumber}-files?page=${pageNumber}`;
    this.logger.info(`Scraping Justice Department page: ${url}`);

    try {
      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'EpsteinDownloader/1.0 (+https://github.com/yourusername/epstein-downloader)'
        }
      });

      const $ = cheerio.load(response.data);
      const files: ScrapedFile[] = [];

      // Look for file links on the page
      // Based on typical Justice Department page structure, we'll look for common patterns
      $('a[href]').each((index, element) => {
        const href = $(element).attr('href');
        const text = $(element).text().trim();

        if (href && text) {
          // Filter for likely file links (PDFs, ZIPs, documents, etc.)
          const fileExtensions = ['.pdf', '.zip', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt'];
          const isFileLink = fileExtensions.some(ext => 
            href.toLowerCase().endsWith(ext) || 
            text.toLowerCase().endsWith(ext)
          );

          if (isFileLink) {
            // Convert relative URLs to absolute
            const fileUrl = href.startsWith('http') ? href : `${this.baseUrl}${href}`;
            
            // Use the link text as filename if it looks like a filename, otherwise extract from URL
            let filename = text;
            if (!fileExtensions.some(ext => filename.toLowerCase().endsWith(ext))) {
              // Try to extract filename from URL
              try {
                const urlObj = new URL(fileUrl);
                filename = urlObj.pathname.substring(urlObj.pathname.lastIndexOf('/') + 1) || `file_${Date.now()}`;
              } catch {
                filename = `file_${Date.now()}`;
              }
            }

            files.push({
              url: fileUrl,
              filename: filename
            });
          }
        }
      });

      // Also look for direct file links in common containers
      $('.view-content a, .file a, .attachment a, .download-link').each((index, element) => {
        const href = $(element).attr('href');
        const text = $(element).text().trim() || $(element).attr('title') || '';

        if (href && text) {
          const fileExtensions = ['.pdf', '.zip', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt'];
          const isFileLink = fileExtensions.some(ext => 
            href.toLowerCase().endsWith(ext) || 
            text.toLowerCase().endsWith(ext)
          );

          if (isFileLink) {
            const fileUrl = href.startsWith('http') ? href : `${this.baseUrl}${href}`;
            let filename = text;
            
            if (!fileExtensions.some(ext => filename.toLowerCase().endsWith(ext))) {
              try {
                const urlObj = new URL(fileUrl);
                filename = urlObj.pathname.substring(urlObj.pathname.lastIndexOf('/') + 1) || `file_${Date.now()}`;
              } catch {
                filename = `file_${Date.now()}`;
              }
            }

            // Avoid duplicates
            const exists = files.some(f => f.url === fileUrl);
            if (!exists) {
              files.push({
                url: fileUrl,
                filename: filename
              });
            }
          }
        }
      });

      this.logger.info(`Found ${files.length} files on page ${pageNumber} of data set ${dataSetNumber}`);
      return files;
    } catch (error) {
      this.logger.error(`Error scraping Justice Department page ${url}:`, error as Error);
      // Return empty array on error to allow continuation
      return [];
    }
  }

  /**
   * Check if there are more pages available for a data set
   * @param dataSetNumber The data set number (1-12)
   * @param pageNumber The current page number
   * @returns True if there are more pages, false otherwise
   */
  public async hasMorePages(dataSetNumber: number, pageNumber: number): Promise<boolean> {
    const url = `${this.baseUrl}/epstein/doj-disclosures/data-set-${dataSetNumber}-files?page=${pageNumber}`;
    this.logger.info(`Checking for more pages: ${url}`);

    try {
      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'EpsteinDownloader/1.0 (+https://github.com/yourusername/epstein-downloader)'
        }
      });

      const $ = cheerio.load(response.data);
      
      // Look for pagination indicators
      // Common patterns: "next" link, page numbers, etc.
      const nextLink = $('a[rel="next"], .pager-next a, .next-page').length > 0;
      const pageNumbers = $('.pager-item, .page-link').length > 0;
      
      // Also check if we got any content - if no content, likely no more pages
      const hasContent = $('.view-content, .files, .content').length > 0 && 
                        $('body').text().length > 1000; // Arbitrary threshold
      
      const hasMore = (nextLink || pageNumbers) && hasContent;
      
      this.logger.info(`More pages available for data set ${dataSetNumber}, page ${pageNumber}: ${hasMore}`);
      return hasMore;
    } catch (error) {
      this.logger.error(`Error checking for more pages on ${url}:`, error as Error);
      // Assume no more pages on error to prevent infinite loops
      return false;
    }
  }
}