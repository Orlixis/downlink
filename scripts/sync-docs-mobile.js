#!/usr/bin/env node

/**
 * Copies the Next.js exported mobile companion PWA from out/mobile.html to docs/mobile/index.html
 * and syncs _next static assets for deployment to GitHub Pages.
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'out');
const docsDir = path.join(rootDir, 'docs');
const docsMobileDir = path.join(docsDir, 'mobile');
const publicDir = path.join(rootDir, 'public');

// Ensure docs/mobile directory exists
fs.mkdirSync(docsMobileDir, { recursive: true });

// 1. Copy out/mobile.html -> docs/mobile/index.html
const outMobileHtml = path.join(outDir, 'mobile.html');
const docsMobileIndex = path.join(docsMobileDir, 'index.html');

if (fs.existsSync(outMobileHtml)) {
  fs.copyFileSync(outMobileHtml, docsMobileIndex);
  console.log('[sync-mobile] Copied out/mobile.html -> docs/mobile/index.html');
}

// 2. Sync _next static chunks to docs/_next for GitHub Pages
const outNextDir = path.join(outDir, '_next');
const docsNextDir = path.join(docsDir, '_next');

if (fs.existsSync(outNextDir)) {
  fs.mkdirSync(docsNextDir, { recursive: true });
  fs.cpSync(outNextDir, docsNextDir, { recursive: true });
  console.log('[sync-mobile] Copied out/_next -> docs/_next');
}

// 3. Copy PWA manifest and service worker
const filesToCopy = ['mobile-sw.js', 'mobile-manifest.json', 'downlink.svg', 'downlink-square.png'];
filesToCopy.forEach((filename) => {
  const src = path.join(publicDir, filename);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(docsMobileDir, filename));
    fs.copyFileSync(src, path.join(docsDir, filename));
  }
});

// 4. Remove any Next.js Turbopack .txt flight metadata files in docs/mobile
if (fs.existsSync(docsMobileDir)) {
  const entries = fs.readdirSync(docsMobileDir);
  entries.forEach((entry) => {
    if (entry.endsWith('.txt')) {
      fs.unlinkSync(path.join(docsMobileDir, entry));
    }
  });
}
console.log('[sync-mobile] Cleaned up temporary RSC .txt files in docs/mobile');
