#!/usr/bin/env node

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { JusticeScraper } = require('./dist/scraper/justice-scraper');

async function downloadActualFiles() {
  console.log('🚀 Starting Actual File Downloads\n');
  
  const scraper = new JusticeScraper();
  const downloadDir = './downloads/actual-files';
  
  // Create download directory
  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
    console.log(`📁 Created download directory: ${downloadDir}`);
  }
  
  let totalDownloaded = 0;
  let totalSize = 0;
  
  // Download from Data Set 1, Pages 1-3 (to start with a manageable amount)
  for (let dataSetNumber = 1; dataSetNumber <= 1; dataSetNumber++) {
    console.log(`\n📂 Processing Data Set ${dataSetNumber}`);
    
    for (let pageNumber = 1; pageNumber <= 3; pageNumber++) {
      console.log(`\n📄 Page ${pageNumber}:`);
      
      try {
        const files = await scraper.scrapeDataSetPage(dataSetNumber, pageNumber);
        console.log(`   📊 Found ${files.length} files`);
        
        // Filter for actual document files (PDF, DOC, etc.) and exclude navigation links
        const documentFiles = files.filter(file => 
          file.filename !== 'Guidance Documents' && 
          file.filename !== 'Data Set 1 Files' &&
          file.filename !== 'Data Set 2 Files' &&
          file.filename !== 'Data Set 3 Files' &&
          file.filename !== 'Data Set 4 Files' &&
          file.url.includes('/epstein/files/')
        );
        
        console.log(`   📁 ${documentFiles.length} document files to download`);
        
        // Download first 5 files from each page as samples
        const filesToDownload = documentFiles.slice(0, 5);
        
        for (let i = 0; i < filesToDownload.length; i++) {
          const file = filesToDownload[i];
          const filename = `${dataSetNumber}_page${pageNumber}_file${i+1}_${file.filename}`;
          const filePath = path.join(downloadDir, filename);
          
          try {
            console.log(`   ⬇️  Downloading: ${file.filename}`);
            
            const response = await axios.get(file.url, {
              timeout: 30000,
              responseType: 'stream',
              headers: {
                'Cookie': process.env.DOJ_COOKIES,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
              }
            });
            
            // Create write stream
            const writer = fs.createWriteStream(filePath);
            
            // Pipe the response to file
            response.data.pipe(writer);
            
            // Wait for download to complete
            await new Promise((resolve, reject) => {
              writer.on('finish', resolve);
              writer.on('error', reject);
            });
            
            // Get file size
            const stats = fs.statSync(filePath);
            const fileSize = stats.size;
            
            console.log(`   ✅ Downloaded: ${filename} (${fileSize} bytes)`);
            totalDownloaded++;
            totalSize += fileSize;
            
          } catch (downloadError) {
            console.log(`   ❌ Failed to download ${file.filename}: ${downloadError.message}`);
          }
        }
        
      } catch (error) {
        console.log(`   ❌ Error scraping page ${pageNumber}: ${error.message}`);
      }
    }
  }
  
  console.log(`\n🎉 Download Complete!`);
  console.log(`📊 Total files downloaded: ${totalDownloaded}`);
  console.log(`📏 Total size: ${totalSize} bytes (${Math.round(totalSize / 1024)} KB)`);
  
  // List downloaded files
  console.log(`\n📁 Downloaded Files:`);
  const files = fs.readdirSync(downloadDir);
  files.forEach((file, index) => {
    const filePath = path.join(downloadDir, file);
    const stats = fs.statSync(filePath);
    console.log(`   ${index + 1}. ${file} (${stats.size} bytes)`);
  });
}

downloadActualFiles().catch(console.error);