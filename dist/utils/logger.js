"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const winston_1 = require("winston");
const manager_1 = require("../config/manager");
/**
 * Singleton logger instance for the application
 */
class Logger {
    constructor() {
        this.configManager = new manager_1.ConfigManager();
        this.logger = this.createLogger();
    }
    /**
     * Get the singleton logger instance
     */
    static getInstance() {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }
    /**
     * Create and configure the winston logger
     */
    createLogger() {
        const logLevel = this.configManager.getString('logging.level', 'info');
        const logFormat = this.configManager.getString('logging.format', 'json');
        const maxSize = this.configManager.getString('logging.maxSize', '10m');
        const maxFiles = this.configManager.getNumber('logging.maxFiles', 5);
        const formatOptions = logFormat === 'json'
            ? winston_1.format.json()
            : winston_1.format.combine(winston_1.format.colorize(), winston_1.format.simple());
        return (0, winston_1.createLogger)({
            level: logLevel,
            format: formatOptions,
            transports: [
                new winston_1.transports.Console(),
                new winston_1.transports.File({
                    filename: './logs/error.log',
                    level: 'error',
                    maxsize: this.parseSize(maxSize),
                    maxFiles: maxFiles
                }),
                new winston_1.transports.File({
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
    parseSize(sizeStr) {
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
    info(message, ...meta) {
        this.logger.info(message, ...meta);
    }
    /**
     * Log a warning message
     */
    warn(message, ...meta) {
        this.logger.warn(message, ...meta);
    }
    /**
     * Log an error message
     */
    error(message, ...meta) {
        this.logger.error(message, ...meta);
    }
    /**
     * Log a debug message
     */
    debug(message, ...meta) {
        this.logger.debug(message, ...meta);
    }
}
exports.Logger = Logger;
//# sourceMappingURL=logger.js.map