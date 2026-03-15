#!/usr/bin/env node

/**
 * Simple test script to demonstrate DOJ file downloads
 * This script directly tests the enhanced scraper functionality
 */

const { JusticeScraper } = require('./dist/scraper/justice-scraper');
const { StorageManager } = require('./dist/utils/storage-manager');
const { StorageType } = require('./dist/utils/storage-manager');

class SimpleDOJTester {
  constructor() {
    this.scraper = new JusticeScraper();
    this.storageManager = new StorageManager({
      type: StorageType.LOCAL,
      basePath: './downloads/simple-test'
    });
    this.testResults = {
      dataSets: [],
      totalFilesFound: 0,
      totalFilesDownloaded: 0,
      errors: [],
      startTime: new Date(),
      endTime: null
    };
  }

  async runTest() {
    console.log('🚀 Starting Simple DOJ Epstein Files Test');
    console.log('📋 Testing 3 pages from Data Set 1');
    console.log('📊 This will demonstrate file discovery capabilities\n');

    try {
      // Ensure test directories exist
      await this.storageManager.ensureDirectory('./downloads/simple-test');
      await this.storageManager.ensureDirectory('./logs');

      // Test Data Set 1, pages 1-3
      const dataSetNumber = 1;
      const pages = [1, 2, 3];
      
      console.log(`\n🔍 Testing Data Set ${dataSetNumber}`);
      console.log('=' .repeat(50));
      
      const dataSetResult = {
        dataSetNumber: dataSetNumber,
        pages: [],
        filesFound: 0,
        filesDownloaded: 0,
        errors: []
      };

      for (const pageNumber of pages) {
        console.log(`\n📄 Page ${pageNumber}:`);
        
        const pageResult = await this.testPage(dataSetNumber, pageNumber);
        dataSetResult.pages.push(pageResult);
        dataSetResult.filesFound += pageResult.filesFound;
        dataSetResult.filesDownloaded += pageResult.filesDownloaded;
        dataSetResult.errors.push(...pageResult.errors);
      }

      this.testResults.dataSets.push(dataSetResult);
      this.testResults.totalFilesFound += dataSetResult.filesFound;
      this.testResults.totalFilesDownloaded += dataSetResult.filesDownloaded;
      this.testResults.errors.push(...dataSetResult.errors);

      console.log(`\n✅ Data Set ${dataSetNumber} Summary:`);
      console.log(`   Files Found: ${dataSetResult.filesFound}`);
      console.log(`   Files Downloaded: ${dataSetResult.filesDownloaded}`);
      console.log(`   Errors: ${dataSetResult.errors.length}`);

      this.testResults.endTime = new Date();
      await this.generateReport();
      
      console.log('\n🎉 Test completed successfully!');
      console.log(`📊 Total Files Found: ${this.testResults.totalFilesFound}`);
      console.log(`📥 Total Files Downloaded: ${this.testResults.totalFilesDownloaded}`);
      console.log(`❌ Total Errors: ${this.testResults.errors.length}`);
      console.log(`⏱️  Test Duration: ${this.getDuration()}`);

    } catch (error) {
      console.error('💥 Test failed:', error.message);
      this.testResults.errors.push(`Test failed: ${error.message}`);
      await this.generateReport();
      process.exit(1);
    }
  }

  async testPage(dataSetNumber, pageNumber) {
    const pageResult = {
      pageNumber: pageNumber,
      filesFound: 0,
      filesDownloaded: 0,
      errors: [],
      files: []
    };

    try {
      // Scrape the page for files
      console.log(`   📨 Scraping page ${pageNumber}...`);
      const files = await this.scraper.scrapeDataSetPage(dataSetNumber, pageNumber);
      
      pageResult.filesFound = files.length;
      pageResult.files = files;

      if (files.length === 0) {
        console.log(`   ⚠️  No files found on page ${pageNumber}`);
        return pageResult;
      }

      console.log(`   📋 Found ${files.length} files:`);
      files.forEach((file, index) => {
        console.log(`     ${index + 1}. ${file.filename}`);
        console.log(`        URL: ${file.url}`);
      });
      
      // Download first file as sample
      if (files.length > 0) {
        const file = files[0];
        console.log(`   📥 Downloading sample file: ${file.filename}`);
        
        try {
          const downloadResult = await this.downloadFile(file, dataSetNumber, pageNumber, 1);
          
          if (downloadResult.success) {
            pageResult.filesDownloaded++;
            console.log(`   ✅ Downloaded: ${file.filename} (${downloadResult.size} bytes)`);
          } else {
            pageResult.errors.push(`Failed to download ${file.filename}: ${downloadResult.error}`);
            console.log(`   ❌ Failed: ${file.filename} - ${downloadResult.error}`);
          }
        } catch (error) {
          pageResult.errors.push(`Error downloading ${file.filename}: ${error.message}`);
          console.log(`   💥 Error: ${file.filename} - ${error.message}`);
        }
      }

    } catch (error) {
      pageResult.errors.push(`Page scraping failed: ${error.message}`);
      console.log(`   💥 Page ${pageNumber} failed: ${error.message}`);
    }

    return pageResult;
  }

  async downloadFile(file, dataSetNumber, pageNumber, fileIndex) {
    try {
      // Use axios for downloading since fetch might not be available in all Node.js environments
      const axios = require('axios');
      
      const response = await axios.get(file.url, {
        headers: {
          'User-Agent': 'EpsteinDownloader/1.0 (+https://github.com/yourusername/epstein-downloader)',
          'Cookie': process.env.DOJ_COOKIES || ''
        },
        responseType: 'arraybuffer',
        timeout: 30000
      });

      const buffer = response.data;
      const size = buffer.length;

      // Save file with structured naming
      const filename = `${dataSetNumber}_page${pageNumber}_file${fileIndex}_${file.filename}`;
      const filePath = `./downloads/simple-test/data-set-${dataSetNumber}/${filename}`;
      
      await this.storageManager.ensureDirectory(`./downloads/simple-test/data-set-${dataSetNumber}`);
      await this.storageManager.writeFile(filePath, buffer);

      return {
        success: true,
        size: size,
        filePath: filePath
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async generateReport() {
    const reportPath = './logs/simple-test-report.json';
    const htmlReportPath = './logs/simple-test-report.html';

    // Save JSON report
    const reportData = {
      ...this.testResults,
      duration: this.getDuration(),
      config: {
        testPagesPerDataSet: 3,
        testDataSets: [1],
        maxFilesPerPage: 1
      }
    };

    await this.storageManager.writeFile(reportPath, JSON.stringify(reportData, null, 2));

    // Generate HTML report
    const htmlReport = this.generateHTMLReport(reportData);
    await this.storageManager.writeFile(htmlReportPath, htmlReport);

    console.log(`\n📄 Reports generated:`);
    console.log(`   JSON: ${reportPath}`);
    console.log(`   HTML: ${htmlReportPath}`);
  }

  generateHTMLReport(data) {
    const duration = this.getDuration();
    
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Simple DOJ Epstein Files Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 5px; }
        .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 20px 0; }
        .card { background: white; padding: 20px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .card h3 { margin: 0 0 10px 0; color: #333; }
        .card .value { font-size: 24px; font-weight: bold; color: #007bff; }
        .data-set { margin: 20px 0; border: 1px solid #ddd; padding: 20px; border-radius: 5px; }
        .page { margin: 10px 0; padding: 10px; background: #f9f9f9; border-radius: 3px; }
        .error { color: #dc3545; }
        .success { color: #28a745; }
        .files-list { font-size: 12px; color: #666; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Simple DOJ Epstein Files Test Report</h1>
        <p><strong>Test Date:</strong> ${data.startTime}</p>
        <p><strong>Duration:</strong> ${duration}</p>
    </div>

    <div class="summary">
        <div class="card">
            <h3>Total Files Found</h3>
            <div class="value">${data.totalFilesFound}</div>
        </div>
        <div class="card">
            <h3>Files Downloaded</h3>
            <div class="value">${data.totalFilesDownloaded}</div>
        </div>
        <div class="card">
            <h3>Success Rate</h3>
            <div class="value">${data.totalFilesFound > 0 ? Math.round((data.totalFilesDownloaded / data.totalFilesFound) * 100) : 0}%</div>
        </div>
        <div class="card">
            <h3>Errors</h3>
            <div class="value" style="color: ${data.errors.length > 0 ? '#dc3545' : '#28a745'}">${data.errors.length}</div>
        </div>
    </div>

    <h2>Data Set Results</h2>
    ${data.dataSets.map(ds => `
        <div class="data-set">
            <h3>Data Set ${ds.dataSetNumber}</h3>
            <p><strong>Files Found:</strong> ${ds.filesFound} | <strong>Downloaded:</strong> ${ds.filesDownloaded} | <strong>Errors:</strong> ${ds.errors.length}</p>
            
            <h4>Pages:</h4>
            ${ds.pages.map(p => `
                <div class="page">
                    <strong>Page ${p.pageNumber}:</strong> ${p.filesFound} files found, ${p.filesDownloaded} downloaded
                    ${p.files.length > 0 ? `
                        <div class="files-list">
                            <strong>Files:</strong>
                            <ul>
                                ${p.files.map(f => `<li>${f.filename} - ${f.url}</li>`).join('')}
                            </ul>
                        </div>
                    ` : '<span class="error">No files found</span>'}
                </div>
            `).join('')}
        </div>
    `).join('')}

    ${data.errors.length > 0 ? `
        <h2>Errors</h2>
        <div class="error">
            ${data.errors.map(error => `<p>• ${error}</p>`).join('')}
        </div>
    ` : ''}

    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666;">
        <p><em>This report was generated by the Epstein Files Downloader test suite.</em></p>
    </div>
</body>
</html>
    `;
  }

  getDuration() {
    if (!this.testResults.endTime) return 'In Progress';
    const ms = this.testResults.endTime - this.testResults.startTime;
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }
}

// Run the test
async function main() {
  const tester = new SimpleDOJTester();
  await tester.runTest();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { SimpleDOJTester };