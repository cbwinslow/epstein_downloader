#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');

async function testAuth() {
  const cookies = process.env.DOJ_COOKIES;
  console.log('Cookies loaded:', !!cookies);
  console.log('Cookie value:', cookies ? cookies.substring(0, 50) + '...' : 'None');
  
  if (!cookies) return;
  
  try {
    const response = await axios.get('https://www.justice.gov/epstein/doj-disclosures/data-set-1-files?page=1', {
      headers: {
        'Cookie': cookies,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000,
      validateStatus: () => true
    });
    
    console.log('Status:', response.status);
    console.log('Headers:', Object.keys(response.headers).filter(k => k.includes('set-cookie')));
    
    const html = response.data.toString();
    console.log('Response length:', html.length);
    console.log('Contains "authentication":', html.toLowerCase().includes('authentication'));
    console.log('Contains "login":', html.toLowerCase().includes('login'));
    
    // Look for files
    const fileMatches = html.match(/href="[^"]*\.(pdf|doc|docx|txt|zip)"/g);
    console.log('Files found:', fileMatches ? fileMatches.length : 0);
    if (fileMatches) {
      console.log('Sample files:', fileMatches.slice(0, 3));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAuth();