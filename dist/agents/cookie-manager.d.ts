/**
 * Manages and validates cookies for DOJ website authentication
 */
export declare class CookieManager {
    private logger;
    private configManager;
    private aiAgent;
    constructor();
    /**
     * Validate cookies for DOJ website access
     */
    validate(): Promise<boolean>;
    /**
     * Check if cookie string has valid format
     */
    private isValidCookieFormat;
    /**
     * Get cookies for use in HTTP requests
     */
    getCookies(): string;
}
