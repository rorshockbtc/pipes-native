// scripts/tauri-before-dev.js
// Checks if Next.js is already running on localhost:3000 to prevent port conflicts
const http = require('http');
const { spawn } = require('child_process');

const req = http.get('http://localhost:3000', () => {
  console.log('✓ Next.js dev server is already running on http://localhost:3000. Attaching Tauri...');
  process.exit(0);
});

req.on('error', () => {
  console.log('Starting Next.js dev server for Tauri...');
  const child = spawn('npx', ['next', 'dev', '-p', '3000'], { stdio: 'inherit', shell: true });
  child.on('exit', (code) => process.exit(code || 0));
});
