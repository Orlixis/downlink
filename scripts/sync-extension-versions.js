#!/usr/bin/env node

/**
 * Automatically synchronizes the Downlink application version
 * across all browser extension manifest files.
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const packageJsonPath = path.join(rootDir, 'package.json');

if (!fs.existsSync(packageJsonPath)) {
  console.error('package.json not found');
  process.exit(1);
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;

if (!version) {
  console.error('No version field found in package.json');
  process.exit(1);
}

const manifestPaths = [
  path.join(rootDir, 'extensions', 'chrome', 'manifest.json'),
  path.join(rootDir, 'extensions', 'firefox', 'manifest.json'),
  path.join(rootDir, 'extensions', 'safari', 'manifest.json'),
];

let updatedCount = 0;

manifestPaths.forEach((manifestPath) => {
  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      if (manifest.version !== version) {
        manifest.version = version;
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
        console.log(`[sync-versions] Updated ${path.relative(rootDir, manifestPath)} -> ${version}`);
        updatedCount++;
      }
    } catch (err) {
      console.error(`[sync-versions] Failed to update ${manifestPath}:`, err);
    }
  }
});

if (updatedCount === 0) {
  // Silent or verbose confirmation
  // console.log(`[sync-versions] All extension manifests are in sync (v${version})`);
}
