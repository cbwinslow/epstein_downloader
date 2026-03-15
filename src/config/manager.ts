import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../utils/logger';

/**
 * Manages application configuration from multiple sources
 */
export class ConfigManager {
  private logger: Logger;
  private config: any = {};
  private envVars: NodeJS.ProcessEnv;

  constructor() {
    // Initialize logger lazily to avoid circular dependency
    this.logger = Logger.getInstance();
    // Give the logger access to this config manager instance
    this.logger.setConfigManager(this);
    this.envVars = process.env;
    this.loadConfiguration();
  }

  /**
   * Load configuration from various sources
   */
  private loadConfiguration(): void {
    // 1. Load default configuration
    this.loadDefaults();
    
    // 2. Load from config.json file if exists
    this.loadConfigFile();
    
    // 3. Load from .env file if exists (already loaded by Node.js if using dotenv)
    // 4. Environment variables override everything
    this.loadEnvironmentVariables();
  }

  /**
   * Load default configuration values
   */
  private loadDefaults(): void {
    this.config = {
      downloader: {
        maxThreads: 4,
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000,
        userAgent: 'EpsteinDownloader/1.0 (+https://github.com/yourusername/epstein-downloader)',
        respectRobotsTxt: true,
        rateLimit: {
          requestsPerSecond: 2,
          burstLimit: 5
        }
      },
      storage: {
        downloadDirectory: './downloads',
        logDirectory: './logs',
        stateFile: './download-state.json',
        maxDiskUsage: 0.9
      },
      validation: {
        checkConnectionInterval: 60000,
        cookieValidationEnabled: true,
        serverHealthCheckEnabled: true,
        diskSpaceCheckEnabled: true
      },
      logging: {
        level: 'info',
        format: 'json',
        maxSize: '10m',
        maxFiles: 5
      },
      aiAgent: {
        enabled: true,
        model: 'openrouter/auto',
        temperature: 0.1,
        maxTokens: 1000
      }
    };
  }

  /**
   * Load configuration from JSON file
   */
  private loadConfigFile(): void {
    const configPath = path.resolve('./config/config.json');
    if (fs.existsSync(configPath)) {
      try {
        const configData = fs.readFileSync(configPath, 'utf8');
        const fileConfig = JSON.parse(configData);
        this.mergeConfig(this.config, fileConfig);
        this.logger.info('Loaded configuration from config.json');
      } catch (error) {
        this.logger.error('Error loading config.json:', error as Error);
      }
    }
    
    // Also check for example file as fallback (but don't override if real config exists)
    const examplePath = path.resolve('./config/config.json.example');
    if (fs.existsSync(examplePath) && !fs.existsSync(configPath)) {
      try {
        const exampleData = fs.readFileSync(examplePath, 'utf8');
        const exampleConfig = JSON.parse(exampleData);
        // Only load if no real config exists
        if (Object.keys(this.config).length === 0) {
          this.mergeConfig(this.config, exampleConfig);
          this.logger.info('Loaded configuration from config.json.example');
        }
      } catch (error) {
        this.logger.error('Error loading config.json.example:', error as Error);
      }
    }
  }

  /**
   * Load configuration from environment variables
   */
  private loadEnvironmentVariables(): void {
    // Map environment variables to config paths
    const envMap: { [key: string]: string } = {
      'DOJ_COOKIES': 'DOJ_COOKIES',
      'MAX_THREADS': 'downloader.maxThreads',
      'TIMEOUT': 'downloader.timeout',
      'RETRY_ATTEMPTS': 'downloader.retryAttempts',
      'RETRY_DELAY': 'downloader.retryDelay',
      'USER_AGENT': 'downloader.userAgent',
      'DOWNLOAD_DIRECTORY': 'storage.downloadDirectory',
      'LOG_DIRECTORY': 'storage.logDirectory',
      'STATE_FILE': 'storage.stateFile',
      'MAX_DISK_USAGE': 'storage.maxDiskUsage',
      'CHECK_CONNECTION_INTERVAL': 'validation.checkConnectionInterval',
      'COOKIE_VALIDATION_ENABLED': 'validation.cookieValidationEnabled',
      'SERVER_HEALTH_CHECK_ENABLED': 'validation.serverHealthCheckEnabled',
      'DISK_SPACE_CHECK_ENABLED': 'validation.diskSpaceCheckEnabled',
      'LOG_LEVEL': 'logging.level',
      'LOG_FORMAT': 'logging.format',
      'LOG_MAX_SIZE': 'logging.maxSize',
      'LOG_MAX_FILES': 'logging.maxFiles',
      'AI_AGENT_ENABLED': 'aiAgent.enabled',
      'AI_AGENT_MODEL': 'aiAgent.model',
      'AI_AGENT_TEMPERATURE': 'aiAgent.temperature',
      'AI_AGENT_MAX_TOKENS': 'aiAgent.maxTokens'
    };

    for (const [envVar, configPath] of Object.entries(envMap)) {
      const value = this.envVars[envVar];
      if (value !== undefined) {
        this.setValueByPath(this.config, configPath, this.parseEnvValue(value));
      }
    }
  }

  /**
   * Parse environment variable value to appropriate type
   */
  private parseEnvValue(value: string): any {
    // Try to parse as number
    if (!isNaN(Number(value)) && value.trim() !== '') {
      return Number(value);
    }
    
    // Try to parse as boolean
    if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
      return value.toLowerCase() === 'true';
    }
    
    // Try to parse as JSON
    try {
      return JSON.parse(value);
    } catch (e) {
      // Return as string if not JSON
      return value;
    }
  }

  /**
   * Merge two configuration objects
   */
  private mergeConfig(target: any, source: any): void {
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (typeof source[key] === 'object' && source[key] !== null && 
            typeof target[key] === 'object' && target[key] !== null) {
          this.mergeConfig(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      }
    }
  }

  /**
   * Set a value in the config object using a dot-notation path
   */
  private setValueByPath(obj: any, path: string, value: any): void {
    const parts = path.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part];
    }
    
    current[parts[parts.length - 1]] = value;
  }

  /**
   * Get a configuration value by dot-notation path
   */
  public get<T>(path: string, defaultValue?: T): T {
    const parts = path.split('.');
    let current: any = this.config;
    
    for (const part of parts) {
      if (current === null || current === undefined || !(part in current)) {
        return defaultValue as T;
      }
      current = current[part];
    }
    
    return current as T;
  }

  /**
   * Get a string configuration value
   */
  public getString(path: string, defaultValue?: string): string {
    return this.get<string>(path, defaultValue);
  }

  /**
   * Get a number configuration value
   */
  public getNumber(path: string, defaultValue?: number): number {
    return this.get<number>(path, defaultValue);
  }

  /**
   * Get a boolean configuration value
   */
  public getBoolean(path: string, defaultValue?: boolean): boolean {
    return this.get<boolean>(path, defaultValue);
  }

  /**
   * Validate the configuration
   */
  public async validate(): Promise<void> {
    this.logger.info('Validating configuration...');
    
    // Validate required fields
    const requiredFields = [
      'DOJ_COOKIES'
    ];
    
    for (const field of requiredFields) {
      const value = this.getString(field);
      if (!value || value.trim() === '') {
        throw new Error(`Required configuration field '${field}' is missing or empty`);
      }
    }
    
    // Validate numeric ranges
    const maxThreads = this.getNumber('downloader.maxThreads');
    if (maxThreads < 1 || maxThreads > 20) {
      throw new Error('downloader.maxThreads must be between 1 and 20');
    }
    
    const timeout = this.getNumber('downloader.timeout');
    if (timeout < 1000) {
      throw new Error('downloader.timeout must be at least 1000 ms');
    }
    
    const maxDiskUsage = this.getNumber('storage.maxDiskUsage');
    if (maxDiskUsage <= 0 || maxDiskUsage > 1) {
      throw new Error('storage.maxDiskUsage must be between 0 and 1');
    }
    
    this.logger.info('Configuration validation successful');
  }
}