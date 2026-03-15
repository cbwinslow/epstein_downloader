import { DataSetIterator } from '@scraper/data-set-iterator';
import { JusticeScraper } from '@scraper/justice-scraper';
import { StorageManager } from '@utils/storage-manager';
import { Logger } from '@utils/logger';

// Mock external dependencies
jest.mock('@scraper/justice-scraper');
jest.mock('@utils/storage-manager');
jest.mock('@utils/logger');

describe('Smoke Test - End-to-End Functionality', () => {
  let iterator: DataSetIterator;
  const mockScraper = {
    scrapeDataSetPage: jest.fn(),
    hasMorePages: jest.fn()
  };
  
  const mockStorageManager = {
    saveFile: jest.fn(),
    ensureDirectoryExists: jest.fn(),
    getStorageType: jest.fn().mockReturnValue('local')
  };

  let mockLoggerInstance: any;

  beforeEach(() => {
    // Setup logger mock
    mockLoggerInstance = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn()
    };
    
    // @ts-ignore - Mock Logger.getInstance to return our mock logger
    (Logger.getInstance as jest.Mock).mockReturnValue(mockLoggerInstance);
    
    // @ts-ignore - Override the scraper instance
    iterator = new DataSetIterator();
    // @ts-ignore - Replace the scraper with our mock
    iterator.scraper = mockScraper as JusticeScraper;
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  it('should demonstrate basic end-to-end flow with mocked components', async () => {
    // Setup mocks for a simple scenario
    mockScraper.scrapeDataSetPage.mockResolvedValue([
      { url: 'https://example.com/test.pdf', filename: 'test.pdf' }
    ]);
    
    mockScraper.hasMorePages.mockResolvedValue(false); // Only one page
    
    // Execute the iteration for one data set
    const results = await iterator.iterateDataSets(1, 1);
    
    // Verify basic flow worked
    expect(results).toHaveLength(1);
    expect(results[0].dataSetNumber).toBe(1);
    expect(results[0].pagesProcessed).toBe(1);
    expect(results[0].filesFound).toBe(1);
    expect(results[0].filesAdded).toBe(1);
    
    // Verify scraper was called correctly
    expect(mockScraper.scrapeDataSetPage).toHaveBeenCalledWith(1, 1);
    expect(mockScraper.hasMorePages).toHaveBeenCalledWith(1, 1);
  });

  it('should handle multiple data sets and pages', async () => {
    // Setup mocks for multiple data sets and pages
    mockScraper.scrapeDataSetPage
      .mockResolvedValueOnce([{ url: 'https://example.com/file1.pdf', filename: 'file1.pdf' }]) // DS1, Page1
      .mockResolvedValueOnce([{ url: 'https://example.com/file2.pdf', filename: 'file2.pdf' }]) // DS1, Page2
      .mockResolvedValueOnce([{ url: 'https://example.com/file3.pdf', filename: 'file3.pdf' }]); // DS2, Page1
    
    mockScraper.hasMorePages
      .mockResolvedValueOnce(true)  // DS1, Page1 has more
      .mockResolvedValueOnce(false) // DS1, Page2 no more
      .mockResolvedValueOnce(false); // DS2, Page1 no more
    
    // Execute iteration across two data sets
    const results = await iterator.iterateDataSets(1, 2);
    
    // Verify results
    expect(results).toHaveLength(2);
    
    // Data set 1: 2 pages, 2 files
    expect(results[0].dataSetNumber).toBe(1);
    expect(results[0].pagesProcessed).toBe(2);
    expect(results[0].filesFound).toBe(2);
    expect(results[0].filesAdded).toBe(2);
    
    // Data set 2: 1 page, 1 file
    expect(results[1].dataSetNumber).toBe(2);
    expect(results[1].pagesProcessed).toBe(1);
    expect(results[1].filesFound).toBe(1);
    expect(results[1].filesAdded).toBe(1);
    
    // Verify scraper calls
    expect(mockScraper.scrapeDataSetPage).toHaveBeenCalledTimes(3);
    expect(mockScraper.scrapeDataSetPage).toHaveBeenNthCalledWith(1, 1, 1);
    expect(mockScraper.scrapeDataSetPage).toHaveBeenNthCalledWith(2, 1, 2);
    expect(mockScraper.scrapeDataSetPage).toHaveBeenNthCalledWith(3, 2, 1);
    
    expect(mockScraper.hasMorePages).toHaveBeenCalledTimes(3);
  });

  it('should handle errors gracefully in end-to-end flow', async () => {
    // Setup mocks where first call fails, second succeeds
    mockScraper.scrapeDataSetPage
      .mockRejectedValueOnce(new Error('Temporary network issue'))
      .mockResolvedValueOnce([{ url: 'https://example.com/recovery.pdf', filename: 'recovery.pdf' }]);
    
    mockScraper.hasMorePages
      .mockResolvedValueOnce(true)  // First page had error but indicates more pages
      .mockResolvedValueOnce(false); // Second page no more
    
    const results = await iterator.iterateDataSets(1, 1);
    
    // Should have processed both pages (one failed, one succeeded)
    expect(results[0].pagesProcessed).toBe(2);
    expect(results[0].filesFound).toBe(1);
    expect(results[0].filesAdded).toBe(1);
    expect(results[0].errors).toContain('Error processing data set 1, page 1: Temporary network issue');
  });
});