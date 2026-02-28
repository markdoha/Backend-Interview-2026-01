#!/usr/bin/env node

/**
 * Test Script for CSV Bulk Upload Service
 * 
 * Usage: node test-service.js
 * 
 * Make sure the server is running first:
 *   npm run build && node dist/main.js
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const BASE_URL = 'http://localhost:3000';
const API_KEY = 'dev-secret-key-change-in-production';

function makeRequest(method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname + url.search,
      method: method,
      headers: {
        ...headers,
        ...(body ? { 'Content-Type': 'application/json' } : {})
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function uploadFile(filePath) {
  return new Promise((resolve, reject) => {
    const boundary = '----FormBoundary' + Math.random().toString(16).slice(2);
    const fileContent = fs.readFileSync(filePath);
    const filename = path.basename(filePath);
    
    const payload = Buffer.concat([
      Buffer.from(`--${boundary}\r\n`),
      Buffer.from(`Content-Disposition: form-data; name="file"; filename="${filename}"\r\n`),
      Buffer.from(`Content-Type: text/csv\r\n\r\n`),
      fileContent,
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);

    const url = new URL('/bulk-upload/upload', BASE_URL);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': payload.length,
        'x-api-key': API_KEY
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            body: JSON.parse(data)
          });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function log(name, result) {
  const statusColor = result.status >= 200 && result.status < 300 ? '\x1b[32m' : '\x1b[31m';
  console.log(`\n${'='.repeat(50)}`);
  console.log(`\x1b[36m${name}\x1b[0m`);
  console.log(`Status: ${statusColor}${result.status}\x1b[0m`);
  console.log('Response:', JSON.stringify(result.body, null, 2));
}

async function runTests() {
  console.log('\x1b[35m%s\x1b[0m', '\n  CSV Bulk Upload Service - Test Suite\n');
  
  let passed = 0;
  let failed = 0;

  // Test 1: Check server health (stats endpoint is public)
  try {
    console.log('\n\x1b[33mTest 1: GET /bulk-upload/stats (public endpoint)\x1b[0m');
    const result = await makeRequest('GET', '/bulk-upload/stats');
    log('Stats Endpoint', result);
    if (result.status === 200) {
      console.log('\x1b[32m✓ PASSED\x1b[0m');
      passed++;
    } else {
      console.log('\x1b[31m✗ FAILED\x1b[0m');
      failed++;
    }
  } catch (e) {
    console.log('\x1b[31m✗ FAILED:', e.message, '\x1b[0m');
    console.log('\nMake sure the server is running:');
    console.log('  npm run build && node dist/main.js\n');
    process.exit(1);
  }

  // Test 2: Unauthorized request (no API key)
  try {
    console.log('\n\x1b[33mTest 2: GET /bulk-upload/records (no API key - should fail)\x1b[0m');
    const result = await makeRequest('GET', '/bulk-upload/records');
    log('Unauthorized Request', result);
    if (result.status === 401) {
      console.log('\x1b[32m✓ PASSED\x1b[0m');
      passed++;
    } else {
      console.log('\x1b[31m✗ FAILED\x1b[0m');
      failed++;
    }
  } catch (e) {
    console.log('\x1b[31m✗ FAILED:', e.message, '\x1b[0m');
    failed++;
  }

  // Test 3: Invalid API key
  try {
    console.log('\n\x1b[33mTest 3: GET /bulk-upload/records (invalid API key - should fail)\x1b[0m');
    const result = await makeRequest('GET', '/bulk-upload/records', {
      'x-api-key': 'invalid-key'
    });
    log('Invalid API Key', result);
    if (result.status === 401) {
      console.log('\x1b[32m✓ PASSED\x1b[0m');
      passed++;
    } else {
      console.log('\x1b[31m✗ FAILED\x1b[0m');
      failed++;
    }
  } catch (e) {
    console.log('\x1b[31m✗ FAILED:', e.message, '\x1b[0m');
    failed++;
  }

  // Test 4: Get records with valid API key
  try {
    console.log('\n\x1b[33mTest 4: GET /bulk-upload/records (valid API key)\x1b[0m');
    const result = await makeRequest('GET', '/bulk-upload/records?limit=5', {
      'x-api-key': API_KEY
    });
    log('Get Records', result);
    if (result.status === 200) {
      console.log('\x1b[32m✓ PASSED\x1b[0m');
      passed++;
    } else {
      console.log('\x1b[31m✗ FAILED\x1b[0m');
      failed++;
    }
  } catch (e) {
    console.log('\x1b[31m✗ FAILED:', e.message, '\x1b[0m');
    failed++;
  }

  // Test 5: Upload CSV file
  try {
    console.log('\n\x1b[33mTest 5: POST /bulk-upload/upload (upload CSV)\x1b[0m');
    const csvPath = path.join(__dirname, 'data', 'sample-data.csv');
    
    if (!fs.existsSync(csvPath)) {
      console.log('Sample CSV not found, creating one...');
      const sampleCsv = `id,name,email,age,active
1,John Doe,john@example.com,30,true
2,Jane Smith,jane@example.com,25,false
3,Bob Wilson,bob@example.com,45,true`;
      fs.writeFileSync(csvPath, sampleCsv);
    }
    
    const result = await uploadFile(csvPath);
    log('Upload CSV', result);
    if (result.status === 200 && result.body.success) {
      console.log('\x1b[32m✓ PASSED\x1b[0m');
      passed++;
    } else {
      console.log('\x1b[31m✗ FAILED\x1b[0m');
      failed++;
    }
  } catch (e) {
    console.log('\x1b[31m✗ FAILED:', e.message, '\x1b[0m');
    failed++;
  }

  // Test 6: Verify records were added
  try {
    console.log('\n\x1b[33mTest 6: Verify records were added\x1b[0m');
    const result = await makeRequest('GET', '/bulk-upload/stats');
    log('Stats After Upload', result);
    if (result.status === 200 && result.body.totalRecords > 0) {
      console.log('\x1b[32m✓ PASSED\x1b[0m');
      passed++;
    } else {
      console.log('\x1b[31m✗ FAILED\x1b[0m');
      failed++;
    }
  } catch (e) {
    console.log('\x1b[31m✗ FAILED:', e.message, '\x1b[0m');
    failed++;
  }

  // Test 7: Clear records
  try {
    console.log('\n\x1b[33mTest 7: DELETE /bulk-upload/records (clear all)\x1b[0m');
    const result = await makeRequest('DELETE', '/bulk-upload/records', {
      'x-api-key': API_KEY
    });
    log('Clear Records', result);
    if (result.status === 200) {
      console.log('\x1b[32m✓ PASSED\x1b[0m');
      passed++;
    } else {
      console.log('\x1b[31m✗ FAILED\x1b[0m');
      failed++;
    }
  } catch (e) {
    console.log('\x1b[31m✗ FAILED:', e.message, '\x1b[0m');
    failed++;
  }

  // Summary
  console.log(`\n${'='.repeat(50)}`);
  console.log('\x1b[36mTEST SUMMARY\x1b[0m');
  console.log(`Passed: \x1b[32m${passed}\x1b[0m`);
  console.log(`Failed: \x1b[31m${failed}\x1b[0m`);
  console.log(`${'='.repeat(50)}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
