/**
 * Validates connection to the DOJ website
 */
export declare class ConnectionValidator {
    private logger;
    private configManager;
    private aiAgent;
    constructor();
    /**
     * Validate connection to the DOJ website
     */
    validate(): Promise<boolean>;
}
