const { CircuitBreaker, CircuitBreakerConfigs } = require('./dist/download/circuit-breaker');

async function testCircuitBreaker() {
  console.log('🛡️ Testing CircuitBreaker...\n');
  
  // Test 1: Basic circuit breaker functionality
  console.log('🧪 Test 1: Basic circuit breaker functionality');
  let failureCount = 0;
  const failingOperation = async () => {
    failureCount++;
    if (failureCount <= 3) {
      throw new Error('ECONNRESET: Connection reset by peer');
    }
    return 'Success!';
  };
  
  const circuitBreaker = new CircuitBreaker({ failureThreshold: 3, recoveryTimeout: 2000 });
  
  try {
    // First few calls should fail but not trip the circuit immediately
    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.executeWithCircuitBreaker(failingOperation, 'test-operation');
      } catch (error) {
        console.log(`Attempt ${i + 1}: ${error.message}`);
      }
    }
    
    // This should trip the circuit
    try {
      await circuitBreaker.executeWithCircuitBreaker(failingOperation, 'test-operation');
      console.log('❌ Circuit should have opened by now');
    } catch (error) {
      console.log(`✅ Circuit opened: ${error.message}`);
    }
    
    // Wait for recovery timeout and try again
    console.log('⏳ Waiting for recovery timeout...');
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    const result = await circuitBreaker.executeWithCircuitBreaker(failingOperation, 'test-operation');
    console.log(`✅ Recovery successful: ${result}`);
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
  }
  console.log();
  
  // Test 2: Predefined configurations
  console.log('🎯 Test 2: Predefined configurations');
  const configs = [
    { name: 'Conservative', config: CircuitBreakerConfigs.conservative() },
    { name: 'Aggressive', config: CircuitBreakerConfigs.aggressive() },
    { name: 'Network', config: CircuitBreakerConfigs.network() },
    { name: 'Download', config: CircuitBreakerConfigs.download() }
  ];
  
  for (const { name, config } of configs) {
    console.log(`✅ ${name}: threshold=${config.failureThreshold}, timeout=${config.recoveryTimeout}ms`);
  }
  console.log();
  
  // Test 3: Circuit breaker metrics
  console.log('📊 Test 3: Circuit breaker metrics');
  const metricsBreaker = new CircuitBreaker({ failureThreshold: 2 });
  
  // Simulate some operations
  try {
    await metricsBreaker.executeWithCircuitBreaker(async () => 'success', 'test');
  } catch (error) {
    // Ignore
  }
  
  try {
    await metricsBreaker.executeWithCircuitBreaker(async () => { throw new Error('failure'); }, 'test');
  } catch (error) {
    // Ignore
  }
  
  const metrics = metricsBreaker.getMetrics();
  console.log(`✅ State: ${metrics.state}`);
  console.log(`✅ Failures: ${metrics.failures}`);
  console.log(`✅ Successes: ${metrics.successes}`);
  console.log(`✅ Total requests: ${metrics.totalRequests}`);
  console.log();
  
  // Test 4: Status reporting
  console.log('📈 Test 4: Status reporting');
  const statusBreaker = new CircuitBreaker({ failureThreshold: 3 });
  console.log(`Initial status: ${statusBreaker.getStatus()}`);
  
  // Simulate some failures
  for (let i = 0; i < 2; i++) {
    try {
      await statusBreaker.executeWithCircuitBreaker(async () => { throw new Error('test failure'); }, 'test');
    } catch (error) {
      // Ignore
    }
  }
  console.log(`After 2 failures: ${statusBreaker.getStatus()}`);
  console.log();
  
  // Test 5: Manual control
  console.log('⚙️ Test 5: Manual control');
  const manualBreaker = new CircuitBreaker();
  console.log(`Before force open: ${manualBreaker.getStatus()}`);
  
  manualBreaker.forceOpen();
  console.log(`After force open: ${manualBreaker.getStatus()}`);
  
  manualBreaker.reset();
  console.log(`After reset: ${manualBreaker.getStatus()}`);
  console.log();
  
  console.log('🎉 CircuitBreaker tests completed successfully!');
}

// Run the test
testCircuitBreaker().catch(console.error);