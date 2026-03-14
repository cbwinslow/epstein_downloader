import { Downloader } from '@downloader/core';

/**
 * Main entry point for the Epstein Files Downloader
 */
async function main(): Promise<void> {
  console.log('Epstein Files Downloader starting...');
  
  const downloader = new Downloader();
  
  try {
    // Initialize the downloader
    await downloader.initialize();
    
    // Start the download process
    await downloader.start();
    
  } catch (error) {
    console.error('Fatal error in downloader:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nReceived SIGINT. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nReceived SIGTERM. Shutting down gracefully...');
  process.exit(0);
});

// Run the main function
main().catch(error => {
  console.error('Unhandled promise rejection:', error);
  process.exit(1);
});