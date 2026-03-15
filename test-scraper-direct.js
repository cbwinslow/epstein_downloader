#!/usr/bin/env node

require('dotenv').config();
const { JusticeScraper } = require('./dist/scraper/justice-scraper');

async function testScraperDirectly() {
  console.log('🔍 Testing JusticeScraper Directly\n');
  
  const scraper = new JusticeScraper();
  
  try {
    console.log('📄 Testing Data Set 1, Page 1...');
    const files = await scraper.scrapeDataSetPage(1, 1);
    
    console.log(`📊 Found ${files.length} files:`);
    files.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file.filename}`);
      console.log(`      URL: ${file.url}`);
    });
    
    if (files.length === 0) {
      console.log('⚠️  No files found - checking if this is an authentication issue...');
      
      // Test the connection directly
      const axios = require('axios');
      const cookies = process.env.DOJ_COOKIES;
      
      const response = await axios.get('https://www.justice.gov/epstein/doj-disclosures/data-set-1-files?page=1', {
        headers: {
          'Cookie': cookies,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 10000,
        validateStatus: () => true
      });
      
      console.log(`📡 Direct request status: ${response.status}`);
      console.log(`📄 Response length: ${response.data.toString().length}`);
      
      const html = response.data.toString();
      const fileMatches = html.match(/href="[^"]*\.(pdf|doc|docx|txt|zip)"/g);
      console.log(`📁 Files in raw HTML: ${fileMatches ? fileMatches.length : 0}`);
    }
    
  } catch (error) {
    console.error('💥 Error testing scraper:', error.message);
  }
}

testScraperDirectly();