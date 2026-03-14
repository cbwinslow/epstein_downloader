import { createLogger, format, transports } from 'winston';
import { ConfigManager } from '@config/manager';

/**
 * Singleton logger instance for the application
 */
export class Logger {
   private static instance: Logger;
   private logger: any;
   private configManager: ConfigManager | null = null;

   private constructor() {
     this.logger = this.createLogger();
   }

    /**
     * Set the ConfigManager instance to avoid circular dependency during initialization
     */
    public setConfigManager(configManager: ConfigManager): void {
      this.configManager = configManager;
      // Recreate logger with actual configuration values
      this.logger = this.createLogger();
    }

  /**
   * Get the singleton logger instance
   */
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Create and configure the winston logger
   */
  private createLogger(): any {
    // Use default values if configManager is not available to avoid circular dependency
    let logLevel = 'info';
    let logFormat = 'json';
    let maxSize = '10m';
    let maxFiles = 5;
    
    // Try to get config values if configManager is available
    if (this.configManager) {
      logLevel = this.configManager.getString('logging.level', 'info');
      logFormat = this.configManager.getString('logging.format', 'json');
      maxSize = this.configManager.getString('logging.maxSize', '10m');
      maxFiles = this.configManager.getNumber('logging.maxFiles', 5);
    }

    const formatOptions = logFormat === 'json' 
      ? format.json() 
      : format.combine(
          format.colorize(),
          format.simple()
        );

    return createLogger({
      level: logLevel,
      format: formatOptions,
      transports: [
        new transports.Console(),
        new transports.File({ 
          filename: './logs/error.log', 
          level: 'error',
          maxsize: this.parseSize(maxSize),
          maxFiles: maxFiles
        }),
        new transports.File({ 
          filename: './logs/combined.log',
          maxsize: this.parseSize(maxSize),
          maxFiles: maxFiles
        })
      ]
    });
  }

  /**
   * Parse size string (e.g., "10m") to bytes
   */
  private parseSize(sizeStr: string): number {
    const match = sizeStr.match(/^(\d+)(kb|mb|gb)$/i);
    if (!match) {
      return parseInt(sizeStr, 10); // Assume bytes if no unit
    }
    
    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    
    switch (unit) {
      case 'kb': return value * 1024;
      case 'mb': return value * 1024 * 1024;
      case 'gb': return value * 1024 * 1024 * 1024;
      default: return value;
    }
  }

  /**
   * Log an info message
   */
  public info(message: string, ...meta: any[]): void {
    this.logger.info(message, ...meta);
  }

  /**
   * Log a warning message
   */
  public warn(message: string, ...meta: any[]): void {
    this.logger.warn(message, ...meta);
  }

  /**
   * Log an error message
   */
  public error(message: string, ...meta: any[]): void {
    this.logger.error(message, ...meta);
  }

  /**
   * Log a debug message
   */
  public debug(message: string, ...meta: any[]): void {
    this.logger.debug(message, ...meta);
  }
}