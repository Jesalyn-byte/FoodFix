#!/usr/bin/env node
/**
 * FoodFix — Thesis Defense One-Time Setup Packager
 * Bundles all essential project files, pre-built production web app (dist),
 * launcher scripts, .env configurations, and APK into a clean ZIP archive.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const stagingDir = path.join(rootDir, 'FoodFix_Defense_Setup');
const zipPath = path.join(rootDir, 'FOODFIX-Defense-Localhost-Setup.zip');

const includeFolders = [
  'app',
  'assets',
  'components',
  'constants',
  'dist',
  'hooks',
  'lib',
  'plugins',
  'public',
  'scripts',
  'web',
  '__mocks__',
  '__tests__',
];

const includeFiles = [
  '.env',
  '.env.demo',
  '.env.example',
  '.firebaserc',
  '.gitignore',
  'app.json',
  'babel.config.js',
  'firebase.json',
  'firestore.rules',
  'package.json',
  'package-lock.json',
  'README_DEFENSE_DEMO.md',
  'setup.bat',
  'setup.sh',
  'start-localhost.bat',
  'start-localhost.sh',
  'run-demo.bat',
  'run-demo.sh',
  'tsconfig.json',
  'FOODFIX-v4.1.9.apk',
  'logo.jpg',
  'logo.png',
  'CLIENT-DEMO.md',
  'DOCUMENTATION.md',
];

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
  console.log('Creating One-Time Setup ZIP for Defense Demonstration');
  console.log('='.repeat(60));

  // Clean old outputs
  if (fs.existsSync(stagingDir)) {
    console.log('[1/4] Cleaning previous staging directory...');
    fs.rmSync(stagingDir, { recursive: true, force: true });
  }
  if (fs.existsSync(zipPath)) {
    console.log('[1/4] Removing previous zip...');
    fs.unlinkSync(zipPath);
  }

  fs.mkdirSync(stagingDir, { recursive: true });

  // Copy folders
  console.log('\n[2/4] Staging project folders...');
  for (const folder of includeFolders) {
    const srcPath = path.join(rootDir, folder);
    if (fs.existsSync(srcPath)) {
      copyRecursive(srcPath, path.join(stagingDir, folder));
      console.log(`  [OK] Staged folder: ${folder}/`);
    }
  }

  // Copy files
  console.log('\n[3/4] Staging project files, scripts & APK...');
  for (const file of includeFiles) {
    const srcFile = path.join(rootDir, file);
    if (fs.existsSync(srcFile)) {
      fs.copyFileSync(srcFile, path.join(stagingDir, file));
      console.log(`  [OK] Staged file: ${file}`);
    }
  }

  // Compress using PowerShell Compress-Archive
  console.log('\n[4/4] Compressing into FOODFIX-Defense-Localhost-Setup.zip...');
  const psCmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Compress-Archive -Path '${stagingDir}\\*' -DestinationPath '${zipPath}' -CompressionLevel Optimal"`;
  execSync(psCmd, { stdio: 'inherit' });

  // Clean staging directory
  fs.rmSync(stagingDir, { recursive: true, force: true });

  const stats = fs.statSync(zipPath);
  const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);

  console.log('\n' + '='.repeat(60));
  console.log(`SUCCESS! ZIP Created: ${zipPath}`);
  console.log(`Size: ${sizeMb} MB`);
  console.log('='.repeat(60));
}

main().catch((err) => {
  console.error('\n[ERROR] Packaging failed:', err);
  process.exit(1);
});

