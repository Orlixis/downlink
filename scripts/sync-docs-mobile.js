#!/usr/bin/env node

/**
 * Copies the Next.js exported mobile companion PWA from out/mobile.html to docs/mobile/index.html,
 * converts all asset paths to relative paths (for GitHub Pages subpaths),
 * patches Turbopack chunk loaders for dynamic origin/subpath resolution, and syncs _next static assets.
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

// 1. Copy out/mobile.html -> docs/mobile/index.html and rewrite all asset paths to relative
const outMobileHtml = path.join(outDir, 'mobile.html');
const docsMobileIndex = path.join(docsMobileDir, 'index.html');

if (fs.existsSync(outMobileHtml)) {
  let html = fs.readFileSync(outMobileHtml, 'utf8');

  // Replace all occurrences of /_next/ (including inside escaped JSON/RSC payloads like \"/_next/)
  html = html.replaceAll('/_next/', '../_next/');
  html = html.replaceAll('/mobile-manifest.json', './mobile-manifest.json');
  html = html.replaceAll('/downlink-square.png', './downlink-square.png');
  html = html.replaceAll('/downlink-transparent.png', './downlink-transparent.png');
  html = html.replaceAll('/downlink.png', './downlink.png');
  html = html.replaceAll('/downlink.svg', './downlink.svg');
  html = html.replaceAll('/favicon.ico', '../favicon.ico');

  fs.writeFileSync(docsMobileIndex, html, 'utf8');
  console.log('[sync-mobile] Copied & patched out/mobile.html -> docs/mobile/index.html (universal relative assets)');
}

// 2. Sync _next static chunks to docs/_next for GitHub Pages
const outNextDir = path.join(outDir, '_next');
const docsNextDir = path.join(docsDir, '_next');

if (fs.existsSync(outNextDir)) {
  fs.mkdirSync(docsNextDir, { recursive: true });
  fs.cpSync(outNextDir, docsNextDir, { recursive: true });
  console.log('[sync-mobile] Copied out/_next -> docs/_next');

  // Patch all JavaScript chunk loaders (Turbopack) in docs/_next to dynamically resolve their base path
  function patchJsFiles(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        patchJsFiles(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        let content = fs.readFileSync(fullPath, 'utf8');
        let modified = false;

        // Dynamic base path replacement for Turbopack runtime
        if (content.includes('let t="/_next/"')) {
          content = content.replaceAll(
            'let t="/_next/"',
            'let t=(typeof document!=="undefined"&&document.currentScript?.src?.replace(/static\\/chunks\\/.*$/,""))||"../_next/"'
          );
          modified = true;
        }

        if (content.includes('t="/_next/"')) {
          content = content.replaceAll(
            't="/_next/"',
            't=(typeof document!=="undefined"&&document.currentScript?.src?.replace(/static\\/chunks\\/.*$/,""))||"../_next/"'
          );
          modified = true;
        }

        if (modified) {
          fs.writeFileSync(fullPath, content, 'utf8');
          console.log(`[sync-mobile] Patched dynamic chunk loader: ${entry.name}`);
        }
      }
    }
  }

  patchJsFiles(docsNextDir);
}

// 3. Ensure docs/.nojekyll exists so GitHub Pages serves _next assets without Jekyll interference
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
  'downlink.svg'
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
console.log('[sync-mobile] Cleaned up temporary RSC .txt files in docs/mobile');
