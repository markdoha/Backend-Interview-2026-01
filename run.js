#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.log('Creating .env file from .env.example...');
  fs.copyFileSync(path.join(__dirname, '.env.example'), envPath);
  console.log('Please edit .env to set your API key before running in production.');
}

const args = process.argv.slice(2);
const command = args[0] || 'start:dev';

switch (command) {
  case 'upload':
    const filePath = args[1];
    const apiKey = args[2] || 'dev-secret-key-change-in-production';
    
    if (!filePath) {
      console.error('Usage: node run.js upload <csv-file> [api-key]');
      process.exit(1);
    }
    
    const curl = spawn('curl', [
      '-X', 'POST',
      '-H', `x-api-key: ${apiKey}`,
      '-F', `file=@${filePath}`,
      'http://localhost:3000/bulk-upload/upload'
    ]);
    
    curl.stdout.on('data', (data) => console.log(data.toString()));
    curl.stderr.on('data', (data) => console.error(data.toString()));
    break;
    
  case 'stats':
    fetch('http://localhost:3000/bulk-upload/stats')
      .then(res => res.json())
      .then(data => console.log(JSON.stringify(data, null, 2)))
      .catch(err => console.error('Error:', err.message));
    break;
    
  case 'records':
    const key = args[1] || 'dev-secret-key-change-in-production';
    fetch('http://localhost:3000/bulk-upload/records', {
      headers: { 'x-api-key': key }
    })
      .then(res => res.json())
      .then(data => console.log(JSON.stringify(data, null, 2)))
      .catch(err => console.error('Error:', err.message));
    break;
    
  default:
    console.log(`Running: npm run ${command}`);
    spawn('npm', ['run', command], { stdio: 'inherit' });
}
