import { JusticeDepartmentDownloader } from '../services/justice-department-downloader';

// Mock the modules that JusticeDepartmentDownloader depends on
jest.mock('../scraper/data-set-iterator');
jest.mock('../scraper/justice-scraper');
jest.mock('../utils/storage-manager');
jest.mock('../downloader/queue');
jest.mock('../utils/logger');

describe('JusticeDepartmentDownloader - Integration Tests', () => {
  let downloader: JusticeDepartmentDownloader;
  let mockLoggerInstance: any;
  let mockDataSetIteratorInstance: any;
  let mockJusticeScraperInstance: any;
  let mockStorageManagerInstance: any;
  let mockDownloadQueueInstance: any;

  // We'll access the mocked modules to set up their implementations
  const mockDataSetIterator = require('../scraper/data-set-iterator');
  const mockJusticeScraper = require('../scraper/justice-scraper');
  const mockStorageManager = require('../utils/storage-manager');
  const mockDownloadQueue = require('../downloader/queue');
  const mockLogger = require('../utils/logger');

  beforeEach(() => {
    // Setup logger mock
    mockLoggerInstance = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };
    
    // Mock Logger.getInstance to return our mock logger
    (mockLogger.Logger.getInstance as jest.Mock).mockReturnValue(mockLoggerInstance);
    
    // Create a fresh instance for each test
    downloader = new JusticeDepartmentDownloader();
    
    // Create mock instances
    mockDataSetIteratorInstance = new mockDataSetIterator.DataSetIterator();
    mockJusticeScraperInstance = new mockJusticeScraper.JusticeScraper();
    mockStorageManagerInstance = new mockStorageManager.StorageManager({
      type: 'local' as any,
      basePath: './downloads/justice-department'
    });
    mockDownloadQueueInstance = new mockDownloadQueue.DownloadQueue();
    
    // Setup mock methods on the queue instance
    mockDownloadQueueInstance.initialize = jest.fn().mockResolvedValue(undefined);
    mockDownloadQueueInstance.pauseProcessing = jest.fn().mockResolvedValue(undefined);
    mockDownloadQueueInstance.resumeProcessing = jest.fn().mockResolvedValue(undefined);
    mockDownloadQueueInstance.stopProcessing = jest.fn().mockResolvedValue(undefined);
    mockDownloadQueueInstance.getStats = jest.fn().mockResolvedValue({ total: 0, completed: 0, failed: 0, pending: 0 });
    
    // Replace private dependencies with mocked instances using type assertion
    // @ts-ignore - Accessing private property for testing
    (downloader as any).dataSetIterator = mockDataSetIteratorInstance;
    // @ts-ignore - Accessing private property for testing
    (downloader as any).justiceScraper = mockJusticeScraperInstance;
    // @ts-ignore - Accessing private property for testing
    (downloader as any).storageManager = mockStorageManagerInstance;
    // @ts-ignore - Accessing private property for testing
    (downloader as any).downloadQueue = mockDownloadQueueInstance;
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('startDownloadAllDataSets', () => {
    it('should initialize components and start processing', async () => {
      // Setup mocks for iterateDataSets to return some results
      // @ts-ignore - Accessing private property for testing
      (downloader as any).dataSetIterator.iterateDataSets = jest.fn()
        .mockResolvedValue([
          { dataSetNumber: 1, pagesProcessed: 5, filesFound: 10, filesAdded: 10, errors: [] }
        ]);
      
      // Setup mock for storage manager's ensureDirectory
      // @ts-ignore - Accessing private property for testing
      (downloader as any).storageManager.ensureDirectory = jest.fn()
        .mockResolvedValue(undefined);
      
      // Setup mock for download queue's initialize
      // @ts-ignore - Accessing private property for testing
      (downloader as any).downloadQueue.initialize = jest.fn()
        .mockResolvedValue(undefined);
      
      // Execute
      await downloader.startDownloadAllDataSets();
      
      // Verify initialization was called
      expect((downloader as any).storageManager.ensureDirectory)
        .toHaveBeenCalled();
      expect((downloader as any).downloadQueue.initialize)
        .toHaveBeenCalled();
      
      // Verify iteration was called with correct parameters
      expect((downloader as any).dataSetIterator.iterateDataSets)
        .toHaveBeenCalledWith(1, 12);
    });
    
    it('should handle errors during initialization', async () => {
      // Setup mocks to throw an error during initialization
      // @ts-ignore - Accessing private property for testing
      (downloader as any).storageManager.ensureDirectory = jest.fn()
        .mockRejectedValue(new Error('Directory creation failed'));
      
      // Execute and expect no error to be thrown (should be handled gracefully)
      await expect(downloader.startDownloadAllDataSets()).resolves.not.toThrow();
      
      // Verify that the error was handled gracefully by checking that ensureDirectory was called
      expect((downloader as any).storageManager.ensureDirectory)
        .toHaveBeenCalled();
    });
  });

  describe('startDownloadDataSetRange', () => {
    it('should process a specific range of data sets', async () => {
      // Setup mocks
      // @ts-ignore - Accessing private property for testing
      (downloader as any).dataSetIterator.iterateDataSets = jest.fn()
        .mockResolvedValue([
          { dataSetNumber: 5, pagesProcessed: 3, filesFound: 5, filesAdded: 5, errors: [] },
          { dataSetNumber: 6, pagesProcessed: 4, filesFound: 8, filesAdded: 8, errors: [] }
        ]);
      
      // Setup other required mocks
      // @ts-ignore - Accessing private property for testing
      (downloader as any).storageManager.ensureDirectory = jest.fn()
        .mockResolvedValue(undefined);
      // @ts-ignore - Accessing private property for testing
      (downloader as any).downloadQueue.initialize = jest.fn()
        .mockResolvedValue(undefined);
      
      // Execute
      await downloader.startDownloadDataSetRange(5, 6);
      
      // Verify iteration was called with correct range
      expect((downloader as any).dataSetIterator.iterateDataSets)
        .toHaveBeenCalledWith(5, 6);
    });
    
    it('should validate data set range parameters', async () => {
      // Setup required mocks
      // @ts-ignore - Accessing private property for testing
      (downloader as any).storageManager.ensureDirectory = jest.fn()
        .mockResolvedValue(undefined);
      // @ts-ignore - Accessing private property for testing
      (downloader as any).downloadQueue.initialize = jest.fn()
        .mockResolvedValue(undefined);
      
      // Test invalid range (out of bounds)
      await downloader.startDownloadDataSetRange(15, 20);
      
      // Should not call iterator with invalid range
      expect((downloader as any).dataSetIterator.iterateDataSets)
        .not.toHaveBeenCalled();
      
      // Test invalid range (start > end)
      await downloader.startDownloadDataSetRange(10, 5);
      
      // Should not call iterator with invalid range
      expect((downloader as any).dataSetIterator.iterateDataSets)
        .not.toHaveBeenCalled();
    });
  });

  describe('pause and resume functionality', () => {
    it('should pause the downloader', async () => {
      // Set the downloader as running
      // @ts-ignore - Accessing private property for testing
      (downloader as any).isRunning = true;
      
      // Execute
      await downloader.pause();
      
      // Verify pauseProcessing was called on the queue
      expect((downloader as any).downloadQueue.pauseProcessing)
        .toHaveBeenCalled();
    });
    
    it('should resume the downloader', async () => {
      // Set the downloader as running and paused
      // @ts-ignore - Accessing private property for testing
      (downloader as any).isRunning = true;
      // @ts-ignore - Accessing private property for testing
      (downloader as any).isPaused = true;
      
      // Execute
      await downloader.resume();
      
      // Verify resumeProcessing was called on the queue
      expect((downloader as any).downloadQueue.resumeProcessing)
        .toHaveBeenCalled();
    });
  });

  describe('stop functionality', () => {
    it('should stop the downloader', async () => {
      // Set the downloader as running
      // @ts-ignore - Accessing private property for testing
      (downloader as any).isRunning = true;
      
      // Setup required mocks
      // @ts-ignore - Accessing private property for testing
      (downloader as any).storageManager.ensureDirectory = jest.fn()
        .mockResolvedValue(undefined);
      // @ts-ignore - Accessing private property for testing
      (downloader as any).downloadQueue.initialize = jest.fn()
        .mockResolvedValue(undefined);
      // @ts-ignore - Accessing private property for testing
      (downloader as any).downloadQueue.stopProcessing = jest.fn()
        .mockResolvedValue(undefined);
      
      // Execute
      await downloader.stop();
      
      // Verify stopProcessing was called on the queue
      expect((downloader as any).downloadQueue.stopProcessing)
        .toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return statistics from the download queue', async () => {
      const mockStats = { total: 100, completed: 75, failed: 5, pending: 20 };
      mockDownloadQueueInstance.getStats = jest.fn()
        .mockResolvedValue(mockStats);
      
      // Execute
      const stats = await downloader.getStats();
      
      // Verify
      expect(stats).toEqual(mockStats);
      expect(mockDownloadQueueInstance.getStats)
        .toHaveBeenCalled();
    });
  });
});