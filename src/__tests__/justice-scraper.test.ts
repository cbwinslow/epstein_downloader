import { JusticeScraper } from '@scraper/justice-scraper';

// Mock axios and cheerio for testing
jest.mock('axios');
jest.mock('cheerio');

describe('JusticeScraper', () => {
  let scraper: JusticeScraper;
  const mockAxios = require('axios');
  // Since we've mocked cheerio, require('cheerio') will return the mocked module
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
      
      // Create mock DOM elements
      const mockElement1 = {
        attribs: { href: '/epstein/doj-disclosures/file1.pdf' },
        children: [{ data: 'File One PDF' }]
      };
      
      const mockElement2 = {
        attribs: { href: 'https://example.com/file2.zip' },
        children: [{ data: 'File Two ZIP' }]
      };
      
      const mockElement3 = {
        attribs: { href: '/epstein/doj-disclosures/file3.docx' },
        children: [{ data: 'File Three DOCX' }]
      };
      
      // Mock cheerio elements that have attr and text methods (what $(element) returns)
      const mockCheerioElement1 = {
        attr: jest.fn().mockReturnValue('/epstein/doj-disclosures/file1.pdf'),
        text: jest.fn().mockReturnValue('File One PDF')
      };
      
      const mockCheerioElement2 = {
        attr: jest.fn().mockReturnValue('https://example.com/file2.zip'),
        text: jest.fn().mockReturnValue('File Two ZIP')
      };
      
      const mockCheerioElement3 = {
        attr: jest.fn().mockReturnValue('/epstein/doj-disclosures/file3.docx'),
        text: jest.fn().mockReturnValue('File Three DOCX')
      };
      
      // Mock the cheerio instance returned by $('a[href]')
      const mockCheerioInstanceForAHref = {
        each: jest.fn((callback) => {
          // Call the callback for each of the three elements
          callback(0, mockElement1);
          callback(1, mockElement2);
          callback(2, mockElement3);
        })
      };
      
      // Mock the cheerio instance returned by $('.view-content a, .file a, .attachment a, .download-link')
      const mockCheerioInstanceForViewContent = {
        each: jest.fn((callback) => {
          // Call the callback for the third element (since it's in .view-content)
          callback(0, mockElement3);
        })
      };
      
      // Mock cheerio.load to return a function that acts as the cheerio selector
      (mockCheerio.load as jest.Mock).mockImplementation((html: string) => {
        // This returns the $ selector function
        return (selector: any) => {
          // If selector is an element (object with attribs), return the appropriate cheerio element mock
          if (selector && typeof selector === 'object' && selector.attribs) {
            if (selector.attribs.href === '/epstein/doj-disclosures/file1.pdf') {
              return mockCheerioElement1;
            } else if (selector.attribs.href === 'https://example.com/file2.zip') {
              return mockCheerioElement2;
            } else if (selector.attribs.href === '/epstein/doj-disclosures/file3.docx') {
              return mockCheerioElement3;
            }
            // Fallback
            return mockCheerioElement1;
          }
          
          // If selector is a string, return our mock cheerio instance for the selectors we care about
          if (selector === 'a[href]') {
            return mockCheerioInstanceForAHref;
          } else if (selector === '.view-content a, .file a, .attachment a, .download-link') {
            return mockCheerioInstanceForViewContent;
          } else if (selector === 'body') {
            // Mock body element with text method
            return {
              text: jest.fn().mockReturnValue('Some body content with enough length to pass the threshold. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.'),
              length: 1
            };
          } else if (selector === '.view-content, .files, .content') {
            // Mock content containers
            return {
              length: 1,
              get: jest.fn()
            };
          }
          
          // For other selectors (like in hasMorePages), return appropriate mocks
          const mockInstance = {
            length: 0,
            get: jest.fn()
          };
          return mockInstance;
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
      // Check that we have the expected filenames (order may vary)
      const filenames = result.map(r => r.filename).sort();
      expect(filenames).toEqual(['file1.pdf', 'file2.zip', 'file3.docx'].sort());
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
            <div class="view-content">Some content here with enough text to pass the threshold. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</div>
          </body>
        </html>
      `;
      
      mockAxios.get.mockResolvedValue({ data: mockHtml });
      
      // Mock cheerio.load to return a function that acts as the cheerio selector
      (mockCheerio.load as jest.Mock).mockImplementation((html: string) => {
        return (selector: string) => {
          // Create a mock cheerio instance with all needed properties
          const mockInstance: any = {
            length: 0,
            get: jest.fn(),
            text: jest.fn()
          };
          
          // Configure the mock based on the selector
          if (selector === 'a[rel="next"], .pager-next a, .next-page') {
            mockInstance.length = 1;
            mockInstance.get.mockReturnValue({ attribs: { href: '?page=2' } });
          } else if (selector === '.pager-item, .page-link') {
            mockInstance.length = 1; // Page links present
          } else if (selector === '.view-content, .files, .content') {
            mockInstance.length = 1; // Content present
          } else if (selector === 'body') {
            mockInstance.length = 1;
            // Create a long enough text to pass the 1000 character threshold
            const longText = 'Some content here with enough text to pass the threshold. '.repeat(20) + 
                           'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. '.repeat(10) +
                           'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. '.repeat(10) +
                           'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. '.repeat(10) +
                           'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.'.repeat(10);
            mockInstance.text.mockReturnValue(longText);
          }
          
          return mockInstance;
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
      
      // Mock the cheerio instance for hasMorePages (no next link)
      const mockCheerioInstance = {
        // We need to mock the properties that are accessed in hasMorePages
        // The code does: ('selector').length > 0 and ('selector').get()
        length: 0,
        get: jest.fn()
      };
      
      // Mock cheerio.load to return a function that acts as the cheerio selector
      (mockCheerio.load as jest.Mock).mockImplementation((html: string) => {
        return (selector: string) => {
          // Create a mock cheerio instance with all needed properties
          const mockInstance: any = {
            length: 0,
            get: jest.fn(),
            text: jest.fn()
          };
          
          // Configure the mock based on the selector
          if (selector === 'a[rel="next"], .pager-next a, .next-page') {
            mockInstance.length = 0;
          } else if (selector === '.pager-item, .page-link') {
            mockInstance.length = 0;
          } else if (selector === '.view-content, .files, .content') {
            mockInstance.length = 1;
          } else if (selector === 'body') {
            // Mock body with sufficient text length
            mockInstance.length = 1;
            mockInstance.text.mockReturnValue('Some content here');
          }
          
          return mockInstance;
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