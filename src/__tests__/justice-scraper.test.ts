import { JusticeScraper } from '@scraper/justice-scraper';

// Mock axios and cheerio for testing
jest.mock('axios');
jest.mock('cheerio');

describe('JusticeScraper', () => {
  let scraper: JusticeScraper;
  const mockAxios = require('axios');
  const mockCheerio = require('cheerio');

  beforeEach(() => {
    scraper = new JusticeScraper();
    jest.clearAllMocks();
  });

  describe('scrapeDataSetPage', () => {
    it('should scrape file links from a Justice Department page', async () => {
      // Mock axios response
      const mockHtml = `
        <html>
          <body>
            <a href="/epstein/doj-disclosures/file1.pdf">File One PDF</a>
            <a href="https://example.com/file2.zip">File Two ZIP</a>
            <div class="view-content">
              <a href="/epstein/doj-disclosures/file3.docx">File Three DOCX</a>
            </div>
          </body>
        </html>
      `;
      
      mockAxios.get.mockResolvedValue({ data: mockHtml });
      
      // Mock cheerio with a simpler approach that avoids typing issues
      const mock$ = {
        find: jest.fn().mockImplementation((selector) => {
          // Return mock elements based on selector
          if (selector === 'a[href]') {
            return {
              each: jest.fn().mockImplementation((callback) => {
                // Simulate three elements
                callback(0, { attribs: { href: '/epstein/doj-disclosures/file1.pdf' }, children: [{ data: 'File One PDF' }] });
                callback(1, { attribs: { href: 'https://example.com/file2.zip' }, children: [{ data: 'File Two ZIP' }] });
                callback(2, { attribs: { href: '/epstein/doj-disclosures/file3.docx' }, children: [{ data: 'File Three DOCX' }] });
              })
            };
          } else if (selector === '.view-content a') {
            return {
              each: jest.fn().mockImplementation((callback) => {
                // Simulate one element (the third one, which is a duplicate)
                callback(0, { attribs: { href: '/epstein/doj-disclosures/file3.docx' }, children: [{ data: 'File Three DOCX' }] });
              })
            };
          }
          // Default return for other selectors
          return { each: jest.fn() };
        })
      };
      
      mockCheerio.load.mockReturnValue(mock$);
      
      const result = await scraper.scrapeDataSetPage(1, 1);
      
      expect(mockAxios.get).toHaveBeenCalledWith(
        'https://www.justice.gov/epstein/doj-disclosures/data-set-1-files?page=1',
        expect.objectContaining({
          timeout: 30000,
          headers: expect.objectContaining({
            'User-Agent': expect.stringContaining('EpsteinDownloader')
          })
        })
      );
      
      // Should find 3 unique files (duplicates removed)
      expect(result.length).toBe(3);
      expect(result[0].filename).toBe('file1.pdf');
      expect(result[1].filename).toBe('file2.zip');
      expect(result[2].filename).toBe('file3.docx');
    });
    
    it('should return empty array on error', async () => {
      mockAxios.get.mockRejectedValue(new Error('Network error'));
      
      const result = await scraper.scrapeDataSetPage(1, 1);
      
      expect(result).toEqual([]);
    });
  });
  
  describe('hasMorePages', () => {
    it('should return true when more pages are available', async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="pager-next"><a href="?page=2">Next</a></div>
            <div class="view-content">Some content here</div>
          </body>
        </html>
      `;
      
      mockAxios.get.mockResolvedValue({ data: mockHtml });
      
      // Mock cheerio for hasMorePages
      const mock$ = {
        find: jest.fn().mockImplementation((selector) => {
          if (selector === 'a[rel="next"], .pager-next a, .next-page') {
            return {
              length: 1,
              get: jest.fn().mockReturnValue({ attribs: { href: '?page=2' } })
            };
          } else if (selector === '.pager-item, .page-link') {
            return { length: 0 };
          } else if (selector === '.view-content, .files, .content') {
            return { length: 1 };
          }
          return { length: 0 };
        })
      };
      
      mockCheerio.load.mockReturnValue(mock$);
      
      const result = await scraper.hasMorePages(1, 1);
      
      expect(result).toBe(true);
    });
    
    it('should return false when no more pages are available', async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="view-content">Some content here</div>
          </body>
        </html>
      `;
      
      mockAxios.get.mockResolvedValue({ data: mockHtml });
      
      // Mock cheerio for hasMorePages (no next link)
      const mock$ = {
        find: jest.fn().mockImplementation((selector) => {
          if (selector === 'a[rel="next"], .pager-next a, .next-page') {
            return { length: 0 };
          } else if (selector === '.pager-item, .page-link') {
            return { length: 0 };
          } else if (selector === '.view-content, .files, .content') {
            return { length: 1 };
          }
          return { length: 0 };
        })
      };
      
      mockCheerio.load.mockReturnValue(mock$);
      
      const result = await scraper.hasMorePages(1, 1);
      
      expect(result).toBe(false);
    });
    
    it('should return false on error', async () => {
      mockAxios.get.mockRejectedValue(new Error('Network error'));
      
      const result = await scraper.hasMorePages(1, 1);
      
      expect(result).toBe(false);
    });
  });
});