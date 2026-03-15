import { DataSetIterator } from '@scraper/data-set-iterator';
import { JusticeScraper } from '@scraper/justice-scraper';

// Mock the JusticeScraper
jest.mock('@scraper/justice-scraper');

describe('DataSetIterator', () => {
  let iterator: DataSetIterator;
  const mockScraper = {
    scrapeDataSetPage: jest.fn(),
    hasMorePages: jest.fn()
  };

  beforeEach(() => {
    // @ts-ignore - Override the scraper instance
    iterator = new DataSetIterator();
    // @ts-ignore - Replace the scraper with our mock
    iterator.scraper = mockScraper as JusticeScraper;
    jest.clearAllMocks();
  });

  describe('iterateDataSetPages', () => {
    it('should process a single page data set correctly', async () => {
      // Mock scraper responses
      mockScraper.scrapeDataSetPage.mockResolvedValue([
        { url: 'https://example.com/file1.pdf', filename: 'file1.pdf' },
        { url: 'https://example.com/file2.zip', filename: 'file2.zip' }
      ]);
      
      // First call returns false (no more pages)
      mockScraper.hasMorePages.mockResolvedValueOnce(false);

      const result = await iterator.iterateDataSetPages(1);

      expect(result).toEqual({
        dataSetNumber: 1,
        pagesProcessed: 1,
        filesFound: 2,
        filesAdded: 2,
        errors: []
      });

      expect(mockScraper.scrapeDataSetPage).toHaveBeenCalledWith(1, 1);
      expect(mockScraper.hasMorePages).toHaveBeenCalledWith(1, 1);
    });

    it('should process multiple pages correctly', async () => {
      // Mock scraper responses for two pages
      mockScraper.scrapeDataSetPage
        .mockResolvedValueOnce([{ url: 'https://example.com/file1.pdf', filename: 'file1.pdf' }])
        .mockResolvedValueOnce([{ url: 'https://example.com/file2.zip', filename: 'file2.zip' }]);
      
      // Page 1: more pages, Page 2: no more pages
      mockScraper.hasMorePages
        .mockResolvedValueOnce(true)  // Page 1 has more
        .mockResolvedValueOnce(false); // Page 2 has no more

      const result = await iterator.iterateDataSetPages(1);

      expect(result).toEqual({
        dataSetNumber: 1,
        pagesProcessed: 2,
        filesFound: 2,
        filesAdded: 2,
        errors: []
      });

      expect(mockScraper.scrapeDataSetPage).toHaveBeenCalledTimes(2);
      expect(mockScraper.scrapeDataSetPage).toHaveBeenNthCalledWith(1, 1, 1);
      expect(mockScraper.scrapeDataSetPage).toHaveBeenNthCalledWith(2, 1, 2);
      expect(mockScraper.hasMorePages).toHaveBeenCalledTimes(2);
    });

    it('should handle errors during scraping and continue', async () => {
      // First page throws an error, second page works
      mockScraper.scrapeDataSetPage
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce([{ url: 'https://example.com/file1.pdf', filename: 'file1.pdf' }]);
      
      // Page 1: more pages (even though it failed), Page 2: no more pages
      mockScraper.hasMorePages
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      const result = await iterator.iterateDataSetPages(1);

      expect(result.pagesProcessed).toBe(2);
      expect(result.filesFound).toBe(1);
      expect(result.filesAdded).toBe(1);
      expect(result.errors).toContain('Error processing data set 1, page 1: Network error');
    });

    it('should respect the maximum pages limit', async () => {
      // Mock scraper to always return files and indicate more pages
      mockScraper.scrapeDataSetPage.mockResolvedValue([{ url: 'https://example.com/file1.pdf', filename: 'file1.pdf' }]);
      mockScraper.hasMorePages.mockResolvedValue(true); // Always says there are more pages

      const result = await iterator.iterateDataSetPages(1);

      // Should stop at maxPagesPerSet (100)
      expect(result.pagesProcessed).toBe(100);
      expect(result.filesFound).toBe(100);
      expect(result.filesAdded).toBe(100);
      expect(result.errors).toContain('Reached maximum pages limit (100) for data set 1');
    });
  });

  describe('iterateDataSets', () => {
    it('should iterate through multiple data sets', async () => {
      // Mock scraper responses
      mockScraper.scrapeDataSetPage.mockResolvedValue([
        { url: 'https://example.com/file1.pdf', filename: 'file1.pdf' }
      ]);
      mockScraper.hasMorePages.mockResolvedValue(false); // No more pages after first

      const results = await iterator.iterateDataSets(1, 3);

      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({
        dataSetNumber: 1,
        pagesProcessed: 1,
        filesFound: 1,
        filesAdded: 1,
        errors: []
      });
      expect(results[1]).toEqual({
        dataSetNumber: 2,
        pagesProcessed: 1,
        filesFound: 1,
        filesAdded: 1,
        errors: []
      });
      expect(results[2]).toEqual({
        dataSetNumber: 3,
        pagesProcessed: 1,
        filesFound: 1,
        filesAdded: 1,
        errors: []
      });

      // Should have called scrapeDataSetPage for each data set (3 times)
      expect(mockScraper.scrapeDataSetPage).toHaveBeenCalledTimes(3);
      expect(mockScraper.scrapeDataSetPage).toHaveBeenNthCalledWith(1, 1, 1);
      expect(mockScraper.scrapeDataSetPage).toHaveBeenNthCalledWith(2, 2, 1);
      expect(mockScraper.scrapeDataSetPage).toHaveBeenNthCalledWith(3, 3, 1);
    });
  });
});