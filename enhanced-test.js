#!/usr/bin/env node

/**
 * Enhanced test script to demonstrate DOJ file downloads with better error handling
 * This script will:
 * 1. Test the enhanced scraper functionality
 * 2. Handle authentication issues gracefully
 * 3. Demonstrate file discovery and download capabilities
 * 4. Generate comprehensive monitoring reports
 */

const { JusticeScraper } = require('./dist/scraper/justice-scraper');
const { StorageManager } = require('./dist/utils/storage-manager');
const { StorageType } = require('./dist/utils/storage-manager');
const axios = require('axios');

class EnhancedDOJTester {
  constructor() {
    this.scraper = new JusticeScraper();
    this.storageManager = new StorageManager({
      type: StorageType.LOCAL,
      basePath: './downloads/enhanced-test'
    });
    this.testResults = {
      dataSets: [],
      totalFilesFound: 0,
      totalFilesDownloaded: 0,
      errors: [],
      warnings: [],
      startTime: new Date(),
      endTime: null
    };
  }

  async runTest() {
    console.log('🚀 Starting Enhanced DOJ Epstein Files Test');
    console.log('📋 Testing enhanced scraping with authentication handling');
    console.log('📊 This will demonstrate file discovery and monitoring capabilities\n');

    try {
      // Ensure test directories exist
      await this.storageManager.ensureDirectory('./downloads/enhanced-test');
      await this.storageManager.ensureDirectory('./logs');

      // Test multiple data sets and pages
      const dataSets = [1, 2, 3];
      
      for (const dataSetNumber of dataSets) {
        console.log(`\n🔍 Testing Data Set ${dataSetNumber}`);
        console.log('=' .repeat(50));
        
        const dataSetResult = {
          dataSetNumber: dataSetNumber,
          pages: [],
          filesFound: 0,
          filesDownloaded: 0,
          errors: [],
          warnings: []
        };

      // Test 5 pages per data set
        for (let pageNumber = 1; pageNumber <= 5; pageNumber++) {
          console.log(`\n📄 Page ${pageNumber}:`);
          
          const pageResult = await this.testPage(dataSetNumber, pageNumber);
          dataSetResult.pages.push(pageResult);
          dataSetResult.filesFound += pageResult.filesFound;
          dataSetResult.filesDownloaded += pageResult.filesDownloaded;
          dataSetResult.errors.push(...pageResult.errors);
          dataSetResult.warnings.push(...pageResult.warnings);
        }

        this.testResults.dataSets.push(dataSetResult);
        this.testResults.totalFilesFound += dataSetResult.filesFound;
        this.testResults.totalFilesDownloaded += dataSetResult.filesDownloaded;
        this.testResults.errors.push(...dataSetResult.errors);
        this.testResults.warnings.push(...dataSetResult.warnings);

        console.log(`\n✅ Data Set ${dataSetNumber} Summary:`);
        console.log(`   Files Found: ${dataSetResult.filesFound}`);
        console.log(`   Files Downloaded: ${dataSetResult.filesDownloaded}`);
        console.log(`   Errors: ${dataSetResult.errors.length}`);
        console.log(`   Warnings: ${dataSetResult.warnings.length}`);
      }

      this.testResults.endTime = new Date();
      await this.generateReport();
      
      console.log('\n🎉 Enhanced test completed!');
      console.log(`📊 Total Files Found: ${this.testResults.totalFilesFound}`);
      console.log(`📥 Total Files Downloaded: ${this.testResults.totalFilesDownloaded}`);
      console.log(`❌ Total Errors: ${this.testResults.errors.length}`);
      console.log(`⚠️  Total Warnings: ${this.testResults.warnings.length}`);
      console.log(`⏱️  Test Duration: ${this.getDuration()}`);

      // Generate troubleshooting report
      await this.generateTroubleshootingReport();

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
      warnings: [],
      files: [],
      statusCode: null,
      responseTime: 0
    };

    try {
      // Test connection first
      const connectionTest = await this.testConnection(dataSetNumber, pageNumber);
      pageResult.statusCode = connectionTest.statusCode;
      pageResult.responseTime = connectionTest.responseTime;

      if (connectionTest.statusCode === 403) {
        pageResult.warnings.push('Authentication required - cookies may be invalid or expired');
        console.log(`   ⚠️  Authentication issue detected (HTTP 403)`);
      } else if (connectionTest.statusCode !== 200) {
        pageResult.warnings.push(`Unexpected status code: ${connectionTest.statusCode}`);
        console.log(`   ⚠️  Unexpected response: HTTP ${connectionTest.statusCode}`);
      }

      // Scrape the page for files
      console.log(`   📨 Scraping page ${pageNumber}...`);
      const files = await this.scraper.scrapeDataSetPage(dataSetNumber, pageNumber);
      
      pageResult.filesFound = files.length;
      pageResult.files = files;

      if (files.length === 0) {
        console.log(`   ⚠️  No files found on page ${pageNumber}`);
        if (connectionTest.statusCode === 200) {
          pageResult.warnings.push('Page loaded successfully but no files detected');
        }
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

  async testConnection(dataSetNumber, pageNumber) {
    const url = `https://www.justice.gov/epstein/doj-disclosures/data-set-${dataSetNumber}-files?page=${pageNumber}`;
    
    const startTime = Date.now();
    
    try {
      const cookies = process.env.DOJ_COOKIES || '';
      
      const headers = {
        'User-Agent': 'EpsteinDownloader/1.0 (+https://github.com/yourusername/epstein-downloader)'
      };
      
      if (cookies) {
        headers.Cookie = cookies;
      }

      const response = await axios.get(url, {
        timeout: 30000,
        headers: headers,
        validateStatus: () => true // Accept all status codes for analysis
      });

      const responseTime = Date.now() - startTime;

      return {
        statusCode: response.status,
        responseTime: responseTime,
        url: url
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        statusCode: error.response?.status || 0,
        responseTime: responseTime,
        url: url,
        error: error.message
      };
    }
  }

  async downloadFile(file, dataSetNumber, pageNumber, fileIndex) {
    try {
      const cookies = process.env.DOJ_COOKIES || '';
      
      const headers = {
        'User-Agent': 'EpsteinDownloader/1.0 (+https://github.com/yourusername/epstein-downloader)'
      };
      
      if (cookies) {
        headers.Cookie = cookies;
      }
      
      const response = await axios.get(file.url, {
        headers: headers,
        responseType: 'arraybuffer',
        timeout: 30000
      });

      const buffer = response.data;
      const size = buffer.length;

      // Save file with structured naming
      const filename = `${dataSetNumber}_page${pageNumber}_file${fileIndex}_${file.filename}`;
      const filePath = `./downloads/enhanced-test/data-set-${dataSetNumber}/${filename}`;
      
      await this.storageManager.ensureDirectory(`./downloads/enhanced-test/data-set-${dataSetNumber}`);
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
    const reportPath = './logs/enhanced-test-report.json';
    const htmlReportPath = './logs/enhanced-test-report.html';

    // Save JSON report
    const reportData = {
      ...this.testResults,
      duration: this.getDuration(),
      config: {
        testPagesPerDataSet: 3,
        testDataSets: [1, 2, 3],
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
    <title>Enhanced DOJ Epstein Files Test Report</title>
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
        .warning { color: #ffc107; }
        .success { color: #28a745; }
        .files-list { font-size: 12px; color: #666; }
        .status-code { font-family: monospace; padding: 2px 6px; border-radius: 3px; }
        .status-200 { background: #d4edda; color: #155724; }
        .status-403 { background: #f8d7da; color: #721c24; }
        .status-other { background: #fff3cd; color: #856404; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Enhanced DOJ Epstein Files Test Report</h1>
        <p><strong>Test Date:</strong> ${data.startTime}</p>
        <p><strong>Duration:</strong> ${duration}</p>
        <p><strong>Authentication Status:</strong> ${process.env.DOJ_COOKIES ? 'Cookies provided' : 'No cookies configured'}</p>
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
            <h3>Issues</h3>
            <div class="value" style="color: ${data.errors.length > 0 || data.warnings.length > 0 ? '#dc3545' : '#28a745'}">
                ${data.errors.length} errors, ${data.warnings.length} warnings
            </div>
        </div>
    </div>

    <h2>Data Set Results</h2>
    ${data.dataSets.map(ds => `
        <div class="data-set">
            <h3>Data Set ${ds.dataSetNumber}</h3>
            <p><strong>Files Found:</strong> ${ds.filesFound} | <strong>Downloaded:</strong> ${ds.filesDownloaded} | <strong>Errors:</strong> ${ds.errors.length} | <strong>Warnings:</strong> ${ds.warnings.length}</p>
            
            <h4>Pages:</h4>
            ${ds.pages.map(p => `
                <div class="page">
                    <strong>Page ${p.pageNumber}:</strong> 
                    ${p.filesFound} files found, ${p.filesDownloaded} downloaded
                    <span class="status-code status-${p.statusCode === 200 ? '200' : p.statusCode === 403 ? '403' : 'other'}">
                        HTTP ${p.statusCode} (${p.responseTime}ms)
                    </span>
                    ${p.files.length > 0 ? `
                        <div class="files-list">
                            <strong>Files:</strong>
                            <ul>
                                ${p.files.map(f => `<li>${f.filename} - ${f.url}</li>`).join('')}
                            </ul>
                        </div>
                    ` : '<span class="warning">No files found</span>'}
                    ${p.warnings.length > 0 ? `
                        <div class="warning">
                            <strong>Warnings:</strong>
                            <ul>
                                ${p.warnings.map(w => `<li>${w}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    ${p.errors.length > 0 ? `
                        <div class="error">
                            <strong>Errors:</strong>
                            <ul>
                                ${p.errors.map(e => `<li>${e}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
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

    ${data.warnings.length > 0 ? `
        <h2>Warnings</h2>
        <div class="warning">
            ${data.warnings.map(warning => `<p>• ${warning}</p>`).join('')}
        </div>
    ` : ''}

    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666;">
        <p><em>This report was generated by the Enhanced Epstein Files Downloader test suite.</em></p>
        <p><strong>Note:</strong> Authentication issues may prevent access to DOJ files. Ensure valid cookies are configured in the .env file.</p>
    </div>
</body>
</html>
    `;
  }

  async generateTroubleshootingReport() {
    const troubleshootPath = './logs/troubleshooting-report.json';
    
    const troubleshootData = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        cookiesConfigured: !!process.env.DOJ_COOKIES,
        cookiesLength: process.env.DOJ_COOKIES ? process.env.DOJ_COOKIES.length : 0
      },
      issues: {
        authenticationProblems: this.testResults.warnings.filter(w => w.includes('Authentication')).length,
        connectionProblems: this.testResults.errors.filter(e => e.includes('Connection')).length,
        downloadProblems: this.testResults.errors.filter(e => e.includes('download')).length
      },
      recommendations: this.generateRecommendations()
    };

    await this.storageManager.writeFile(troubleshootPath, JSON.stringify(troubleshootData, null, 2));
    
    console.log(`\n🔧 Troubleshooting report generated: ${troubleshootPath}`);
    console.log('\n📋 Recommendations:');
    troubleshootData.recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (!process.env.DOJ_COOKIES) {
      recommendations.push('Configure valid DOJ cookies in the .env file');
    }
    
    if (this.testResults.warnings.some(w => w.includes('Authentication'))) {
      recommendations.push('Check if DOJ cookies are still valid and not expired');
    }
    
    if (this.testResults.errors.length > 0) {
      recommendations.push('Review error logs for specific issues');
    }
    
    recommendations.push('Consider implementing rate limiting to avoid detection');
    recommendations.push('Test with different User-Agent strings');
    recommendations.push('Monitor DOJ website for changes in structure');
    
    return recommendations;
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
  const tester = new EnhancedDOJTester();
  await tester.runTest();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { EnhancedDOJTester };