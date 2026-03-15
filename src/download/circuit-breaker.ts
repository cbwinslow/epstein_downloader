import { Logger } from '../utils/logger';

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
  expectedErrors: string[];
}

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export interface CircuitBreakerMetrics {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: Date | null;
  lastSuccessTime: Date | null;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
}

export class CircuitBreaker {
  private logger: Logger;
  private config: CircuitBreakerConfig;
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime: Date | null = null;
  private lastSuccessTime: Date | null = null;
  private totalRequests: number = 0;
  private totalFailures: number = 0;
  private totalSuccesses: number = 0;
  private monitoringStartTime: Date = new Date();

  constructor(config?: Partial<CircuitBreakerConfig>) {
    this.logger = Logger.getInstance();
    this.config = {
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minute
      monitoringPeriod: 10000, // 10 seconds
      expectedErrors: ['ECONNRESET', 'ENETUNREACH', 'ETIMEDOUT', 'network timeout'],
      ...config
    };
  }

  /**
   * Execute an operation with circuit breaker protection
   */
  public async executeWithCircuitBreaker<T>(
    operation: () => Promise<T>,
    operationName: string = 'operation'
  ): Promise<T> {
    this.totalRequests++;
    this.logDebug(`Circuit breaker: ${operationName} - State: ${this.state}, Failures: ${this.failures}/${this.config.failureThreshold}`);

    // Check if circuit is open and should remain open
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptRecovery()) {
        this.state = CircuitState.HALF_OPEN;
        this.logger.info(`🔄 Circuit breaker: ${operationName} - Transitioning to HALF_OPEN for recovery attempt`);
      } else {
        const waitTime = this.getWaitTime();
        this.logger.warn(`🚫 Circuit breaker: ${operationName} - Circuit OPEN, rejecting request. Wait ${waitTime}ms before retry`);
        throw new Error(`Circuit breaker OPEN: ${operationName} - Service unavailable. Retry after ${waitTime}ms`);
      }
    }

    try {
      const result = await operation();
      this.recordSuccess(operationName);
      return result;
    } catch (error) {
      this.recordFailure(error as Error, operationName);
      throw error;
    }
  }

  /**
   * Record a successful operation
   */
  private recordSuccess(operationName: string): void {
    this.successes++;
    this.totalSuccesses++;
    this.lastSuccessTime = new Date();
    this.logDebug(`✅ Circuit breaker: ${operationName} - Success recorded (${this.successes} in current state)`);

    if (this.state === CircuitState.HALF_OPEN) {
      // Recovery successful, close the circuit
      this.state = CircuitState.CLOSED;
      this.failures = 0;
      this.successes = 0;
      this.logger.info(`✅ Circuit breaker: ${operationName} - Recovery successful, circuit CLOSED`);
    }
  }

  /**
   * Record a failed operation
   */
  private recordFailure(error: Error, operationName: string): void {
    this.failures++;
    this.totalFailures++;
    this.lastFailureTime = new Date();
    this.logDebug(`❌ Circuit breaker: ${operationName} - Failure recorded (${this.failures}/${this.config.failureThreshold})`);

    if (this.shouldTripCircuit(error)) {
      this.state = CircuitState.OPEN;
      this.logger.error(`🚨 Circuit breaker: ${operationName} - Circuit OPENED due to ${this.failures} failures`);
    }
  }

  /**
   * Check if circuit should trip based on failure count and error type
   */
  private shouldTripCircuit(error: Error): boolean {
    // Only trip on expected error types
    const isExpectedError = this.isExpectedError(error);
    if (!isExpectedError) {
      this.logger.debug(`Circuit breaker: ${error.message} - Not an expected error, not tripping circuit`);
      return false;
    }

    return this.failures >= this.config.failureThreshold;
  }

  /**
   * Check if error is in expected errors list
   */
  private isExpectedError(error: Error): boolean {
    const errorMessage = error.message.toLowerCase();
    return this.config.expectedErrors.some(expectedError => 
      errorMessage.includes(expectedError.toLowerCase())
    );
  }

  /**
   * Check if enough time has passed to attempt recovery
   */
  private shouldAttemptRecovery(): boolean {
    if (!this.lastFailureTime) return true;
    const timeSinceFailure = Date.now() - this.lastFailureTime.getTime();
    return timeSinceFailure >= this.config.recoveryTimeout;
  }

  /**
   * Get time to wait before next retry attempt
   */
  private getWaitTime(): number {
    if (!this.lastFailureTime) return 0;
    const timeSinceFailure = Date.now() - this.lastFailureTime.getTime();
    return Math.max(0, this.config.recoveryTimeout - timeSinceFailure);
  }

  /**
   * Get current circuit breaker metrics
   */
  public getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses
    };
  }

  /**
   * Get circuit breaker status summary
   */
  public getStatus(): string {
    const metrics = this.getMetrics();
    return `Circuit: ${metrics.state} | Failures: ${metrics.failures}/${this.config.failureThreshold} | Total: ${metrics.totalRequests} (${metrics.totalSuccesses}✓/${metrics.totalFailures}✗)`;
  }

  /**
   * Reset circuit breaker state (for testing or manual recovery)
   */
  public reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = null;
    this.lastSuccessTime = null;
    this.totalRequests = 0;
    this.totalFailures = 0;
    this.totalSuccesses = 0;
    this.monitoringStartTime = new Date();
    this.logger.info('🔄 Circuit breaker: Reset to initial state');
  }

  /**
   * Update circuit breaker configuration
   */
  public updateConfig(newConfig: Partial<CircuitBreakerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.info(`⚙️ Circuit breaker configuration updated: ${JSON.stringify(this.config)}`);
  }

  /**
   * Force circuit to open (for testing or emergency scenarios)
   */
  public forceOpen(): void {
    this.state = CircuitState.OPEN;
    this.lastFailureTime = new Date();
    this.logger.warn('🚨 Circuit breaker: Forced to OPEN state');
  }

  /**
   * Force circuit to close (for testing or manual recovery)
   */
  public forceClose(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.logger.info('✅ Circuit breaker: Forced to CLOSED state');
  }

  private logDebug(message: string): void {
    this.logger.debug(message);
  }
}

/**
 * Predefined circuit breaker configurations for common scenarios
 */
export class CircuitBreakerConfigs {
  /**
   * Conservative circuit breaker for critical services
   */
  public static conservative(): CircuitBreakerConfig {
    return {
      failureThreshold: 3,
      recoveryTimeout: 120000, // 2 minutes
      monitoringPeriod: 30000, // 30 seconds
      expectedErrors: ['ECONNRESET', 'ENETUNREACH', 'ETIMEDOUT', 'network timeout', 'service unavailable']
    };
  }

  /**
   * Aggressive circuit breaker for fast-recovering services
   */
  public static aggressive(): CircuitBreakerConfig {
    return {
      failureThreshold: 5,
      recoveryTimeout: 30000, // 30 seconds
      monitoringPeriod: 10000, // 10 seconds
      expectedErrors: ['ECONNRESET', 'ENETUNREACH', 'ETIMEDOUT', 'network timeout']
    };
  }

  /**
   * Network circuit breaker for network operations
   */
  public static network(): CircuitBreakerConfig {
    return {
      failureThreshold: 4,
      recoveryTimeout: 60000, // 1 minute
      monitoringPeriod: 15000, // 15 seconds
      expectedErrors: ['ECONNRESET', 'ENETUNREACH', 'ECONNREFUSED', 'ETIMEDOUT', 'network timeout', 'socket hang up']
    };
  }

  /**
   * Download circuit breaker for file downloads
   */
  public static download(): CircuitBreakerConfig {
    return {
      failureThreshold: 6,
      recoveryTimeout: 180000, // 3 minutes
      monitoringPeriod: 60000, // 1 minute
      expectedErrors: ['ECONNRESET', 'ENETUNREACH', 'ETIMEDOUT', 'network timeout', 'download failed', 'stream error']
    };
  }
}