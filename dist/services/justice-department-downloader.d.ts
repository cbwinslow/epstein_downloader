/**
 * Service for downloading Justice Department Epstein data sets
 * Handles iteration through data sets 1-12, scraping file links, and managing downloads
 */
export declare class JusticeDepartmentDownloader {
    private logger;
    private dataSetIterator;
    private justiceScraper;
    private storageManager;
    private downloadQueue;
    private isRunning;
    private isPaused;
    constructor();
    /**
     * Initialize the downloader
     */
    initialize(): Promise<void>;
    /**
     * Start downloading all Justice Department data sets (1-12)
     */
    startDownloadAllDataSets(): Promise<void>;
    /**
     * Start downloading a specific range of data sets
     * @param startDataSet The first data set number (1-12)
     * @param endDataSet The last data set number (1-12)
     */
    startDownloadDataSetRange(startDataSet?: number, endDataSet?: number): Promise<void>;
    /**
     * Pause the download process
     */
    pause(): Promise<void>;
    /**
     * Resume the download process
     */
    resume(): Promise<void>;
    /**
     * Stop the download process
     */
    stop(): Promise<void>;
    /**
     * Get current status of the downloader
     */
    getStatus(): {
        isRunning: boolean;
        isPaused: boolean;
    };
    /**
     * Get download statistics
     */
    getStats(): Promise<any>;
}
