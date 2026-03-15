const { RetryStrategy, RetryStrategies } = require('./dist/download/retry-strategy');

async function testRetryStrategy() {
  console.log('🔄 Testing RetryStrategy...\n');
  
  // Test 1: Basic retry functionality
  console.log('🧪 Test 1: Basic retry functionality');
  let attemptCount = 0;
  const failingOperation = async () => {
    attemptCount++;
    if (attemptCount < 3) {
      throw new Error('Simulated network error');
    }
    return 'Success!';
  };
  
  const retryStrategy = new RetryStrategy({ maxRetries: 3, baseDelay: 100 });
  try {
    const result = await retryStrategy.executeWithRetry(failingOperation, 'test-operation');
    console.log(`✅ Operation succeeded after ${attemptCount} attempts: ${result}`);
  } catch (error) {
    console.log(`❌ Operation failed: ${error.message}`);
  }
  console.log();
  
  // Test 2: Predefined strategies
  console.log('🎯 Test 2: Predefined strategies');
  const strategies = [
    { name: 'Conservative', strategy: RetryStrategies.conservative() },
    { name: 'Aggressive', strategy: RetryStrategies.aggressive() },
    { name: 'Network', strategy: RetryStrategies.network() },
    { name: 'Download', strategy: RetryStrategies.download() }
  ];
  
  for (const { name, strategy } of strategies) {
    const config = strategy.getConfig();
    console.log(`✅ ${name} strategy: maxRetries=${config.maxRetries}, baseDelay=${config.baseDelay}ms, maxDelay=${config.maxDelay}ms`);
  }
  console.log();
  
  // Test 3: Error retryability
  console.log('⚠️ Test 3: Error retryability');
  const retryStrategy2 = new RetryStrategy();
  const testErrors = [
    new Error('ECONNRESET: Connection reset by peer'),
    new Error('ENETUNREACH: Network is unreachable'),
    new Error('ETIMEDOUT: Connection timed out'),
    new Error('404 Not Found'),
    new Error('Invalid file format')
  ];
  
  for (const error of testErrors) {
    const shouldRetry = retryStrategy2['shouldRetry'](error); // Access private method for testing
    console.log(`${error.message}: ${shouldRetry ? '✅ Retryable' : '❌ Not retryable'}`);
  }
  console.log();
  
  // Test 4: Delay calculation
  console.log('⏱️ Test 4: Delay calculation');
  const delayStrategy = new RetryStrategy({
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    jitter: false // Disable jitter for predictable results
  });
  
  for (let attempt = 1; attempt <= 5; attempt++) {
    const delay = delayStrategy['calculateDelay'](attempt);
    console.log(`Attempt ${attempt}: ${delay}ms delay`);
  }
  console.log();
  
  // Test 5: Configuration updates
  console.log('⚙️ Test 5: Configuration updates');
  const configStrategy = new RetryStrategy();
  console.log('Initial config:', configStrategy.getConfig());
  
  configStrategy.updateConfig({ maxRetries: 10, baseDelay: 2000 });
  console.log('Updated config:', configStrategy.getConfig());
  console.log();
  
  console.log('🎉 RetryStrategy tests completed successfully!');
}

// Run the test
testRetryStrategy().catch(console.error);