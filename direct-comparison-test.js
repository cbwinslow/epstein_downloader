#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');

async function compareRequests() {
  console.log('🔍 Comparing Direct vs Scraper Requests\n');
  
  const cookies = process.env.DOJ_COOKIES;
  console.log('🍪 Cookies available:', !!cookies);
  
  if (!cookies) {
    console.log('❌ No cookies found');
    return;
  }
  
  const url = 'https://www.justice.gov/epstein/doj-disclosures/data-set-1-files?page=1';
  
  // Test 1: Direct request (like simple-auth-test.js)
  console.log('📡 Test 1: Direct Request');
  try {
    const directResponse = await axios.get(url, {
      headers: {
        'Cookie': cookies,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000,
      validateStatus: () => true
    });
    
    console.log('   Status:', directResponse.status);
    console.log('   Response length:', directResponse.data.toString().length);
    
    const directHtml = directResponse.data.toString();
    const directFiles = directHtml.match(/href="[^"]*\.(pdf|doc|docx|txt|zip)"/g);
    console.log('   Files found:', directFiles ? directFiles.length : 0);
    
  } catch (error) {
    console.log('   Error:', error.message);
  }
  
  // Test 2: Scraper-style request
  console.log('\n📡 Test 2: Scraper-Style Request');
  try {
    const scraperResponse = await axios.get(url, {
      headers: {
        'User-Agent': 'EpsteinDownloader/1.0 (+https://github.com/yourusername/epstein-downloader)',
        'Cookie': cookies
      },
      timeout: 30000,
      validateStatus: (status) => status === 200 || status === 403
    });
    
    console.log('   Status:', scraperResponse.status);
    console.log('   Response length:', scraperResponse.data.toString().length);
    
    const scraperHtml = scraperResponse.data.toString();
    const scraperFiles = scraperHtml.match(/href="[^"]*\.(pdf|doc|docx|txt|zip)"/g);
    console.log('   Files found:', scraperFiles ? scraperFiles.length : 0);
    
  } catch (error) {
    console.log('   Error:', error.message);
  }
  
  // Test 3: Check if cookies are being sent correctly
  console.log('\n🍪 Test 3: Cookie Verification');
  console.log('   Cookie length:', cookies.length);
  console.log('   ak_bmsc present:', cookies.includes('ak_bmsc'));
  console.log('   justiceGovAgeVerified present:', cookies.includes('justiceGovAgeVerified'));
  
  // Test 4: Try different User-Agent
  console.log('\n📡 Test 4: Different User-Agent');
  try {
    const browserResponse = await axios.get(url, {
      headers: {
        'Cookie': cookies,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 10000,
      validateStatus: () => true
    });
    
    console.log('   Status:', browserResponse.status);
    console.log('   Files found:', browserResponse.data.toString().match(/href="[^"]*\.(pdf|doc|docx|txt|zip)"/g)?.length || 0);
    
  } catch (error) {
    console.log('   Error:', error.message);
  }
}

compareRequests();