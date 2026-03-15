#!/usr/bin/env node

/**
 * Debug script to test DOJ authentication with provided cookies
 */

require('dotenv').config();
const axios = require('axios');

async function testAuthentication() {
  console.log('🔍 Testing DOJ Authentication with Provided Cookies\n');
  
  // Test cookies from .env
  const cookies = process.env.DOJ_COOKIES;
  console.log('🍪 Cookies from .env:', cookies ? 'Found' : 'Not found');
  
  if (!cookies) {
    console.log('❌ No cookies found in environment');
    return;
  }
  
  console.log('🍪 Cookie details:');
  console.log('   ak_bmsc:', cookies.includes('ak_bmsc') ? 'Present' : 'Missing');
  console.log('   justiceGovAgeVerified:', cookies.includes('justiceGovAgeVerified') ? 'Present' : 'Missing');
  
  // Test the connection
  const url = 'https://www.justice.gov/epstein/doj-disclosures/data-set-1-files?page=1';
  console.log(`\n🌐 Testing URL: ${url}`);
  
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Cookie': cookies
    };
    
    console.log('\n📡 Making request with headers:');
    console.log('   User-Agent:', headers['User-Agent']);
    console.log('   Cookie:', cookies.substring(0, 100) + '...');
    
    const response = await axios.get(url, {
      headers: headers,
      timeout: 30000,
      validateStatus: () => true
    });
    
    console.log(`\n📊 Response Status: ${response.status}`);
    console.log(`⏱️  Response Time: ${response.headers['x-response-time'] || 'N/A'}`);
    
    // Check for authentication indicators in response
    const responseText = response.data.toString();
    console.log('\n🔍 Response Analysis:');
    console.log('   Contains "authentication":', responseText.toLowerCase().includes('authentication'));
    console.log('   Contains "login":', responseText.toLowerCase().includes('login'));
    console.log('   Contains "access denied":', responseText.toLowerCase().includes('access denied'));
    console.log('   Contains "cookies":', responseText.toLowerCase().includes('cookies'));
    
    // Check response headers for authentication clues
    console.log('\n📋 Response Headers:');
    Object.keys(response.headers).forEach(key => {
      if (key.toLowerCase().includes('auth') || key.toLowerCase().includes('cookie') || key.toLowerCase().includes('set-cookie')) {
        console.log(`   ${key}: ${response.headers[key]}`);
      }
    });
    
    // Save a sample of the response for analysis
    const sampleResponse = responseText.substring(0, 1000);
    console.log('\n📄 Response Sample (first 1000 chars):');
    console.log(sampleResponse);
    
    if (response.status === 200) {
      console.log('\n✅ Authentication successful! Response received.');
      
      // Try to find files in the response
      const fileMatches = responseText.match(/href="([^"]*\.(pdf|doc|docx|txt|zip|rar))"/gi);
      if (fileMatches) {
        console.log(`\n📁 Found ${fileMatches.length} potential files:`);
        fileMatches.slice(0, 5).forEach((match, index) => {
          console.log(`   ${index + 1}. ${match}`);
        });
      } else {
        console.log('\n⚠️  No files detected in response');
      }
    } else {
      console.log('\n❌ Authentication failed. Status:', response.status);
    }
    
  } catch (error) {
    console.error('💥 Error during authentication test:', error.message);
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', error.response.data.toString().substring(0, 500));
    }
  }
}

// Run the test
