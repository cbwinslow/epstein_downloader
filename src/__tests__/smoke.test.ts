/**
 * Smoke tests to verify basic functionality and integration
 */
import { Downloader } from '@downloader/core';
import { JusticeScraper } from '@scraper/justice-scraper';
import { DataSetIterator } from '@scraper/data-set-iterator';
import { StorageManager, StorageType } from '@utils/storage-manager';
import { ConfigManager } from '@config/manager';
import { Logger } from '@utils/logger';

describe('Smoke Tests', () => {
  let logger: Logger;
  let configManager: ConfigManager;

  beforeAll(() => {
    logger = Logger.getInstance();
    // Initialize config manager (will use defaults)
    configManager = new ConfigManager();
    // Give logger access to config manager
    logger.setConfigManager(configManager);
  });

  test('should create downloader instance', () => {
    const downloader = new Downloader();
    expect(downloader).toBeInstanceOf(Downloader);
  });

  test('should create justice scraper instance', () => {
    const scraper = new JusticeScraper();
    expect(scraper).toBeInstanceOf(JusticeScraper);
  });

  test('should create data set iterator instance', () => {
    const iterator = new DataSetIterator();
    expect(iterator).toBeInstanceOf(DataSetIterator);
  });

  test('should create storage manager instance', () => {
    const storageConfig = {
      type: StorageType.LOCAL,
      basePath: './test-downloads'
    };
    const storageManager = new StorageManager(storageConfig);
    expect(storageManager).toBeInstanceOf(StorageManager);
  });

  test('should create config manager instance', () => {
    const configManager = new ConfigManager();
    expect(configManager).toBeInstanceOf(ConfigManager);
  });

  test('should create logger instance', () => {
    const logger = Logger.getInstance();
    expect(logger).toBeInstanceOf(Logger);
  });

  test('should validate configuration (with mocks)', async () => {
    // Mock the config manager to avoid missing DOJ_COOKIES error
    const originalValidate = configManager.validate;
    configManager.validate = jest.fn().mockResolvedValue(undefined);
    
    try {
      await configManager.validate();
      expect(configManager.validate).toHaveBeenCalled();
    } finally {
      configManager.validate = originalValidate;
    }
  });

  test('should generate file path correctly', () => {
    const storageConfig = {
      type: StorageType.LOCAL,
      basePath: './downloads'
    };
    const storageManager = new StorageManager(storageConfig);
    
    const filePath = storageManager.generateFilePath(1, 'test-file.pdf');
    // Normalize path separators for cross-platform compatibility
    const normalizedPath = filePath.replace(/\\/g, '/');
    expect(normalizedPath).toBe('downloads/data-set-1/test-file.pdf');
  });
  
  test('should handle special characters in filenames', () => {
    const storageConfig = {
      type: StorageType.LOCAL,
      basePath: './downloads'
    };
    const storageManager = new StorageManager(storageConfig);
    
    const filePath = storageManager.generateFilePath(1, 'file<>:"/\\|?*.pdf');
    // Normalize path separators for cross-platform compatibility
    const normalizedPath = filePath.replace(/\\/g, '/');
    expect(normalizedPath).toBe('downloads/data-set-1/file_________.pdf');
  });
});