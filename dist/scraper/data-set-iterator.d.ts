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
export declare class DataSetIterator {
    private logger;
    private scraper;
    private maxDataSets;
    private maxPagesPerSet;
    constructor();
    /**
     * Iterate through all data sets and pages, extracting file links
     * @param startDataSet The data set number to start from (1-12)
     * @param endDataSet The data set number to end at (1-12)
     * @returns Promise resolving to iteration results for each data set
     */
    iterateDataSets(startDataSet?: number, endDataSet?: number): Promise<DataSetIterationResult[]>;
    /**
     * Iterate through all pages of a specific data set
     * @param dataSetNumber The data set number to process (1-12)
     * @returns Promise resolving to the iteration result for this data set
     */
    iterateDataSetPages(dataSetNumber: number): Promise<DataSetIterationResult>;
}
