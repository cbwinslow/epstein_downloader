// Simple test script to verify the downloader works
const { Downloader } = require('./dist/index');

async function testDownloader() {
  console.log('Testing Epstein Files Downloader...');
  
  const downloader = new Downloader();
  
  try {
    // Initialize
    await downloader.initialize();
    console.log('✓ Downloader initialized');
    
    // Add a test download
    await downloader.addDownload('https://httpbin.org/delay/1', 'test-file.txt');
    console.log('✓ Test download added to queue');
    
    // Start downloader for a short time
    const downloadPromise = downloader.start();
    
    // Let it run for 5 seconds
    setTimeout(async () => {
      await downloader.stop();
      const stats = await downloader.getStats();
      console.log('✓ Download test completed');
      console.log('Stats:', stats);
      process.exit(0);
    }, 5000);
    
  } catch (error) {
    console.error('✗ Test failed:', error);
    process.exit(1);
  }
}

testDownloader();