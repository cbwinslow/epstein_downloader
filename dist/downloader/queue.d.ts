import { DownloadItem } from './types';
/**
 * Manages the download queue and persistence
 */
export declare class DownloadQueue {
    private queue;
    private readonly stateFilePath;
    private readonly fileSystemManager;
    private readonly logger;
    constructor();
    /**
     * Initialize the queue (load state, etc.)
     */
    initialize(): Promise<void>;
    /**
     * Add an item to the queue
     */
    addItem(item: DownloadItem): Promise<void>;
    /**
     * Get the next item from the queue
     */
    nextItem(): Promise<DownloadItem | null>;
    /**
     * Update an item in the queue
     */
    updateItem(item: DownloadItem): Promise<void>;
    /**
     * Load queue state from file
     */
    loadState(): Promise<void>;
    /**
     * Save queue state to file
     */
    saveState(): Promise<void>;
    /**
     * Get statistics about the queue
     */
    getStats(): Promise<any>;
    /**
     * Clear completed and failed items from queue (optional cleanup)
     */
    clearCompleted(): Promise<void>;
}
