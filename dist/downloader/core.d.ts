/**
 * Core downloader class that manages the download process
 */
export declare class Downloader {
    private configManager;
    private logger;
    private connectionValidator;
    private cookieManager;
    private downloadQueue;
    private fileSystemManager;
    private isRunning;
    private maxThreads;
    constructor();
    /**
     * Initialize the downloader
     */
    initialize(): Promise<void>;
    /**
     * Start the download process
     */
    start(): Promise<void>;
    /**
     * Stop the download process
     */
    stop(): Promise<void>;
    /**
     * Worker thread function that processes download queue
     */
    private worker;
    /**
     * Process a single download item
     */
    private processDownloadItem;
    /**
     * Perform the actual file download
     */
    private downloadFile;
    /**
     * Add a download URL to the queue
     */
    addDownload(url: string, filename?: string, size?: number): Promise<void>;
    /**
     * Extract filename from URL
     */
    private extractFilename;
    /**
     * Get download statistics
     */
    getStats(): Promise<any>;
}
