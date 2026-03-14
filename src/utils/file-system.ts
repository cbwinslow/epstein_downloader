import * as fs from 'fs';
import * as path from 'path';

/**
 * File system utility functions
 */
export class FileSystemManager {
  /**
   * Ensure that directories exist, creating them if necessary
   */
  public async ensureDirectories(dirPaths: string[]): Promise<void> {
    for (const dirPath of dirPaths) {
      await this.ensureDirectory(dirPath);
    }
  }

  /**
   * Ensure that a directory exists, creating it if necessary
   */
  public async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.promises.mkdir(dirPath, { recursive: true });
    } catch (error) {
      // If directory already exists, that's fine
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Read a file and return its contents as a string
   */
  public async readFile(filePath: string): Promise<string | null> {
    try {
      const data = await fs.promises.readFile(filePath, 'utf8');
      return data;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null; // File doesn't exist
      }
      throw error;
    }
  }

  /**
   * Write content to a file
   */
  public async writeFile(filePath: string, content: string): Promise<void> {
    // Ensure directory exists
    const dirPath = path.dirname(filePath);
    await this.ensureDirectory(dirPath);
    
    await fs.promises.writeFile(filePath, content, 'utf8');
  }

  /**
   * Create a file with specific content
   */
  public async createFile(filePath: string, content: string): Promise<void> {
    await this.writeFile(filePath, content);
  }

  /**
   * Check if a file or directory exists
   */
  public async exists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file size in bytes
   */
  public async getFileSize(filePath: string): Promise<number> {
    try {
      const stats = await fs.promises.stat(filePath);
      return stats.size;
    } catch (error) {
      throw new Error(`Unable to get file size for ${filePath}: ${(error as Error).message}`);
    }
  }

  /**
   * List files in a directory
   */
  public async listFiles(dirPath: string): Promise<string[]> {
    try {
      const files = await fs.promises.readdir(dirPath);
      return files;
    } catch (error) {
      throw new Error(`Unable to list files in ${dirPath}: ${(error as Error).message}`);
    }
  }

  /**
   * Remove a file
   */
  public async removeFile(filePath: string): Promise<void> {
    try {
      await fs.promises.unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw new Error(`Unable to remove file ${filePath}: ${(error as Error).message}`);
      }
      // File doesn't exist, that's fine
    }
  }

  /**
   * Remove a directory and its contents
   */
  public async removeDirectory(dirPath: string): Promise<void> {
    try {
      await fs.promises.rm(dirPath, { recursive: true, force: true });
    } catch (error) {
      throw new Error(`Unable to remove directory ${dirPath}: ${(error as Error).message}`);
    }
  }
}