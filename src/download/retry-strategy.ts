import { Logger } from '../utils/logger';

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
  retryableErrors: string[];
}

export interface RetryContext {
  attempt: number;
  totalAttempts: number;
  delay: number;
  error: Error | null;
  operation: string;
}

export class RetryStrategy {
  private logger: Logger;
  private config: RetryConfig;

  constructor(config?: Partial<RetryConfig>) {
    this.logger = Logger.getInstance();
    this.config = {
      maxRetries: 3,
      baseDelay: 1000, // 1 second
      maxDelay: 30000, // 30 seconds
      backoffMultiplier: 2,
      jitter: true,
      retryableErrors: [
        'ECONNRESET',
        'ENETUNREACH', 
        'ECONNREFUSED',
        'ETIMEDOUT',
        'network timeout',
        'socket hang up',
        'request failed'
      ],
      ...config
    };
  }

  /**
   * Execute an operation with retry logic
   */
  public async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string = 'operation'
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.maxRetries + 1; attempt++) {
      try {
        const context: RetryContext = {
          attempt,
          totalAttempts: this.config.maxRetries + 1,
          delay: this.calculateDelay(attempt),
          error: null,
          operation: operationName
        };

        this.logger.debug(`Executing ${operationName} (attempt ${attempt}/${context.totalAttempts})`);
        
        const result = await operation();
        if (attempt > 1) {
          this.logger.info(`✅ ${operationName} succeeded after ${attempt - 1} retries`);
        }
        return result;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Check if we should retry
        if (attempt <= this.config.maxRetries && this.shouldRetry(lastError)) {
          const delay = this.calculateDelay(attempt);
          this.logger.warn(`⚠️ ${operationName} failed (attempt ${attempt}), retrying in ${delay}ms: ${lastError.message}`);
          
          await this.sleep(delay);
          continue;
        } else {
          // Final attempt failed or not retryable
          this.logger.error(`❌ ${operationName} failed permanently after ${attempt} attempts: ${lastError.message}`);
          throw lastError;
        }
      }
    }

    // This should never be reached, but TypeScript needs it
    throw lastError || new Error(`${operationName} failed`);
  }

  /**
   * Check if error is retryable
   */
  private shouldRetry(error: Error): boolean {
    const errorMessage = error.message.toLowerCase();
    const errorName = error.name.toLowerCase();
    
    // Check against retryable error patterns
    for (const retryableError of this.config.retryableErrors) {
      if (errorMessage.includes(retryableError.toLowerCase()) || 
          errorName.includes(retryableError.toLowerCase())) {
        return true;
      }
    }

    // Check for HTTP status codes in error messages
    const httpStatusMatch = errorMessage.match(/status\s*(\d+)/i);
    if (httpStatusMatch) {
      const statusCode = parseInt(httpStatusMatch[1], 10);
      // Retry on 5xx server errors and some 4xx client errors
      if (statusCode >= 500 || statusCode === 408 || statusCode === 429) {
        return true;
      }
    }

    return false;
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private calculateDelay(attempt: number): number {
    // Exponential backoff: baseDelay * (backoffMultiplier ^ (attempt - 1))
    let delay = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt - 1);
    
    // Cap at max delay
    delay = Math.min(delay, this.config.maxDelay);
    
    // Add jitter to prevent thundering herd
    if (this.config.jitter) {
      const jitterRange = delay * 0.1; // 10% jitter
      delay += Math.random() * jitterRange - (jitterRange / 2);
    }
    
    return Math.floor(delay);
  }

  /**
   * Sleep utility function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update retry configuration
   */
  public updateConfig(newConfig: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.info(`Retry strategy configuration updated: ${JSON.stringify(this.config)}`);
  }

  /**
   * Get current configuration
   */
  public getConfig(): RetryConfig {
    return { ...this.config };
  }
}

/**
 * Predefined retry strategies for common scenarios
 */
export class RetryStrategies {
  /**
   * Conservative retry strategy for critical operations
   */
  public static conservative(): RetryStrategy {
    return new RetryStrategy({
      maxRetries: 5,
      baseDelay: 2000,
      maxDelay: 60000,
      backoffMultiplier: 1.5,
      jitter: true
    });
  }

  /**
   * Aggressive retry strategy for fast operations
   */
  public static aggressive(): RetryStrategy {
    return new RetryStrategy({
      maxRetries: 3,
      baseDelay: 500,
      maxDelay: 10000,
      backoffMultiplier: 2.5,
      jitter: true
    });
  }

  /**
   * Network retry strategy for network operations
   */
  public static network(): RetryStrategy {
    return new RetryStrategy({
      maxRetries: 4,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      jitter: true,
      retryableErrors: [
        'ECONNRESET', 'ENETUNREACH', 'ECONNREFUSED', 'ETIMEDOUT',
        'network timeout', 'socket hang up', 'request failed',
        'getaddrinfo', 'ENOTFOUND'
      ]
    });
  }

  /**
   * Download retry strategy optimized for file downloads
   */
  public static download(): RetryStrategy {
    return new RetryStrategy({
      maxRetries: 6,
      baseDelay: 1500,
      maxDelay: 120000, // 2 minutes
      backoffMultiplier: 1.8,
      jitter: true,
      retryableErrors: [
        'ECONNRESET', 'ENETUNREACH', 'ECONNREFUSED', 'ETIMEDOUT',
        'network timeout', 'socket hang up', 'request failed',
        'download failed', 'stream error', 'connection lost'
      ]
    });
  }
}