#!/usr/bin/env node

/**
 * Builds and synchronizes the Next.js Mobile Companion PWA for GitHub Pages
 * with native basePath support (/downlink).
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'out');
const docsDir = path.join(rootDir, 'docs');
const docsMobileDir = path.join(docsDir, 'mobile');
const publicDir = path.join(rootDir, 'public');

console.log('[sync-mobile] Building Next.js Mobile Companion for GitHub Pages (/downlink)...');

try {
  // Build with BUILD_FOR_PAGES=true to generate native /downlink asset and chunk paths
  execSync('bun x next build', {
    cwd: rootDir,
    env: { ...process.env, BUILD_FOR_PAGES: 'true' },
    stdio: 'inherit',
  });

  // Ensure docs/mobile exists
  fs.mkdirSync(docsMobileDir, { recursive: true });

  // 1. Copy out/mobile.html -> docs/mobile/index.html
  const outMobileHtml = path.join(outDir, 'mobile.html');
  const docsMobileIndex = path.join(docsMobileDir, 'index.html');

  if (fs.existsSync(outMobileHtml)) {
    fs.copyFileSync(outMobileHtml, docsMobileIndex);
    console.log('[sync-mobile] Copied out/mobile.html -> docs/mobile/index.html');
  }

  // 2. Sync _next static assets to docs/_next
  const outNextDir = path.join(outDir, '_next');
  const docsNextDir = path.join(docsDir, '_next');

  if (fs.existsSync(outNextDir)) {
    fs.mkdirSync(docsNextDir, { recursive: true });
    fs.cpSync(outNextDir, docsNextDir, { recursive: true });
    console.log('[sync-mobile] Copied out/_next -> docs/_next');
  }

  // 3. Ensure docs/.nojekyll exists
  const nojekyllPath = path.join(docsDir, '.nojekyll');
  if (!fs.existsSync(nojekyllPath)) {
    fs.writeFileSync(nojekyllPath, '# Prevent GitHub Pages from using Jekyll\n', 'utf8');
    console.log('[sync-mobile] Created docs/.nojekyll');
  }

  // 4. Copy PWA manifest, service worker, and Downlink official PNG icons
  const filesToCopy = [
    'mobile-sw.js',
    'mobile-manifest.json',
    'downlink-square.png',
    'downlink.png',
    'downlink-transparent.png',
    'downlink.svg',
  ];
  filesToCopy.forEach((filename) => {
    const src = path.join(publicDir, filename);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(docsMobileDir, filename));
      fs.copyFileSync(src, path.join(docsDir, filename));
    }
  });

  // 5. Remove any Next.js Turbopack .txt flight metadata files in docs/mobile
  if (fs.existsSync(docsMobileDir)) {
    const entries = fs.readdirSync(docsMobileDir);
    entries.forEach((entry) => {
      if (entry.endsWith('.txt')) {
        fs.unlinkSync(path.join(docsMobileDir, entry));
      }
    });
  }

  // 6. Finally, rebuild out/ without basePath so Tauri desktop app build has root paths
  console.log('[sync-mobile] Rebuilding out/ for Tauri desktop application...');
  execSync('bun x next build', {
    cwd: rootDir,
    env: { ...process.env, BUILD_FOR_PAGES: 'false' },
    stdio: 'inherit',
  });

  console.log('[sync-mobile] Successfully synchronized Mobile Companion for GitHub Pages & Tauri desktop!');
} catch (err) {
  console.error('[sync-mobile] Error during sync:', err);
  process.exit(1);
}
