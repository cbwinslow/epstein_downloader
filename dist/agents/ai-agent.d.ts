/**
 * AI Agent for validation and monitoring tasks
 * In a real implementation, this would interface with OpenRouter or similar AI service
 */
export declare class AIAgent {
    private logger;
    private configManager;
    private enabled;
    constructor();
    /**
     * Validate connection using AI agent
     */
    validateConnection(): Promise<boolean>;
    /**
     * Validate cookies using AI agent
     */
    validateCookies(cookies: string): Promise<boolean>;
    /**
     * Analyze download progress using AI agent
     */
    analyzeDownloadProgress(logs: string[]): Promise<any>;
    /**
     * Validate remote server connection using AI agent
     */
    validateServerConnection(serverUrl: string): Promise<boolean>;
    /**
     * Validate disk space using AI agent
     */
    validateDiskSpace(path: string, requiredSpace: number): Promise<boolean>;
}
