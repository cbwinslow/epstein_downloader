import { Logger } from '@utils/logger';
import { DownloadItem, DownloadStatus } from '@downloader/types';
import { JusticeScraper } from './justice-scraper';

/**
 * Interface for data set iteration results
 */
export interface DataSetIterationResult {
  dataSetNumber: number;
  pagesProcessed: number;
  filesFound: number;
  filesAdded: number;
  errors: string[];
}

/**
 * Iterator that loops through Justice Department data sets and pages
 */
export class DataSetIterator {
  private logger: Logger;
  private scraper: JusticeScraper;
  private maxDataSets: number = 12;
  private maxPagesPerSet: number = 100; // Safety limit to prevent infinite loops

  constructor() {
    this.logger = Logger.getInstance();
    this.scraper = new JusticeScraper();
  }

  /**
   * Iterate through all data sets and pages, extracting file links
   * @param startDataSet The data set number to start from (1-12)
   * @param endDataSet The data set number to end at (1-12)
   * @returns Promise resolving to iteration results for each data set
   */
  public async iterateDataSets(startDataSet: number = 1, endDataSet: number = this.maxDataSets): Promise<DataSetIterationResult[]> {
    this.logger.info(`Starting iteration from data set ${startDataSet} to ${endDataSet}`);
    
    const results: DataSetIterationResult[] = [];
    
    for (let dataSetNum = startDataSet; dataSetNum <= endDataSet; dataSetNum++) {
      this.logger.info(`Processing data set ${dataSetNum}`);
      
      const result = await this.iterateDataSetPages(dataSetNum);
      results.push(result);
      
      this.logger.info(`Completed data set ${dataSetNum}: ${result.filesFound} files found, ${result.filesAdded} files added`);
    }
    
    return results;
  }

  /**
   * Iterate through all pages of a specific data set
   * @param dataSetNumber The data set number to process (1-12)
   * @returns Promise resolving to the iteration result for this data set
   */
  public async iterateDataSetPages(dataSetNumber: number): Promise<DataSetIterationResult> {
    const result: DataSetIterationResult = {
      dataSetNumber: dataSetNumber,
      pagesProcessed: 0,
      filesFound: 0,
      filesAdded: 0,
      errors: []
    };

    let pageNumber = 1;
    let hasMorePages = true;
    let stoppedDueToLimit = false;

    while (hasMorePages && pageNumber <= this.maxPagesPerSet) {
      this.logger.info(`Processing data set ${dataSetNumber}, page ${pageNumber}`);
      
      try {
        // Scrape the current page for file links
        const files = await this.scraper.scrapeDataSetPage(dataSetNumber, pageNumber);
        result.filesFound += files.length;
        result.pagesProcessed++;
        
        // Process each file found
        for (const file of files) {
          try {
            // In a real implementation, we would add these to the download queue
            // For now, we'll just log them
            this.logger.info(`Found file: ${file.filename} - ${file.url}`);
            result.filesAdded++;
          } catch (fileError) {
            const errorMsg = `Error processing file ${file.filename}: ${(fileError as Error).message}`;
            this.logger.error(errorMsg);
            result.errors.push(errorMsg);
          }
        }
        
        // Check if there are more pages
        if (pageNumber < this.maxPagesPerSet) {
          hasMorePages = await this.scraper.hasMorePages(dataSetNumber, pageNumber);
        } else {
          hasMorePages = false;
          stoppedDueToLimit = true; // We hit the safety limit
        }
        
        if (hasMorePages) {
          pageNumber++;
        }
      } catch (error) {
        const errorMsg = `Error processing data set ${dataSetNumber}, page ${pageNumber}: ${(error as Error).message}`;
        this.logger.error(errorMsg);
        result.errors.push(errorMsg);
        
        // Continue to next page on error
        result.pagesProcessed++; // Count this page as processed (even though it failed)
        hasMorePages = await this.scraper.hasMorePages(dataSetNumber, pageNumber);
        if (hasMorePages) {
          pageNumber++;
        } else {
          hasMorePages = false;
        }
      }
    }
    
    if (stoppedDueToLimit) {
      const warningMsg = `Reached maximum pages limit (${this.maxPagesPerSet}) for data set ${dataSetNumber}`;
      this.logger.warn(warningMsg);
      result.errors.push(warningMsg);
    }
    
    return result;
  }
}