/**
 * AI Agent for validation and monitoring tasks
 *
 * NOTE: This is currently a placeholder implementation that simulates AI responses.
 * In a production implementation, this would interface with an actual AI service
 * (such as OpenRouter) to perform intelligent validation and analysis.
 *
 * To complete the implementation, replace the simulated responses with actual
 * API calls to your chosen AI service provider.
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
