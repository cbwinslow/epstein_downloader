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
export declare class FullDownloadManager {
    private scraper;
    private logger;
    private downloadDir;
    private progressCallback?;
    private statsCallback?;
    constructor(downloadDir?: string);
    /**
     * Set callback for progress updates
     */
    onProgress(callback: (progress: DownloadProgress) => void): void;
    /**
     * Set callback for stats updates
     */
    onStats(callback: (stats: DownloadStats) => void): void;
    /**
     * Download all files from a specific data set
     */
    downloadDataSet(dataSetNumber: number, maxPages?: number): Promise<DownloadStats>;
    /**
     * Download all files from all data sets
     */
    downloadAllDataSets(maxPagesPerSet?: number, dataSets?: number[]): Promise<DownloadStats[]>;
    /**
     * Discover all pages and files in a data set
     */
    private discoverPages;
    /**
     * Download a single file with retry logic
     */
    private downloadFile;
    /**
     * Utility function to format bytes
     */
    private formatBytes;
    /**
     * Utility function for delays
     */
    private delay;
}
