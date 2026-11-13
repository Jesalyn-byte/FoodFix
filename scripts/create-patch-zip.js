#!/usr/bin/env node
/**
 * FoodFix — Tiny Incremental Patch ZIP Packager
 * Packages only updated code, pre-built dist/, Firebase/.env config, and scripts
 * (excluding heavy APK and node_modules) so an already-extracted defense setup
 * can be updated cleanly in seconds.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const stagingDir = path.join(rootDir, 'FoodFix_Defense_Patch');
const zipPath = path.join(rootDir, 'FOODFIX-Defense-Patch-Update.zip');

const includeFolders = [
  'dist',
  'web',
  'app',
  'components',
  'constants',
  'hooks',
  'lib',
  'plugins',
  'scripts',
  '__mocks__',
  '__tests__',
];

const includeFiles = [
  '.env',
  '.env.demo',
  '.env.example',
  '.firebaserc',
  'app.json',
  'firebase.json',
  'firestore.rules',
  'package.json',
  'README_DEFENSE_DEMO.md',
  'setup.bat',
  'setup.sh',
  'start-localhost.bat',
  'start-localhost.sh',
  'run-demo.bat',
  'run-demo.sh',
];

const PATCH_INSTRUCTIONS = `FOODFIX (LasangPinoy) - Quick Patch Update Guide
================================================

Use this tiny patch ZIP only if you ALREADY extracted and ran setup.bat
on an earlier FOODFIX-Defense-Localhost-Setup.zip.

Steps to Update:
1. Close any running FoodFix terminal / localhost server (press Ctrl+C).
2. Extract ALL contents of FOODFIX-Defense-Patch-Update.zip directly
   into your existing FoodFix setup folder (where start-localhost.bat lives).
3. When Windows asks about existing files, choose:
   "Replace the files in the destination"
4. Double-click start-localhost.bat (no need to re-run setup.bat).
5. Once http://localhost:3000 opens, press Ctrl+Shift+R once to refresh cache.
`;

function copyRecursive(src, dest) {
  const base = path.basename(src);
  if (base === 'node_modules' || base === '.git') return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const file of fs.readdirSync(src)) {
      copyRecursive(path.join(src, file), path.join(dest, file));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('Creating Tiny Patch Update ZIP for Existing Defense Setups');
  console.log('='.repeat(60));

  if (fs.existsSync(stagingDir)) {
    fs.rmSync(stagingDir, { recursive: true, force: true });
  }
  if (fs.existsSync(zipPath)) {
    console.log('[1/4] Removing previous patch zip...');
    fs.unlinkSync(zipPath);
  }

  fs.mkdirSync(stagingDir, { recursive: true });

  console.log('\n[2/4] Staging updated folders (excluding node_modules & APK)...');
  for (const folder of includeFolders) {
    const srcPath = path.join(rootDir, folder);
    if (fs.existsSync(srcPath)) {
      copyRecursive(srcPath, path.join(stagingDir, folder));
      console.log(`  [OK] Staged folder: ${folder}/`);
    }
  }

  console.log('\n[3/4] Staging updated configs, scripts & patch instructions...');
  for (const file of includeFiles) {
    const srcFile = path.join(rootDir, file);
    if (fs.existsSync(srcFile)) {
      fs.copyFileSync(srcFile, path.join(stagingDir, file));
      console.log(`  [OK] Staged file: ${file}`);
    }
  }
  fs.writeFileSync(path.join(stagingDir, 'UPDATE-README.txt'), PATCH_INSTRUCTIONS, 'utf8');
  console.log('  [OK] Added UPDATE-README.txt');

  console.log('\n[4/4] Compressing into FOODFIX-Defense-Patch-Update.zip...');
  const psCmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Compress-Archive -Path '${stagingDir}\\*' -DestinationPath '${zipPath}' -CompressionLevel Optimal"`;
  execSync(psCmd, { stdio: 'inherit' });

  fs.rmSync(stagingDir, { recursive: true, force: true });

  const stats = fs.statSync(zipPath);
  const sizeKb = (stats.size / 1024).toFixed(1);
  const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);

  console.log('\n' + '='.repeat(60));
  console.log(`SUCCESS! Tiny Patch ZIP Created: ${zipPath}`);
  console.log(`Size: ${sizeMb} MB (${sizeKb} KB / ${stats.size} bytes)`);
  console.log('='.repeat(60));
}

main().catch((err) => {
  console.error('\n[ERROR] Patch packaging failed:', err);
  process.exit(1);
});

