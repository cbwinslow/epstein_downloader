// Simple test script to verify the JusticeDepartmentDownloader works
const { JusticeDepartmentDownloader } = require('./dist/services/justice-department-downloader.js');

async function testJusticeDownloader() {
  console.log('Testing Justice Department Downloader...');
  
  const downloader = new JusticeDepartmentDownloader();
  
  try {
    // Initialize
    await downloader.initialize();
    console.log('✓ Justice Department downloader initialized');
    
    // Test getting status
    const status = downloader.getStatus();
    console.log('✓ Status:', status);
    
    // Test getting stats
    const stats = await downloader.getStats();
    console.log('✓ Stats:', stats);
    
    console.log('✓ Justice Department downloader test completed');
    process.exit(0);
    
  } catch (error) {
    console.error('✗ Test failed:', error);
    process.exit(1);
  }
}

testJusticeDownloader();