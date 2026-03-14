import { DataSetIterator } from '@scraper/data-set-iterator';
import { JusticeScraper } from '@scraper/justice-scraper';

// Mock the scraper
jest.mock('@scraper/justice-scraper');

describe('DataSetIterator', () => {
  let iterator: DataSetIterator;

  beforeEach(() => {
    iterator = new DataSetIterator();
    jest.clearAllMocks();
  });

  describe('iterateDataSetPages', () => {
    it('should iterate through pages and collect files', async () => {
      // Mock scraper responses
      const mockScrapePage1 = [
        { url: 'https://example.com/file1.pdf', filename: 'file1.pdf' },
        { url: 'https://example.com/file2.zip', filename: 'file2.zip' }
      ];
      
      const mockScrapePage2 = [
        { url: 'https://example.com/file3.pdf', filename: 'file3.pdf' }
      ];
      
      // Create a mock instance
      const mockScraperInstance = {
        scrapeDataSetPage: jest.fn()
          .mockResolvedValueOnce(mockScrapePage1)
          .mockResolvedValueOnce(mockScrapePage2),
        hasMorePages: jest.fn()
          .mockResolvedValueOnce(true)  // Page 1 has more pages
          .mockResolvedValueOnce(false) // Page 2 has no more pages
      };
      
      // Mock the JusticeScraper constructor to return our mock instance
      // Using any to avoid TypeScript issues with mocking
      (JusticeScraper as any).mockImplementation(() => mockScraperInstance);
      
      const result = await iterator.iterateDataSetPages(1);
      
      expect(result.dataSetNumber).toBe(1);
      expect(result.pagesProcessed).toBe(2);
      expect(result.filesFound).toBe(3);
      expect(result.filesAdded).toBe(3);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle errors during scraping', async () => {
      // Create a mock instance
      const mockScraperInstance = {
        scrapeDataSetPage: jest.fn()
          .mockRejectedValueOnce(new Error('Network error'))
          .mockResolvedValueOnce([
            { url: 'https://example.com/file1.pdf', filename: 'file1.pdf' }
          ]),
        hasMorePages: jest.fn()
          .mockResolvedValueOnce(true)  // Continue despite error
          .mockResolvedValueOnce(false) // No more pages after second
      };
      
      // Mock the JusticeScraper constructor to return our mock instance
      (JusticeScraper as any).mockImplementation(() => mockScraperInstance);
      
      const result = await iterator.iterateDataSetPages(1);
      
      expect(result.dataSetNumber).toBe(1);
      expect(result.pagesProcessed).toBe(2);
      expect(result.filesFound).toBe(1); // Only successful page counts
      expect(result.filesAdded).toBe(1);
      expect(result.errors).toContainEqual(expect.stringContaining('Network error'));
    });

    it('should respect maximum pages limit', async () => {
      // Create a mock instance
      const mockScraperInstance = {
        scrapeDataSetPage: jest.fn()
          .mockResolvedValue([{ url: 'https://example.com/file1.pdf', filename: 'file1.pdf' }]),
        hasMorePages: jest.fn()
          .mockResolvedValue(true) // Always say there are more pages
      };
      
      // Mock the JusticeScraper constructor to return our mock instance
      (JusticeScraper as any).mockImplementation(() => mockScraperInstance);
      
      // Set a low limit for testing
      iterator['maxPagesPerSet'] = 2;
      
      const result = await iterator.iterateDataSetPages(1);
      
      expect(result.pagesProcessed).toBe(2); // Should stop at limit
      expect(result.errors).toContainEqual(expect.stringContaining('maximum pages limit'));
    });
  });

  describe('iterateDataSets', () => {
    it('should iterate through multiple data sets', async () => {
      // Create a mock instance
      const mockScraperInstance = {
        scrapeDataSetPage: jest.fn()
          .mockResolvedValueOnce([{ url: 'https://example.com/file1.pdf', filename: 'file1.pdf' }]) // DS1, Page 1
          .mockResolvedValueOnce([]) // DS1, Page 2 (no files)
          .mockResolvedValueOnce([{ url: 'https://example.com/file2.pdf', filename: 'file2.pdf' }]) // DS2, Page 1
          .mockResolvedValueOnce([]), // DS2, Page 2 (no files)
        hasMorePages: jest.fn()
          .mockResolvedValueOnce(false) // DS1, Page 1 - no more pages
          .mockResolvedValueOnce(false) // DS1, Page 2 - no more pages
          .mockResolvedValueOnce(false) // DS2, Page 1 - no more pages
          .mockResolvedValueOnce(false) // DS2, Page 2 - no more pages
      };
      
      // Mock the JusticeScraper constructor to return our mock instance
      (JusticeScraper as any).mockImplementation(() => mockScraperInstance);
      
      const results = await iterator.iterateDataSets(1, 2);
      
      expect(results).toHaveLength(2);
      expect(results[0].dataSetNumber).toBe(1);
      expect(results[1].dataSetNumber).toBe(2);
      expect(results[0].filesFound).toBe(1);
      expect(results[1].filesFound).toBe(1);
    });
  });
});