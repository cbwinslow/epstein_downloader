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
exports.FileSystemManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * File system utility functions
 */
class FileSystemManager {
    /**
     * Ensure that directories exist, creating them if necessary
     */
    async ensureDirectories(dirPaths) {
        for (const dirPath of dirPaths) {
            await this.ensureDirectory(dirPath);
        }
    }
    /**
     * Ensure that a directory exists, creating it if necessary
     */
    async ensureDirectory(dirPath) {
        try {
            await fs.promises.mkdir(dirPath, { recursive: true });
        }
        catch (error) {
            // If directory already exists, that's fine
            if (error.code !== 'EEXIST') {
                throw error;
            }
        }
    }
    /**
     * Read a file and return its contents as a string
     */
    async readFile(filePath) {
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
    /**
     * Write content to a file
     */
    async writeFile(filePath, content) {
        // Ensure directory exists
        const dirPath = path.dirname(filePath);
        await this.ensureDirectory(dirPath);
        await fs.promises.writeFile(filePath, content, 'utf8');
    }
    /**
     * Create a file with specific content
     */
    async createFile(filePath, content) {
        await this.writeFile(filePath, content);
    }
    /**
     * Check if a file or directory exists
     */
    async exists(filePath) {
        try {
            await fs.promises.access(filePath);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Get file size in bytes
     */
    async getFileSize(filePath) {
        try {
            const stats = await fs.promises.stat(filePath);
            return stats.size;
        }
        catch (error) {
            throw new Error(`Unable to get file size for ${filePath}: ${error.message}`);
        }
    }
    /**
     * List files in a directory
     */
    async listFiles(dirPath) {
        try {
            const files = await fs.promises.readdir(dirPath);
            return files;
        }
        catch (error) {
            throw new Error(`Unable to list files in ${dirPath}: ${error.message}`);
        }
    }
    /**
     * Remove a file
     */
    async removeFile(filePath) {
        try {
            await fs.promises.unlink(filePath);
        }
        catch (error) {
            if (error.code !== 'ENOENT') {
                throw new Error(`Unable to remove file ${filePath}: ${error.message}`);
            }
            // File doesn't exist, that's fine
        }
    }
    /**
     * Remove a directory and its contents
     */
    async removeDirectory(dirPath) {
        try {
            await fs.promises.rm(dirPath, { recursive: true, force: true });
        }
        catch (error) {
            throw new Error(`Unable to remove directory ${dirPath}: ${error.message}`);
        }
    }
}
exports.FileSystemManager = FileSystemManager;
//# sourceMappingURL=file-system.js.map