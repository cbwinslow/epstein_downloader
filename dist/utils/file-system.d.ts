/**
 * File system utility functions
 */
export declare class FileSystemManager {
    /**
     * Ensure that directories exist, creating them if necessary
     */
    ensureDirectories(dirPaths: string[]): Promise<void>;
    /**
     * Ensure that a directory exists, creating it if necessary
     */
    ensureDirectory(dirPath: string): Promise<void>;
    /**
     * Read a file and return its contents as a string
     */
    readFile(filePath: string): Promise<string | null>;
    /**
     * Write content to a file
     */
    writeFile(filePath: string, content: string): Promise<void>;
    /**
     * Create a file with specific content
     */
    createFile(filePath: string, content: string): Promise<void>;
    /**
     * Check if a file or directory exists
     */
    exists(filePath: string): Promise<boolean>;
    /**
     * Get file size in bytes
     */
    getFileSize(filePath: string): Promise<number>;
    /**
     * List files in a directory
     */
    listFiles(dirPath: string): Promise<string[]>;
    /**
     * Remove a file
     */
    removeFile(filePath: string): Promise<void>;
    /**
     * Remove a directory and its contents
     */
    removeDirectory(dirPath: string): Promise<void>;
}
