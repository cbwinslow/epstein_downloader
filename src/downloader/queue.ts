import { DownloadItem, DownloadStatus } from './types';
import { Logger } from '../utils/logger';
import { FileSystemManager } from '../utils/file-system';
import { StorageManager, StorageType } from '../utils/storage-manager';

/**
 * Manages the download queue and persistence
 */
export class DownloadQueue {
  private queue: DownloadItem[] = [];
  private readonly stateFilePath: string;
  private readonly fileSystemManager: FileSystemManager;
  private readonly storageManager: StorageManager;
  private readonly logger: Logger;
  private isPaused: boolean = false;

  constructor() {
    this.fileSystemManager = new FileSystemManager();
    // Initialize storage manager with default local storage
    const storageConfig = {
      type: StorageType.LOCAL,
      basePath: './downloads'
    };
    this.storageManager = new StorageManager(storageConfig);
    this.logger = Logger.getInstance();
    // State file path will be set during initialization
    this.stateFilePath = './download-state.json';
  }

  /**
   * Initialize the queue (load state, etc.)
   */
  public async initialize(): Promise<void> {
    await this.loadState();
  }

  /**
   * Add an item to the queue
   */
  public async addItem(item: DownloadItem): Promise<void> {
    this.queue.push(item);
    this.logger.debug(`Added item to queue: ${item.id}`);
    await this.saveState();
  }

  /**
   * Get the next item from the queue
   */
  public async nextItem(): Promise<DownloadItem | null> {
    // Filter for pending items
    const pendingItems = this.queue.filter(item => item.status === DownloadStatus.PENDING);
    
    if (pendingItems.length === 0) {
      return null;
    }
    
    // Return the first pending item (FIFO)
    return pendingItems[0];
  }

  /**
   * Update an item in the queue
   */
  public async updateItem(item: DownloadItem): Promise<void> {
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
  public async loadState(): Promise<void> {
    try {
      const stateData = await this.storageManager.readFile(this.stateFilePath);
      if (stateData) {
        this.queue = JSON.parse(stateData);
        // Convert string dates back to Date objects
        this.queue.forEach(item => {
          item.createdAt = new Date(item.createdAt);
          if (item.startTime) item.startTime = new Date(item.startTime);
          if (item.endTime) item.endTime = new Date(item.endTime);
        });
        this.logger.info(`Loaded ${this.queue.length} items from state file`);
      }
    } catch (error) {
      // If file doesn't exist or is invalid, start with empty queue
      this.logger.warn('Could not load state file, starting with empty queue');
      this.queue = [];
    }
  }

  /**
   * Save queue state to file
   */
  public async saveState(): Promise<void> {
    try {
      // Create a copy with serializable dates
      const serializableQueue = this.queue.map(item => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
        startTime: item.startTime ? item.startTime.toISOString() : null,
        endTime: item.endTime ? item.endTime.toISOString() : null
      }));
      
      await this.storageManager.writeFile(this.stateFilePath, JSON.stringify(serializableQueue, null, 2));
      this.logger.debug('Saved queue state to file');
    } catch (error) {
      this.logger.error('Failed to save queue state:', error as Error);
    }
  }

  /**
   * Get statistics about the queue
   */
  public async getStats(): Promise<any> {
    const stats = {
      total: this.queue.length,
      pending: this.queue.filter(item => item.status === DownloadStatus.PENDING).length,
      downloading: this.queue.filter(item => item.status === DownloadStatus.DOWNLOADING).length,
      completed: this.queue.filter(item => item.status === DownloadStatus.COMPLETED).length,
      failed: this.queue.filter(item => item.status === DownloadStatus.FAILED).length,
      paused: this.queue.filter(item => item.status === DownloadStatus.PAUSED).length
    };
    
    return stats;
  }

  /**
   * Clear completed and failed items from queue (optional cleanup)
   */
  public async clearCompleted(): Promise<void> {
    const initialLength = this.queue.length;
    this.queue = this.queue.filter(item => 
      item.status === DownloadStatus.PENDING || 
      item.status === DownloadStatus.DOWNLOADING ||
      item.status === DownloadStatus.PAUSED
    );
    const removed = initialLength - this.queue.length;
    if (removed > 0) {
      this.logger.info(`Cleared ${removed} completed/failed items from queue`);
      await this.saveState();
    }
  }

  /**
   * Start processing the queue
   */
  public async startProcessing(): Promise<void> {
    this.isPaused = false;
    this.logger.info('Download queue processing started');
  }

  /**
   * Pause processing of the queue
   */
  public async pauseProcessing(): Promise<void> {
    this.isPaused = true;
    this.logger.info('Download queue processing paused');
  }

  /**
   * Resume processing of the queue
   */
  public async resumeProcessing(): Promise<void> {
    this.isPaused = false;
    this.logger.info('Download queue processing resumed');
  }

  /**
   * Stop processing of the queue
   */
  public async stopProcessing(): Promise<void> {
    this.isPaused = false;
    this.logger.info('Download queue processing stopped');
  }

  /**
   * Check if processing is paused
   */
  public isProcessingPaused(): boolean {
    return this.isPaused;
  }
}