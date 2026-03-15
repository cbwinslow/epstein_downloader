#!/usr/bin/env node

/**
 * Test script to demonstrate DOJ file downloads from multiple data sets
 * This script will:
 * 1. Scrape 5 pages from each of 3 data sets (1, 2, 3)
 * 2. Download sample files from each page
 * 3. Monitor and log all activities
 * 4. Generate comprehensive reports
 */

const { JusticeDepartmentDownloader } = require('./dist/services/justice-department-downloader');
const { JusticeScraper } = require('./dist/scraper/justice-scraper');
const { StorageManager, StorageType } = require('./dist/utils/storage-manager');
const fs = require('fs');
const path = require('path');

class DOJDownloadTester {
  constructor() {
    this.scraper = new JusticeScraper();
    this.storageManager = new StorageManager({
      type: StorageType.LOCAL,
      basePath: './downloads/test-doj'
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
    console.log('🚀 Starting DOJ Epstein Files Download Test');
    console.log('📋 Testing 5 pages from each of 3 data sets (1, 2, 3)');
    console.log('📊 This will demonstrate file discovery and download capabilities\n');

    try {
      // Ensure test directories exist
      await this.storageManager.ensureDirectory('./downloads/test-doj');
      await this.storageManager.ensureDirectory('./logs');

      // Test data sets 1, 2, and 3
      const dataSets = [1, 2, 3];
      
      for (const dataSetNumber of dataSets) {
        console.log(`\n🔍 Testing Data Set ${dataSetNumber}`);
        console.log('=' .repeat(50));
        
        const dataSetResult = {
          dataSetNumber: dataSetNumber,
          pages: [],
          filesFound: 0,
          filesDownloaded: 0,
          errors: []
        };

        // Test 5 pages per data set
        for (let pageNumber = 1; pageNumber <= 5; pageNumber++) {
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
      }

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
      
      // Download first 3 files as samples (to avoid overwhelming the server)
      const filesToDownload = files.slice(0, 3);
      
      for (let i = 0; i < filesToDownload.length; i++) {
        const file = filesToDownload[i];
        console.log(`   📥 Downloading file ${i + 1}/${filesToDownload.length}: ${file.filename}`);
        
        try {
          const downloadResult = await this.downloadFile(file, dataSetNumber, pageNumber, i + 1);
          
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
      const response = await fetch(file.url, {
        headers: {
          'User-Agent': 'EpsteinDownloader/1.0 (+https://github.com/yourusername/epstein-downloader)',
          'Cookie': process.env.DOJ_COOKIES || ''
        }
      });

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }

      const buffer = await response.arrayBuffer();
      const size = buffer.byteLength;

      // Save file with structured naming
      const filename = `${dataSetNumber}_page${pageNumber}_file${fileIndex}_${file.filename}`;
      const filePath = path.join('./downloads/test-doj', `data-set-${dataSetNumber}`, filename);
      
      await this.storageManager.ensureDirectory(path.dirname(filePath));
      await this.storageManager.writeFile(filePath, Buffer.from(buffer));

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
    const reportPath = './logs/test-report.json';
    const htmlReportPath = './logs/test-report.html';

    // Save JSON report
    const reportData = {
      ...this.testResults,
      duration: this.getDuration(),
      config: {
        testPagesPerDataSet: 5,
        testDataSets: [1, 2, 3],
        maxFilesPerPage: 3
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
    <title>DOJ Epstein Files Download Test Report</title>
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
        <h1>DOJ Epstein Files Download Test Report</h1>
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
  const tester = new DOJDownloadTester();
  await tester.runTest();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { DOJDownloadTester };