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
      
      // Mock cheerio properly - create a mock that mimics the cheerio API
      const mock$ = {
        // This is what cheerio.load returns - a function that takes a selector and returns an object with .each
        // We need to mock the actual cheerio API
        '*': {
          each: jest.fn()
        },
        'a[href]': {
          each: jest.fn().mockImplementation((callback) => {
            // Simulate three elements
            callback(0, { attribs: { href: '/epstein/doj-disclosures/file1.pdf' }, children: [{ data: 'File One PDF' }] });
            callback(1, { attribs: { href: 'https://example.com/file2.zip' }, children: [{ data: 'File Two ZIP' }] });
            callback(2, { attribs: { href: '/epstein/doj-disclosures/file3.docx' }, children: [{ data: 'File Three DOCX' }] });
          })
        },
        '.view-content a': {
          each: jest.fn().mockImplementation((callback) => {
            // Simulate one element (the third one, which is a duplicate)
            callback(0, { attribs: { href: '/epstein/doj-disclosures/file3.docx' }, children: [{ data: 'File Three DOCX' }] });
          })
        }
      };
      
      // Mock the cheerio.load function to return a function that returns our mock$
      mockCheerio.load.mockImplementation(() => {
        // This function takes a selector and returns the appropriate mock object
        return (selector: string) => {
          return mock$[selector as keyof typeof mock$] || mock$['*'];
        };
      });
      
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
        '*': {
          each: jest.fn()
        },
        'a[rel="next"], .pager-next a, .next-page': {
          length: 1,
          get: jest.fn().mockReturnValue({ attribs: { href: '?page=2' } })
        },
        '.pager-item, .page-link': {
          length: 0
        },
        '.view-content, .files, .content': {
          length: 1
        }
      };
      
      // Mock the cheerio.load function to return a function that returns our mock$
      mockCheerio.load.mockImplementation(() => {
        // This function takes a selector and returns the appropriate mock object
        return (selector: string) => {
          return mock$[selector as keyof typeof mock$] || mock$['*'];
        };
      });
      
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
        '*': {
          each: jest.fn()
        },
        'a[rel="next"], .pager-next a, .next-page': {
          length: 0
        },
        '.pager-item, .page-link': {
          length: 0
        },
        '.view-content, .files, .content': {
          length: 1
        }
      };
      
      // Mock the cheerio.load function to return a function that returns our mock$
      mockCheerio.load.mockImplementation(() => {
        // This function takes a selector and returns the appropriate mock object
        return (selector: string) => {
          return mock$[selector as keyof typeof mock$] || mock$['*'];
        };
      });
      
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