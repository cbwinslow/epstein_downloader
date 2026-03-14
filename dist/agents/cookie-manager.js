"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CookieManager = void 0;
const logger_1 = require("@utils/logger");
const manager_1 = require("@config/manager");
const ai_agent_1 = require("./ai-agent");
/**
 * Manages and validates cookies for DOJ website authentication
 */
class CookieManager {
    constructor() {
        this.logger = logger_1.Logger.getInstance();
        this.configManager = new manager_1.ConfigManager();
        this.aiAgent = new ai_agent_1.AIAgent();
    }
    /**
     * Validate cookies for DOJ website access
     */
    async validate() {
        this.logger.info('Validating cookies for DOJ website...');
        try {
            // Get cookies from environment or config
            const cookies = this.configManager.getString('DOJ_COOKIES', process.env.DOJ_COOKIES || '');
            if (!cookies || cookies.trim() === '') {
                this.logger.error('No cookies provided for DOJ website authentication');
                return false;
            }
            // Basic cookie format validation
            if (!this.isValidCookieFormat(cookies)) {
                this.logger.error('Invalid cookie format');
                return false;
            }
            // Use AI agent for additional validation if enabled
            if (this.configManager.getBoolean('aiAgent.enabled', true)) {
                const aiValidation = await this.aiAgent.validateCookies(cookies);
                if (!aiValidation) {
                    this.logger.warn('AI agent cookie validation failed');
                    return false;
                }
            }
            this.logger.info('Cookie validation successful');
            return true;
        }
        catch (error) {
            this.logger.error('Error during cookie validation:', error);
            return false;
        }
    }
    /**
     * Check if cookie string has valid format
     */
    isValidCookieFormat(cookies) {
        // Simple validation - cookies should be in format "name=value; name2=value2"
        const cookiePairs = cookies.split(';');
        return cookiePairs.some(pair => {
            const trimmed = pair.trim();
            return trimmed.includes('=') && trimmed.split('=')[0].length > 0;
        });
    }
    /**
     * Get cookies for use in HTTP requests
     */
    getCookies() {
        return this.configManager.getString('DOJ_COOKIES', process.env.DOJ_COOKIES || '');
    }
}
exports.CookieManager = CookieManager;
//# sourceMappingURL=cookie-manager.js.map