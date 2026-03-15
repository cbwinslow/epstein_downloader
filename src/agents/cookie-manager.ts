import { Logger } from '../utils/logger';
import { ConfigManager } from '../config/manager';
import { AIAgent } from './ai-agent';

/**
 * Manages and validates cookies for DOJ website authentication
 */
export class CookieManager {
  private logger: Logger;
  private configManager: ConfigManager;
  private aiAgent: AIAgent;

  constructor() {
    this.logger = Logger.getInstance();
    this.configManager = new ConfigManager();
    this.aiAgent = new AIAgent();
  }

  /**
   * Validate cookies for DOJ website access
   */
  public async validate(): Promise<boolean> {
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
    } catch (error) {
      this.logger.error('Error during cookie validation:', error as Error);
      return false;
    }
  }

  /**
   * Check if cookie string has valid format
   */
  private isValidCookieFormat(cookies: string): boolean {
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
  public getCookies(): string {
    return this.configManager.getString('DOJ_COOKIES', process.env.DOJ_COOKIES || '');
  }
}