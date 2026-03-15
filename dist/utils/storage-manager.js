"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageManager = exports.StorageType = void 0;
const logger_1 = require("./logger");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Storage type enumeration
 */
var StorageType;
(function (StorageType) {
    StorageType["LOCAL"] = "local";
    StorageType["REMOTE"] = "remote";
})(StorageType = exports.StorageType || (exports.StorageType = {}));
/**
 * Enhanced storage manager that provides uniform file saving and folder creation
 * Supports both local and remote storage configurations
 */
class StorageManager {
    constructor(config) {
        this.logger = logger_1.Logger.getInstance();
        this.config = config;
    }
    /**
     * Ensure that directories exist, creating them if necessary
     * @param dirPaths Array of directory paths to ensure exist
     */
    async ensureDirectories(dirPaths) {
        for (const dirPath of dirPaths) {
            await this.ensureDirectory(dirPath);
        }
    }
    /**
     * Ensure that a directory exists, creating it if necessary
     * @param dirPath Directory path to ensure exists
     */
    async ensureDirectory(dirPath) {
        if (this.config.type === StorageType.LOCAL) {
            try {
                await fs.promises.mkdir(dirPath, { recursive: true });
                this.logger.debug(`Ensured directory exists: ${dirPath}`);
            }
            catch (error) {
                // If directory already exists, that's fine
                if (error.code !== 'EEXIST') {
                    throw new Error(`Unable to ensure directory exists ${dirPath}: ${error.message}`);
                }
            }
        }
        else {
            // For remote storage, we might need to create directories differently
            // This would depend on the specific remote storage service
            this.logger.info(`Ensuring directory exists on remote storage: ${dirPath}`);
            // Placeholder for remote storage directory creation
        }
    }
    /**
     * Save content to a file with uniform handling
     * @param filePath Path where the file should be saved
     * @param content Content to write to the file
     * @returns Promise resolving to file save result
     */
    async saveFile(filePath, content) {
        try {
            // Ensure directory exists
            const dirPath = path.dirname(filePath);
            await this.ensureDirectory(dirPath);
            if (this.config.type === StorageType.LOCAL) {
                await fs.promises.writeFile(filePath, content);
                const stats = await fs.promises.stat(filePath);
                this.logger.info(`File saved successfully: ${filePath} (${stats.size} bytes)`);
                return {
                    success: true,
                    filePath: filePath,
                    size: stats.size
                };
            }
            else {
                // For remote storage, implement appropriate save logic
                this.logger.info(`Saving file to remote storage: ${filePath}`);
                // Placeholder for remote storage file saving
                return {
                    success: true,
                    filePath: filePath,
                    size: content instanceof Buffer ? content.length : Buffer.from(content).length
                };
            }
        }
        catch (error) {
            const errorMsg = `Failed to save file ${filePath}: ${error.message}`;
            this.logger.error(errorMsg);
            return {
                success: false,
                filePath: filePath,
                size: 0,
                error: errorMsg
            };
        }
    }
    /**
     * Create a file with specific content (alias for saveFile)
     * @param filePath Path where the file should be created
     * @param content Content to write to the file
     * @returns Promise resolving to file save result
     */
    async createFile(filePath, content) {
        return this.saveFile(filePath, content);
    }
    /**
     * Check if a file or directory exists
     * @param filePath Path to check
     * @returns Promise resolving to boolean indicating existence
     */
    async exists(filePath) {
        if (this.config.type === StorageType.LOCAL) {
            try {
                await fs.promises.access(filePath);
                return true;
            }
            catch {
                return false;
            }
        }
        else {
            // For remote storage, implement appropriate existence check
            this.logger.debug(`Checking existence of remote file: ${filePath}`);
            // Placeholder for remote storage existence check
            return false;
        }
    }
    /**
     * Read a file and return its contents as a string
     * @param filePath Path to the file
     * @returns Promise resolving to file contents or null if file doesn't exist
     */
    async readFile(filePath) {
        if (this.config.type === StorageType.LOCAL) {
            try {
                const data = await fs.promises.readFile(filePath, 'utf8');
                return data;
            }
            catch (error) {
                if (error.code === 'ENOENT') {
                    return null; // File doesn't exist
                }
                throw error;
            }
        }
        else {
            // For remote storage, implement appropriate file reading
            this.logger.debug(`Reading file from remote storage: ${filePath}`);
            // Placeholder for remote storage file reading
            return null;
        }
    }
    /**
     * Get file size in bytes
     * @param filePath Path to the file
     * @returns Promise resolving to file size in bytes
     */
    async getFileSize(filePath) {
        if (this.config.type === StorageType.LOCAL) {
            try {
                const stats = await fs.promises.stat(filePath);
                return stats.size;
            }
            catch (error) {
                throw new Error(`Unable to get file size for ${filePath}: ${error.message}`);
            }
        }
        else {
            // For remote storage, implement appropriate size retrieval
            this.logger.debug(`Getting size of remote file: ${filePath}`);
            // Placeholder for remote storage size retrieval
            return 0;
        }
    }
    /**
     * List files in a directory
     * @param dirPath Path to the directory
     * @returns Promise resolving to array of filenames
     */
    async listFiles(dirPath) {
        if (this.config.type === StorageType.LOCAL) {
            try {
                const files = await fs.promises.readdir(dirPath);
                return files;
            }
            catch (error) {
                throw new Error(`Unable to list files in ${dirPath}: ${error.message}`);
            }
        }
        else {
            // For remote storage, implement appropriate directory listing
            this.logger.debug(`Listing files in remote directory: ${dirPath}`);
            // Placeholder for remote storage directory listing
            return [];
        }
    }
    /**
     * Remove a file
     * @param filePath Path to the file to remove
     * @returns Promise resolving when file is removed
     */
    async removeFile(filePath) {
        if (this.config.type === StorageType.LOCAL) {
            try {
                await fs.promises.unlink(filePath);
                this.logger.debug(`Removed file: ${filePath}`);
            }
            catch (error) {
                if (error.code !== 'ENOENT') {
                    throw new Error(`Unable to remove file ${filePath}: ${error.message}`);
                }
                // File doesn't exist, that's fine
            }
        }
        else {
            // For remote storage, implement appropriate file removal
            this.logger.info(`Removing file from remote storage: ${filePath}`);
            // Placeholder for remote storage file removal
        }
    }
    /**
     * Remove a directory and its contents
     * @param dirPath Path to the directory to remove
     * @returns Promise resolving when directory is removed
     */
    async removeDirectory(dirPath) {
        if (this.config.type === StorageType.LOCAL) {
            try {
                await fs.promises.rm(dirPath, { recursive: true, force: true });
                this.logger.debug(`Removed directory: ${dirPath}`);
            }
            catch (error) {
                throw new Error(`Unable to remove directory ${dirPath}: ${error.message}`);
            }
        }
        else {
            // For remote storage, implement appropriate directory removal
            this.logger.info(`Removing directory from remote storage: ${dirPath}`);
            // Placeholder for remote storage directory removal
        }
    }
    /**
     * Create a write stream for a file
     * @param filePath Path where the file should be created
     * @returns WriteStream for the file
     */
    createWriteStream(filePath) {
        if (this.config.type === StorageType.LOCAL) {
            // Ensure directory exists
            const dirPath = path.dirname(filePath);
            this.ensureDirectory(dirPath).catch(error => {
                // Log the error but still create the stream - it will fail when used if directory creation failed
                this.logger.warn(`Failed to ensure directory exists for ${filePath}: ${error.message}`);
            });
            return fs.createWriteStream(filePath);
        }
        else {
            // For remote storage, implement appropriate write stream
            this.logger.info(`Creating write stream for remote file: ${filePath}`);
            // Placeholder for remote storage write stream
            // Return a dummy stream for now
            const { PassThrough } = require('stream');
            return new PassThrough();
        }
    }
    /**
     * Write content to a file
     * @param filePath Path to the file
     * @param content Content to write
     * @returns Promise resolving when write is complete
     */
    async writeFile(filePath, content) {
        const result = await this.saveFile(filePath, content);
        if (!result.success) {
            throw new Error(result.error || 'Failed to write file');
        }
    }
    /**
     * Generate a uniform file path based on data set and file information
     * @param dataSetNumber The data set number
     * @param fileName The original file name
     * @param customDirectory Optional custom directory to use
     * @returns Uniform file path
     */
    generateFilePath(dataSetNumber, fileName, customDirectory) {
        // Clean the filename to remove any problematic characters
        const cleanFileName = fileName.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
        // Determine the base directory
        let baseDir = this.config.basePath;
        if (customDirectory) {
            baseDir = path.join(baseDir, customDirectory);
        }
        // Create data set subdirectory
        const dataSetDir = path.join(baseDir, `data-set-${dataSetNumber}`);
        // Return the full file path
        return path.join(dataSetDir, cleanFileName);
    }
}
exports.StorageManager = StorageManager;
//# sourceMappingURL=storage-manager.js.map