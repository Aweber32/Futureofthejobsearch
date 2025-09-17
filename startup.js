#!/usr/bin/env node

// Azure App Service startup script for Next.js standalone build
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting ELEV8R Frontend...');
console.log('Environment: ', process.env.NODE_ENV || 'development');
console.log('Port: ', process.env.PORT || 3000);

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