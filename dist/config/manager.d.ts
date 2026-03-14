/**
 * Manages application configuration from multiple sources
 */
export declare class ConfigManager {
    private logger;
    private config;
    private envVars;
    constructor();
    /**
     * Load configuration from various sources
     */
    private loadConfiguration;
    /**
     * Load default configuration values
     */
    private loadDefaults;
    /**
     * Load configuration from JSON file
     */
    private loadConfigFile;
    /**
     * Load configuration from environment variables
     */
    private loadEnvironmentVariables;
    /**
     * Parse environment variable value to appropriate type
     */
    private parseEnvValue;
    /**
     * Merge two configuration objects
     */
    private mergeConfig;
    /**
     * Set a value in the config object using a dot-notation path
     */
    private setValueByPath;
    /**
     * Get a configuration value by dot-notation path
     */
    get<T>(path: string, defaultValue?: T): T;
    /**
     * Get a string configuration value
     */
    getString(path: string, defaultValue?: string): string;
    /**
     * Get a number configuration value
     */
    getNumber(path: string, defaultValue?: number): number;
    /**
     * Get a boolean configuration value
     */
    getBoolean(path: string, defaultValue?: boolean): boolean;
    /**
     * Validate the configuration
     */
    validate(): Promise<void>;
}
