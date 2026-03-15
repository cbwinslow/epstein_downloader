"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JusticeScraper = void 0;
const logger_1 = require("../utils/logger");
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const manager_1 = require("../config/manager");
/**
 * Justice Department scraper for extracting file links from data set pages
 */
class JusticeScraper {
    constructor() {
        this.baseUrl = 'https://www.justice.gov';
        this.logger = logger_1.Logger.getInstance();
        this.configManager = new manager_1.ConfigManager();
    }
    /**
     * Scrape a Justice Department data set page for file links
     * @param dataSetNumber The data set number (1-12)
     * @param pageNumber The page number to scrape
     * @returns Array of scraped file information
     */
    async scrapeDataSetPage(dataSetNumber, pageNumber) {
        const url = `${this.baseUrl}/epstein/doj-disclosures/data-set-${dataSetNumber}-files?page=${pageNumber}`;
        this.logger.info(`Scraping Justice Department page: ${url}`);
        try {
            // Get cookies from environment for authentication
            const cookies = process.env.DOJ_COOKIES || this.configManager.getString('DOJ_COOKIES', '');
            const headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            };
            if (cookies) {
                headers.Cookie = cookies;
                this.logger.debug('Using cookies for authentication');
            }
            const response = await axios_1.default.get(url, {
                timeout: 30000,
                headers: headers,
                validateStatus: (status) => {
                    // Accept 200 (success) and 403 (forbidden - might indicate auth issues)
                    return status === 200 || status === 403;
                }
            });
            // Check for authentication issues
            if (response.status === 403) {
                this.logger.warn(`Authentication issue detected for ${url}. Response may be limited.`);
            }
            const $ = cheerio.load(response.data);
            const files = [];
            // Enhanced file detection patterns
            const fileExtensions = ['.pdf', '.zip', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt', '.rtf', '.ppt', '.pptx', '.jpg', '.jpeg', '.png', '.gif', '.bmp'];
            // Look for file links in all anchor tags
            $('a[href]').each((index, element) => {
                const href = $(element).attr('href');
                const text = $(element).text().trim();
                const title = $(element).attr('title') || '';
                if (href) {
                    // Check if URL contains file extension
                    const urlHasExtension = fileExtensions.some(ext => href.toLowerCase().includes(ext));
                    // Check if text or title suggests it's a file
                    const textSuggestsFile = text.length > 0 && (fileExtensions.some(ext => text.toLowerCase().includes(ext)) ||
                        /download|file|document|attachment|pdf|zip|doc/i.test(text));
                    // Check if title suggests it's a file
                    const titleSuggestsFile = title.length > 0 && (fileExtensions.some(ext => title.toLowerCase().includes(ext)) ||
                        /download|file|document|attachment|pdf|zip|doc/i.test(title));
                    if (urlHasExtension || textSuggestsFile || titleSuggestsFile) {
                        // Convert relative URLs to absolute
                        const fileUrl = href.startsWith('http') ? href : `${this.baseUrl}${href}`;
                        // Generate filename
                        let filename = '';
                        if (textSuggestsFile && text.length > 0) {
                            filename = text;
                        }
                        else if (titleSuggestsFile && title.length > 0) {
                            filename = title;
                        }
                        else {
                            // Extract from URL
                            try {
                                const urlObj = new URL(fileUrl);
                                filename = urlObj.pathname.substring(urlObj.pathname.lastIndexOf('/') + 1);
                                if (!filename || filename.length < 3) {
                                    filename = `file_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                                }
                            }
                            catch {
                                filename = `file_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                            }
                        }
                        // Clean filename
                        filename = filename.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim();
                        if (filename.length < 3) {
                            filename = `file_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                        }
                        // Avoid duplicates
                        const exists = files.some(f => f.url === fileUrl);
                        if (!exists) {
                            files.push({
                                url: fileUrl,
                                filename: filename
                            });
                            this.logger.debug(`Found file: ${filename} -> ${fileUrl}`);
                        }
                    }
                }
            });
            // Look for files in specific containers that commonly hold document links
            const containers = ['.view-content', '.file', '.attachment', '.download-link', '.field-file', '.document-list', '.file-list'];
            containers.forEach(container => {
                if ($(container).length > 0) {
                    $(`${container} a[href]`).each((index, element) => {
                        const href = $(element).attr('href');
                        const text = $(element).text().trim();
                        const title = $(element).attr('title') || '';
                        if (href) {
                            const urlHasExtension = fileExtensions.some(ext => href.toLowerCase().includes(ext));
                            const textSuggestsFile = text.length > 0 && fileExtensions.some(ext => text.toLowerCase().includes(ext));
                            const titleSuggestsFile = title.length > 0 && fileExtensions.some(ext => title.toLowerCase().includes(ext));
                            if (urlHasExtension || textSuggestsFile || titleSuggestsFile) {
                                const fileUrl = href.startsWith('http') ? href : `${this.baseUrl}${href}`;
                                let filename = text || title;
                                if (!filename) {
                                    try {
                                        const urlObj = new URL(fileUrl);
                                        filename = urlObj.pathname.substring(urlObj.pathname.lastIndexOf('/') + 1);
                                    }
                                    catch {
                                        filename = `file_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                                    }
                                }
                                filename = filename.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim();
                                if (filename.length < 3) {
                                    filename = `file_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                                }
                                const exists = files.some(f => f.url === fileUrl);
                                if (!exists) {
                                    files.push({
                                        url: fileUrl,
                                        filename: filename
                                    });
                                    this.logger.debug(`Found file in ${container}: ${filename} -> ${fileUrl}`);
                                }
                            }
                        }
                    });
                }
            });
            // Look for files in table rows (common for document listings)
            $('table tbody tr').each((index, row) => {
                const cells = $(row).find('td');
                if (cells.length >= 2) {
                    // Assume first cell might be filename, second cell might be link
                    const filenameCell = $(cells[0]).text().trim();
                    const linkCell = $(cells[1]).find('a[href]').first();
                    if (linkCell.length > 0) {
                        const href = linkCell.attr('href');
                        const linkText = linkCell.text().trim();
                        if (href && (filenameCell.length > 0 || linkText.length > 0)) {
                            const fileUrl = href.startsWith('http') ? href : `${this.baseUrl}${href}`;
                            let filename = filenameCell || linkText;
                            filename = filename.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim();
                            if (filename.length < 3) {
                                filename = `file_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                            }
                            const exists = files.some(f => f.url === fileUrl);
                            if (!exists) {
                                files.push({
                                    url: fileUrl,
                                    filename: filename
                                });
                                this.logger.debug(`Found file in table: ${filename} -> ${fileUrl}`);
                            }
                        }
                    }
                }
            });
            this.logger.info(`Found ${files.length} files on page ${pageNumber} of data set ${dataSetNumber}`);
            return files;
        }
        catch (error) {
            this.logger.error(`Error scraping Justice Department page ${url}:`, error);
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
    async hasMorePages(dataSetNumber, pageNumber) {
        const url = `${this.baseUrl}/epstein/doj-disclosures/data-set-${dataSetNumber}-files?page=${pageNumber}`;
        this.logger.info(`Checking for more pages: ${url}`);
        try {
            // Get cookies from environment for authentication
            const cookies = process.env.DOJ_COOKIES || this.configManager.getString('DOJ_COOKIES', '');
            const headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            };
            if (cookies) {
                headers.Cookie = cookies;
                this.logger.debug('Using cookies for pagination check');
            }
            const response = await axios_1.default.get(url, {
                timeout: 30000,
                headers: headers
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
        }
        catch (error) {
            this.logger.error(`Error checking for more pages on ${url}:`, error);
            // Assume no more pages on error to prevent infinite loops
            return false;
        }
    }
}
exports.JusticeScraper = JusticeScraper;
//# sourceMappingURL=justice-scraper.js.map