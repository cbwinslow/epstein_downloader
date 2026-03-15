import { Logger } from '@utils/logger';
import { DataSetIterator } from '@scraper/data-set-iterator';
import { JusticeScraper } from '@scraper/justice-scraper';
import { StorageManager, StorageType } from '@utils/storage-manager';
import { DownloadItem, DownloadStatus } from '@downloader/types';
import { DownloadQueue } from '@downloader/queue';

/**
 * Service for downloading Justice Department Epstein data sets
 * Handles iteration through data sets 1-12, scraping file links, and managing downloads
 */
export class JusticeDepartmentDownloader {
  private logger: Logger;
  private dataSetIterator: DataSetIterator;
  private justiceScraper: JusticeScraper;
  private storageManager: StorageManager;
  private downloadQueue: DownloadQueue;
  private isRunning: boolean = false;
  private isPaused: boolean = false;

  constructor() {
    this.logger = Logger.getInstance();
    this.dataSetIterator = new DataSetIterator();
    this.justiceScraper = new JusticeScraper();
    
    // Configure storage manager for local storage by default
    const storageConfig = {
      type: StorageType.LOCAL,
      basePath: './downloads/justice-department'
    };
    this.storageManager = new StorageManager(storageConfig);
    
    this.downloadQueue = new DownloadQueue();
  }

  /**
   * Initialize the downloader
   */
  public async initialize(): Promise<void> {
    this.logger.info('Initializing Justice Department downloader...');
    
    // Ensure base download directory exists
    await this.storageManager.ensureDirectory('./downloads/justice-department');
    
    // Initialize the download queue
    await this.downloadQueue.initialize();
    
    this.logger.info('Justice Department downloader initialized');
  }

  /**
   * Start downloading all Justice Department data sets (1-12)
   */
  public async startDownloadAllDataSets(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Justice Department downloader is already running');
      return;
    }

    this.logger.info('Starting download of all Justice Department data sets (1-12)...');
    this.isRunning = true;
    this.isPaused = false;

    try {
      // Initialize components if not already done
      await this.initialize();

      // Iterate through all data sets and collect download items
      const results = await this.dataSetIterator.iterateDataSets(1, 12);
      
      // Process results and add files to download queue
      let totalFilesFound = 0;
      let totalFilesAdded = 0;
      
      for (const result of results) {
        // Check if paused before processing each data set result
        while (this.isPaused && this.isRunning) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // If we were stopped while paused, exit
        if (!this.isRunning) {
          break;
        }
        
        this.logger.info(`Data set ${result.dataSetNumber}: ${result.filesFound} files found, ${result.filesAdded} files added`);
        totalFilesFound += result.filesFound;
        totalFilesAdded += result.filesAdded;
        
        // Log any errors
        if (result.errors.length > 0) {
          this.logger.warn(`Data set ${result.dataSetNumber} had ${result.errors.length} errors:`);
          for (const error of result.errors) {
            this.logger.warn(`  - ${error}`);
          }
        }
      }
      
      this.logger.info(`Total: ${totalFilesFound} files found, ${totalFilesAdded} files added to queue`);
      
      // Start processing the download queue
      await this.downloadQueue.startProcessing();
      
    } catch (error) {
      this.logger.error('Error in Justice Department downloader:', error as Error);
    } finally {
      this.isRunning = false;
      this.logger.info('Justice Department downloader stopped');
    }
  }

  /**
   * Start downloading a specific range of data sets
   * @param startDataSet The first data set number (1-12)
   * @param endDataSet The last data set number (1-12)
   */
  public async startDownloadDataSetRange(startDataSet: number = 1, endDataSet: number = 12): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Justice Department downloader is already running');
      return;
    }

    // Initialize components if not already done
    await this.initialize();

    if (startDataSet < 1 || startDataSet > 12 || endDataSet < 1 || endDataSet > 12 || startDataSet > endDataSet) {
      this.logger.error('Invalid data set range. Must be between 1 and 12, with start <= end');
      return;
    }

    this.logger.info(`Starting download of Justice Department data sets ${startDataSet}-${endDataSet}...`);
    this.isRunning = true;
    this.isPaused = false;

    try {
      // Iterate through the specified data set range and collect download items
      const results = await this.dataSetIterator.iterateDataSets(startDataSet, endDataSet);
      
      // Process results and add files to download queue
      let totalFilesFound = 0;
      let totalFilesAdded = 0;
      
      for (const result of results) {
        // Check if paused before processing each data set result
        while (this.isPaused && this.isRunning) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // If we were stopped while paused, exit
        if (!this.isRunning) {
          break;
        }
        
        this.logger.info(`Data set ${result.dataSetNumber}: ${result.filesFound} files found, ${result.filesAdded} files added`);
        totalFilesFound += result.filesFound;
        totalFilesAdded += result.filesAdded;
        
        // Log any errors
        if (result.errors.length > 0) {
          this.logger.warn(`Data set ${result.dataSetNumber} had ${result.errors.length} errors:`);
          for (const error of result.errors) {
            this.logger.warn(`  - ${error}`);
          }
        }
      }
      
      this.logger.info(`Total: ${totalFilesFound} files found, ${totalFilesAdded} files added to queue`);
      
      // Start processing the download queue
      await this.downloadQueue.startProcessing();
      
    } catch (error) {
      this.logger.error('Error in Justice Department downloader:', error as Error);
    } finally {
      this.isRunning = false;
      this.logger.info('Justice Department downloader stopped');
    }
  }

  /**
   * Pause the download process
   */
  public async pause(): Promise<void> {
    if (!this.isRunning) {
      this.logger.warn('Justice Department downloader is not running');
      return;
    }

    if (this.isPaused) {
      this.logger.warn('Justice Department downloader is already paused');
      return;
    }

    this.logger.info('Pausing Justice Department downloader...');
    this.isPaused = true;
    // Pause the download queue
    await this.downloadQueue.pauseProcessing();
  }

  /**
   * Resume the download process
   */
  public async resume(): Promise<void> {
    if (!this.isRunning) {
      this.logger.warn('Justice Department downloader is not running');
      return;
    }

    if (!this.isPaused) {
      this.logger.warn('Justice Department downloader is not paused');
      return;
    }

    this.logger.info('Resuming Justice Department downloader...');
    this.isPaused = false;
    // Resume the download queue
    await this.downloadQueue.resumeProcessing();
  }

  /**
   * Stop the download process
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      this.logger.warn('Justice Department downloader is not running');
      return;
    }

    this.logger.info('Stopping Justice Department downloader...');
    this.isRunning = false;
    this.isPaused = false;
    await this.downloadQueue.stopProcessing();
  }

  /**
   * Get current status of the downloader
   */
  public getStatus(): { isRunning: boolean; isPaused: boolean } {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused
    };
  }

  /**
   * Get download statistics
   */
  public async getStats(): Promise<any> {
    return await this.downloadQueue.getStats();
  }
}