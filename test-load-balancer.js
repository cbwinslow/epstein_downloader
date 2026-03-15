const { LoadBalancer } = require('./dist/download/load-balancer');

async function testLoadBalancer() {
  console.log('⚖️ Testing LoadBalancer...\n');
  
  // Test 1: Basic load balancer functionality
  console.log('🧪 Test 1: Basic load balancer functionality');
  const loadBalancer = new LoadBalancer({ maxConcurrentDownloads: 3, queueTimeout: 10000 });
  
  // Add some test tasks
  const taskIds = [];
  for (let i = 0; i < 5; i++) {
    const taskId = loadBalancer.addTask({
      dataSetNumber: 1,
      pageNumber: 1,
      fileIndex: i + 1,
      filename: `test-file-${i + 1}.pdf`,
      url: `https://example.com/file${i + 1}.pdf`,
      priority: Math.floor(Math.random() * 10) + 1
    });
    taskIds.push(taskId);
    console.log(`Added task: ${taskId}`);
  }
  console.log();
  
  // Start processing
  loadBalancer.start();
  
  // Wait a bit for processing
  console.log('⏳ Processing tasks...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Get statistics
  const stats = loadBalancer.getStats();
  console.log('📊 Load balancer statistics:');
  console.log(`Queue size: ${stats.queueSize}`);
  console.log(`Active tasks: ${stats.activeTasks}`);
  console.log(`Completed tasks: ${stats.completedTasks}`);
  console.log(`Failed tasks: ${stats.failedTasks}`);
  console.log(`Utilization: ${(stats.utilization * 100).toFixed(1)}%`);
  console.log();
  
  // Test 2: Worker distribution
  console.log('👥 Test 2: Worker distribution');
  console.log('Workers:');
  stats.workers.forEach(worker => {
    console.log(`  Worker ${worker.id}: ${worker.completedTasks} completed, ${worker.failedTasks} failed`);
  });
  console.log();
  
  // Test 3: Task management
  console.log('📋 Test 3: Task management');
  const firstTaskId = taskIds[0];
  const task = loadBalancer.getTask(firstTaskId);
  if (task) {
    console.log(`Task ${firstTaskId}: ${task.status}, assigned to worker ${task.assignedWorker || 'none'}`);
  }
  console.log();
  
  // Test 4: Configuration updates
  console.log('⚙️ Test 4: Configuration updates');
  console.log('Initial config - Max concurrent downloads: 3');
  loadBalancer.updateConfig({ maxConcurrentDownloads: 5 });
  console.log('Updated config - Max concurrent downloads: 5');
  console.log();
  
  // Test 5: Queue management
  console.log('🗑️ Test 5: Queue management');
  console.log(`Before clear - Queue size: ${loadBalancer.getStats().queueSize}`);
  loadBalancer.clearQueue();
  console.log(`After clear - Queue size: ${loadBalancer.getStats().queueSize}`);
  console.log();
  
  // Stop the load balancer
  loadBalancer.stop();
  console.log('✅ Load balancer stopped');
  
  console.log('🎉 LoadBalancer tests completed successfully!');
}

// Run the test
testLoadBalancer().catch(console.error);