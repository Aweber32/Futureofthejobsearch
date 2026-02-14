#!/usr/bin/env node

// Azure App Service startup script for Next.js standalone build
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting Proslipsi Frontend...');
console.log('Environment: ', process.env.NODE_ENV || 'development');
console.log('Port: ', process.env.PORT || 3000);
console.log('📁 Current working directory:', process.cwd());
console.log('📋 Directory contents:', fs.readdirSync(process.cwd()));

// Check if .next directory exists and its contents
if (fs.existsSync('.next')) {
  console.log('✅ .next directory found');
  console.log('📋 .next contents:', fs.readdirSync('.next'));
  if (fs.existsSync('.next/BUILD_ID')) {
    console.log('✅ BUILD_ID file found');
  } else {
    console.log('❌ BUILD_ID file missing');
  }
} else {
  console.log('❌ .next directory missing');
}

// Set the port from Azure App Service
process.env.PORT = process.env.PORT || 3000;

// Start the Next.js server
const serverPath = path.join(__dirname, 'server.js');
const server = spawn('node', [serverPath], {
  stdio: 'inherit',
  env: process.env
});

server.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
  process.exit(code);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  server.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  server.kill('SIGINT');
});