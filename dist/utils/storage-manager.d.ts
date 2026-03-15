/// <reference types="node" />
/// <reference types="node" />
/**
 * Storage type enumeration
 */
export declare enum StorageType {
    LOCAL = "local",
    REMOTE = "remote"
}
/**
 * Configuration for storage systems
 */
export interface StorageConfig {
    type: StorageType;
    basePath: string;
}
/**
 * Interface for file save operations
 */
export interface FileSaveResult {
    success: boolean;
    filePath: string;
    size: number;
    error?: string;
}
/**
 * Enhanced storage manager that provides uniform file saving and folder creation
 * Supports both local and remote storage configurations
 */
export declare class StorageManager {
    private logger;
    private config;
    constructor(config: StorageConfig);
    /**
     * Ensure that directories exist, creating them if necessary
     * @param dirPaths Array of directory paths to ensure exist
     */
    ensureDirectories(dirPaths: string[]): Promise<void>;
    /**
     * Ensure that a directory exists, creating it if necessary
     * @param dirPath Directory path to ensure exists
     */
    ensureDirectory(dirPath: string): Promise<void>;
    /**
     * Save content to a file with uniform handling
     * @param filePath Path where the file should be saved
     * @param content Content to write to the file
     * @returns Promise resolving to file save result
     */
    saveFile(filePath: string, content: string | Buffer): Promise<FileSaveResult>;
    /**
     * Create a file with specific content (alias for saveFile)
     * @param filePath Path where the file should be created
     * @param content Content to write to the file
     * @returns Promise resolving to file save result
     */
    createFile(filePath: string, content: string | Buffer): Promise<FileSaveResult>;
    /**
     * Check if a file or directory exists
     * @param filePath Path to check
     * @returns Promise resolving to boolean indicating existence
     */
    exists(filePath: string): Promise<boolean>;
    /**
     * Read a file and return its contents as a string
     * @param filePath Path to the file
     * @returns Promise resolving to file contents or null if file doesn't exist
     */
    readFile(filePath: string): Promise<string | null>;
    /**
     * Get file size in bytes
     * @param filePath Path to the file
     * @returns Promise resolving to file size in bytes
     */
    getFileSize(filePath: string): Promise<number>;
    /**
     * List files in a directory
     * @param dirPath Path to the directory
     * @returns Promise resolving to array of filenames
     */
    listFiles(dirPath: string): Promise<string[]>;
    /**
     * Remove a file
     * @param filePath Path to the file to remove
     * @returns Promise resolving when file is removed
     */
    removeFile(filePath: string): Promise<void>;
    /**
     * Remove a directory and its contents
     * @param dirPath Path to the directory to remove
     * @returns Promise resolving when directory is removed
     */
    removeDirectory(dirPath: string): Promise<void>;
    /**
     * Create a write stream for a file
     * @param filePath Path where the file should be created
     * @returns WriteStream for the file
     */
    createWriteStream(filePath: string): any;
    /**
     * Write content to a file
     * @param filePath Path to the file
     * @param content Content to write
     * @returns Promise resolving when write is complete
     */
    writeFile(filePath: string, content: string): Promise<void>;
    /**
     * Generate a uniform file path based on data set and file information
     * @param dataSetNumber The data set number
     * @param fileName The original file name
     * @param customDirectory Optional custom directory to use
     * @returns Uniform file path
     */
    generateFilePath(dataSetNumber: number, fileName: string, customDirectory?: string): string;
}
