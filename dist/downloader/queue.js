"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DownloadQueue = void 0;
const types_1 = require("./types");
const logger_1 = require("@utils/logger");
const file_system_1 = require("@utils/file-system");
/**
 * Manages the download queue and persistence
 */
class DownloadQueue {
    constructor() {
        this.queue = [];
        this.fileSystemManager = new file_system_1.FileSystemManager();
        this.logger = logger_1.Logger.getInstance();
        // State file path will be set during initialization
        this.stateFilePath = './download-state.json';
    }
    /**
     * Initialize the queue (load state, etc.)
     */
    async initialize() {
        await this.loadState();
    }
    /**
     * Add an item to the queue
     */
    async addItem(item) {
        this.queue.push(item);
        this.logger.debug(`Added item to queue: ${item.id}`);
        await this.saveState();
    }
    /**
     * Get the next item from the queue
     */
    async nextItem() {
        // Filter for pending items
        const pendingItems = this.queue.filter(item => item.status === types_1.DownloadStatus.PENDING);
        if (pendingItems.length === 0) {
            return null;
        }
        // Return the first pending item (FIFO)
        return pendingItems[0];
    }
    /**
     * Update an item in the queue
     */
    async updateItem(item) {
        const index = this.queue.findIndex(i => i.id === item.id);
        if (index !== -1) {
            this.queue[index] = item;
            this.logger.debug(`Updated item in queue: ${item.id}`);
            await this.saveState();
        }
    }
    /**
     * Load queue state from file
     */
    async loadState() {
        try {
            const stateData = await this.fileSystemManager.readFile(this.stateFilePath);
            if (stateData) {
                this.queue = JSON.parse(stateData);
                // Convert string dates back to Date objects
                this.queue.forEach(item => {
                    item.createdAt = new Date(item.createdAt);
                    if (item.startTime)
                        item.startTime = new Date(item.startTime);
                    if (item.endTime)
                        item.endTime = new Date(item.endTime);
                });
                this.logger.info(`Loaded ${this.queue.length} items from state file`);
            }
        }
        catch (error) {
            // If file doesn't exist or is invalid, start with empty queue
            this.logger.warn('Could not load state file, starting with empty queue');
            this.queue = [];
        }
    }
    /**
     * Save queue state to file
     */
    async saveState() {
        try {
            // Create a copy with serializable dates
            const serializableQueue = this.queue.map(item => ({
                ...item,
                createdAt: item.createdAt.toISOString(),
                startTime: item.startTime ? item.startTime.toISOString() : null,
                endTime: item.endTime ? item.endTime.toISOString() : null
            }));
            await this.fileSystemManager.writeFile(this.stateFilePath, JSON.stringify(serializableQueue, null, 2));
            this.logger.debug('Saved queue state to file');
        }
        catch (error) {
            this.logger.error('Failed to save queue state:', error);
        }
    }
    /**
     * Get statistics about the queue
     */
    async getStats() {
        const stats = {
            total: this.queue.length,
            pending: this.queue.filter(item => item.status === types_1.DownloadStatus.PENDING).length,
            downloading: this.queue.filter(item => item.status === types_1.DownloadStatus.DOWNLOADING).length,
            completed: this.queue.filter(item => item.status === types_1.DownloadStatus.COMPLETED).length,
            failed: this.queue.filter(item => item.status === types_1.DownloadStatus.FAILED).length,
            paused: this.queue.filter(item => item.status === types_1.DownloadStatus.PAUSED).length
        };
        return stats;
    }
    /**
     * Clear completed and failed items from queue (optional cleanup)
     */
    async clearCompleted() {
        const initialLength = this.queue.length;
        this.queue = this.queue.filter(item => item.status === types_1.DownloadStatus.PENDING ||
            item.status === types_1.DownloadStatus.DOWNLOADING ||
            item.status === types_1.DownloadStatus.PAUSED);
        const removed = initialLength - this.queue.length;
        if (removed > 0) {
            this.logger.info(`Cleared ${removed} completed/failed items from queue`);
            await this.saveState();
        }
    }
}
exports.DownloadQueue = DownloadQueue;
//# sourceMappingURL=queue.js.map