#!/usr/bin/env node

/**
 * Packages all browser extensions (Chrome, Firefox, Safari) into
 * store-ready .zip archives in dist/extensions/
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist', 'extensions');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// First sync versions
require('./sync-extension-versions');

const targets = [
  { name: 'firefox', file: 'downlink-firefox.zip' },
  { name: 'chrome', file: 'downlink-chrome.zip' },
  { name: 'safari', file: 'downlink-safari.zip' }
];

targets.forEach(({ name, file }) => {
  const extDir = path.join(rootDir, 'extensions', name);
  const zipPath = path.join(distDir, file);

  if (fs.existsSync(extDir)) {
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }
    console.log(`[package] Zipping ${name} extension -> dist/extensions/${file}...`);
    execSync(`cd "${extDir}" && zip -r "${zipPath}" . -x "*.DS_Store" "*__MACOSX*"`, { stdio: 'inherit' });
  }
});

console.log('[package] All browser extension archives created in dist/extensions/');
