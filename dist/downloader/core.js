"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Downloader = void 0;
const types_1 = require("./types");
const manager_1 = require("../config/manager");
const logger_1 = require("../utils/logger");
const connection_validator_1 = require("../agents/connection-validator");
const cookie_manager_1 = require("../agents/cookie-manager");
const queue_1 = require("./queue");
const file_system_1 = require("../utils/file-system");
const axios_1 = __importDefault(require("axios"));
/**
 * Core downloader class that manages the download process
 */
class Downloader {
    constructor() {
        this.isRunning = false;
        this.configManager = new manager_1.ConfigManager();
        this.logger = logger_1.Logger.getInstance();
        this.connectionValidator = new connection_validator_1.ConnectionValidator();
        this.cookieManager = new cookie_manager_1.CookieManager();
        this.downloadQueue = new queue_1.DownloadQueue();
        this.fileSystemManager = new file_system_1.FileSystemManager();
        this.maxThreads = this.configManager.getNumber('downloader.maxThreads', 4);
    }
    /**
     * Initialize the downloader
     */
    async initialize() {
        this.logger.info('Initializing downloader...');
        // Validate configuration
        await this.configManager.validate();
        // Create necessary directories
        await this.fileSystemManager.ensureDirectories([
            this.configManager.getString('storage.downloadDirectory'),
            this.configManager.getString('storage.logDirectory')
        ]);
        // Load previous state if exists
        await this.downloadQueue.loadState();
        this.logger.info('Downloader initialized');
    }
    /**
     * Start the download process
     */
    async start() {
        if (this.isRunning) {
            this.logger.warn('Downloader is already running');
            return;
        }
        this.logger.info('Starting downloader...');
        this.isRunning = true;
        // Validate connection and cookies before starting
        const connectionValid = await this.connectionValidator.validate();
        if (!connectionValid) {
            this.logger.error('Connection validation failed. Cannot start downloader.');
            this.isRunning = false;
            return;
        }
        const cookiesValid = await this.cookieManager.validate();
        if (!cookiesValid) {
            this.logger.error('Cookie validation failed. Cannot start downloader.');
            this.isRunning = false;
            return;
        }
        // Start worker threads
        const workerPromises = [];
        for (let i = 0; i < this.maxThreads; i++) {
            workerPromises.push(this.worker(i));
        }
        try {
            await Promise.all(workerPromises);
        }
        catch (error) {
            this.logger.error('Worker thread error:', error);
        }
        finally {
            this.isRunning = false;
            this.logger.info('Downloader stopped');
        }
    }
    /**
     * Stop the download process
     */
    async stop() {
        if (!this.isRunning) {
            this.logger.warn('Downloader is not running');
            return;
        }
        this.logger.info('Stopping downloader...');
        this.isRunning = false;
        // The workers will check isRunning and exit gracefully
    }
    /**
     * Worker thread function that processes download queue
     */
    async worker(workerId) {
        this.logger.info(`Worker ${workerId} started`);
        while (this.isRunning) {
            try {
                // Get next item from queue
                const item = await this.downloadQueue.nextItem();
                if (!item) {
                    // No items in queue, wait a bit
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    continue;
                }
                // Process the download item
                await this.processDownloadItem(item, workerId);
            }
            catch (error) {
                this.logger.error(`Worker ${workerId} encountered error:`, error);
                // Continue processing other items
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
        this.logger.info(`Worker ${workerId} stopped`);
    }
    /**
     * Process a single download item
     */
    async processDownloadItem(item, workerId) {
        this.logger.info(`Worker ${workerId} processing: ${item.url}`);
        // Update status to downloading
        item.status = types_1.DownloadStatus.DOWNLOADING;
        item.workerId = workerId;
        item.startTime = new Date();
        await this.downloadQueue.updateItem(item);
        try {
            // Perform the actual download
            const success = await this.downloadFile(item);
            if (success) {
                item.status = types_1.DownloadStatus.COMPLETED;
                item.endTime = new Date();
                this.logger.info(`Worker ${workerId} completed: ${item.url}`);
            }
            else {
                item.status = types_1.DownloadStatus.FAILED;
                item.endTime = new Date();
                item.retryCount++;
                // Check if we should retry
                const maxRetries = this.configManager.getNumber('downloader.retryAttempts', 3);
                if (item.retryCount < maxRetries) {
                    this.logger.warn(`Worker ${workerId} download failed, retrying (${item.retryCount}/${maxRetries}): ${item.url}`);
                    // Add back to queue for retry
                    await this.downloadQueue.addItem(item);
                }
                else {
                    this.logger.error(`Worker ${workerId} download failed after ${maxRetries} retries: ${item.url}`);
                }
            }
            // Update item in queue
            await this.downloadQueue.updateItem(item);
        }
        catch (error) {
            this.logger.error(`Worker ${workerId} error processing ${item.url}:`, error);
            item.status = types_1.DownloadStatus.FAILED;
            item.endTime = new Date();
            item.errorMessage = error.message;
            await this.downloadQueue.updateItem(item);
        }
    }
    /**
     * Perform the actual file download
     */
    async downloadFile(item) {
        try {
            // Get cookies from cookie manager
            const cookies = this.cookieManager.getCookies();
            // Prepare headers with cookies if available
            const headers = {};
            if (cookies) {
                headers.Cookie = cookies;
            }
            // Make HTTP request with axios
            const response = await (0, axios_1.default)({
                method: 'get',
                url: item.url,
                headers: headers,
                responseType: 'stream',
                timeout: this.configManager.getNumber('downloader.timeout', 30000)
            });
            // Create the file path
            const filePath = `${this.configManager.getString('storage.downloadDirectory')}/${item.filename}`;
            // Write response stream to file
            const writer = this.fileSystemManager.createWriteStream(filePath);
            response.data.pipe(writer);
            // Wait for the stream to finish
            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });
            return true;
        }
        catch (error) {
            this.logger.error(`Download error for ${item.url}:`, error);
            return false;
        }
    }
    /**
     * Add a download URL to the queue
     */
    async addDownload(url, filename, size) {
        const item = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            url,
            filename: filename || this.extractFilename(url),
            size: size || 0,
            status: types_1.DownloadStatus.PENDING,
            retryCount: 0,
            createdAt: new Date(),
            workerId: undefined,
            startTime: undefined,
            endTime: undefined,
            errorMessage: undefined
        };
        await this.downloadQueue.addItem(item);
        this.logger.info(`Added download to queue: ${url}`);
    }
    /**
     * Extract filename from URL
     */
    extractFilename(url) {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            return pathname.substring(pathname.lastIndexOf('/') + 1) || 'download';
        }
        catch {
            // If URL parsing fails, return a default name
            return `download_${Date.now()}`;
        }
    }
    /**
     * Get download statistics
     */
    async getStats() {
        return await this.downloadQueue.getStats();
    }
}
exports.Downloader = Downloader;
//# sourceMappingURL=core.js.map