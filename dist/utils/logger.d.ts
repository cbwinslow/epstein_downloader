/**
 * Singleton logger instance for the application
 */
export declare class Logger {
    private static instance;
    private logger;
    private configManager;
    private constructor();
    /**
     * Get the singleton logger instance
     */
    static getInstance(): Logger;
    /**
     * Create and configure the winston logger
     */
    private createLogger;
    /**
     * Parse size string (e.g., "10m") to bytes
     */
    private parseSize;
    /**
     * Log an info message
     */
    info(message: string, ...meta: any[]): void;
    /**
     * Log a warning message
     */
    warn(message: string, ...meta: any[]): void;
    /**
     * Log an error message
     */
    error(message: string, ...meta: any[]): void;
    /**
     * Log a debug message
     */
    debug(message: string, ...meta: any[]): void;
}
