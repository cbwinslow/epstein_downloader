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
export declare class JusticeScraper {
    private logger;
    private baseUrl;
    private configManager;
    constructor();
    /**
     * Scrape a Justice Department data set page for file links
     * @param dataSetNumber The data set number (1-12)
     * @param pageNumber The page number to scrape
     * @returns Array of scraped file information
     */
    scrapeDataSetPage(dataSetNumber: number, pageNumber: number): Promise<ScrapedFile[]>;
    /**
     * Check if there are more pages available for a data set
     * @param dataSetNumber The data set number (1-12)
     * @param pageNumber The current page number
     * @returns True if there are more pages, false otherwise
     */
    hasMorePages(dataSetNumber: number, pageNumber: number): Promise<boolean>;
}
