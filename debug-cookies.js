#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');

async function debugCookies() {
  console.log('🍪 Debugging Cookie Issues\n');
  
  const cookies = process.env.DOJ_COOKIES;
  console.log('Raw cookies:', cookies);
  console.log('Cookie length:', cookies.length);
  console.log('Cookie type:', typeof cookies);
  
  if (!cookies) {
    console.log('❌ No cookies found');
    return;
  }
  
  const url = 'https://www.justice.gov/epstein/doj-disclosures/data-set-1-files?page=1';
  
  // Test 1: Exact same as simple-auth-test.js
  console.log('\n📡 Test 1: Exact simple-auth-test.js format');
  try {
    const response1 = await axios.get(url, {
      headers: {
        'Cookie': cookies,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000,
      validateStatus: () => true
    });
    
    console.log('   Status:', response1.status);
    console.log('   Files found:', response1.data.toString().match(/href="[^"]*\.(pdf|doc|docx|txt|zip)"/g)?.length || 0);
    
  } catch (error) {
    console.log('   Error:', error.message);
  }
  
  // Test 2: Exact same as JusticeScraper format
  console.log('\n📡 Test 2: Exact JusticeScraper format');
  try {
    const response2 = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Cookie': cookies
      },
      timeout: 30000,
      validateStatus: (status) => status === 200 || status === 403
    });
    
    console.log('   Status:', response2.status);
    console.log('   Files found:', response2.data.toString().match(/href="[^"]*\.(pdf|doc|docx|txt|zip)"/g)?.length || 0);
    
  } catch (error) {
    console.log('   Error:', error.message);
  }
  
  // Test 3: Check if cookies need to be URL decoded
  console.log('\n🍪 Test 3: Cookie Analysis');
  const cookieParts = cookies.split(';');
  console.log('Cookie parts:', cookieParts.length);
  cookieParts.forEach((part, index) => {
    console.log(`   ${index + 1}. ${part.trim()}`);
  });
  
  // Test 4: Try with different cookie formatting
  console.log('\n📡 Test 4: Different cookie formatting');
  try {
    // Try without quotes
    const cleanCookies = cookies.replace(/"/g, '');
    const response4 = await axios.get(url, {
      headers: {
        'Cookie': cleanCookies,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 10000,
      validateStatus: () => true
    });
    
    console.log('   Status (no quotes):', response4.status);
    console.log('   Files found:', response4.data.toString().match(/href="[^"]*\.(pdf|doc|docx|txt|zip)"/g)?.length || 0);
    
  } catch (error) {
    console.log('   Error:', error.message);
  }
}

debugCookies();